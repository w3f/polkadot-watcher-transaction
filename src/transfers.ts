import '@polkadot/api-augment/polkadot'
import { Logger, LoggerSingleton } from './logger';
import { hexToU8a, formatBalance } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import {
    Event, TransferInfo, XcmSentEvent, StagingXcmV4Xcm, StagingXcmV4Location, StagingXcmV4Asset,
    ChainInfo, BalancesTransferEvent, Balance, TypeRegistry } from './types';
import { parachainNames } from './constants';


const log: Logger = LoggerSingleton.getInstance()
export const registry = new TypeRegistry()


export const isTransferEvent = (event: Event): boolean => {
    return isBalancesTransferEvent(event) || isXcmSentEvent(event);
}

/**
 * Extracts transfer information from the given event.
 *
 * Depending on the type of the event, it extracts transfer information
 * from either a pallet Balances Transfer event or a pallet's XCM Sent event.
 *
 * @param {Event} event - The event to extract transfer information from.
 * @param {ChainInfo} chainInfo - Information about the blockchain network.
 * @param {number} blockNumber - The block number at which the event occurred.
 * @returns {TransferInfo} The extracted transfer information.
 * @throws {Error} If the event type is not a valid transfer event type.
 */
export const extractTransferInfoFromEvent = (event: Event, chainInfo: ChainInfo, blockNumber: number): TransferInfo => {
    if (isBalancesTransferEvent(event)) {
        const balancesTransfer: BalancesTransferEvent = {
            origin: event.data[0].toString(),
            destination: event.data[1].toString(),
            amount: event.data[2] as unknown as Balance
        }
        return extractTransferInfoFromBalancesEvent(balancesTransfer, chainInfo, blockNumber);

    } else if (isXcmSentEvent(event)) {
        const [rawOrigin, rawDestination, rawMessage] = event.data
        const xcmSent: XcmSentEvent = {
            origin: registry.createType('StagingXcmV4Location',rawOrigin.toU8a()),
            destination: registry.createType('StagingXcmV4Location',rawDestination.toU8a()),
            message: registry.createType('StagingXcmV4Xcm',rawMessage.toU8a())
        }
        return extractTransferInfoFromXcmEvent(xcmSent, chainInfo, blockNumber);

    } else {
        throw new Error(`Invalid Transfer Event type. Index: ${event.index}. Block: ${blockNumber}`);
    }
}

/**
 * Extracts transfer information from an XCM Sent event.
 * 
 * This function processes an XCM event to extract details about a transfer, including the origin and 
 * destination of the transfer, and the amount transferred. It uses specific instructions within the 
 * XCM message to determine the beneficiary and asset information.
 * 
 * @param {XcmSentEvent} event - The XCM event containing the transfer details.
 * @param {ChainInfo} chainInfo - Information about the blockchain network.
 * @param {number} blockNumber - The block number at which the event occurred.
 * @returns {TransferInfo} An object containing the 'from', 'to', and 'amount' of the transfer.
 */
function extractTransferInfoFromXcmEvent(event: XcmSentEvent, chainInfo: ChainInfo,  blockNumber: number): TransferInfo {
    const result = {from: undefined, to: undefined, amount: undefined}
    const { origin, message } = event
    let { destination } = event
    // 1. Get origin from the MultiLocation (X1.AccountId32)
    result.from = getLocation(origin, chainInfo, blockNumber)
    // 2. Get beneficiary
    // 2.1. Try from "DepositAsset" instruction, which is common for most of extrinsics
    let beneficiaryInstruction = findInstruction(message, 'DepositAsset');
    if (!beneficiaryInstruction) {
        // 2.2. Try from "DepositReserveAsset" instruction used by "transfer_assets_using_type_and_then"
        // Check custom XCM on destination
        const depositRA = findInstruction(message, 'DepositReserveAsset');
        if (depositRA?.xcm) {
            beneficiaryInstruction = findInstruction(depositRA.xcm, 'DepositAsset');
            // Real destination is in the nested XCM message
            destination = depositRA.dest;
        } else {
            return result
        }
    }
    if (!beneficiaryInstruction) {
        console.error(`XCM. No beneficiary instructions found. Block: ${blockNumber}`);
        return result
    }
    result.to = getLocation(beneficiaryInstruction.beneficiary, chainInfo, blockNumber)
    // 3. Get assets information
    const assetInstruction = findInstruction(message, 'ReserveAssetDeposited') || 
                             findInstruction(message, 'ReceiveTeleportedAsset');
    
    if (!assetInstruction) {
        console.error(`XCM. No assets instructions found. Block: ${blockNumber}`);
        return result
    }
    // Destination chain and tokens info are not yet used.
    // Ex.: const destChain = getLocation(destination, chainInfo, blockNumber)
    const transfers = getTokenAmountFromAsset(
        assetInstruction,
        chainInfo,
        blockNumber
    )
    if (transfers.length > 0) {
        const [_token, amount] = transfers[0]
        result.amount = amount
    } else {
        console.error(`XCM. No assets found inside of instruction. Block: ${blockNumber}`);
    }
    return result
}

function getLocation(location: StagingXcmV4Location, chainInfo: ChainInfo, blockNumber: number): string {
    if (!(location.interior.isX1)) {
        log.error(`XCM. Junctions not supported: ${location.interior.type}. Block ${blockNumber}`)
        return 'Unknown'
    }
    const x1 = location.interior.asX1[0]
    if (x1.isAccountId32) {
        const originIdHex = x1.asAccountId32.id.toString();
        return encodeAddress(hexToU8a(originIdHex), chainInfo.SS58);
    } else if (x1.isAccountKey20) {
        return x1.asAccountKey20.key.toHuman()
    } else if (x1.isParachain) {
        const chainIndex =  x1.asParachain.toString()
        return parachainNames[chainInfo.id][chainIndex] || `Parachain ${chainIndex}`;
    } else {
        log.error(`XCM. Junctions not supported: ${x1.type}. Block ${blockNumber}`)
    }
    return 'Unknown'
}

const findInstruction = (xcm: StagingXcmV4Xcm, key: string) => xcm.find(instr => instr.type === key)?.['as' + key];

function getTokenAmountFromAsset(assets: StagingXcmV4Asset[], chainInfo: ChainInfo, blockNumber: number): [string, string][] {
    const result: [string, string][] = [];
    for (const asset of assets) {
        if (!(asset.fun.isFungible)) {
            // NFTs are not a subject for monitoring
            continue
        }
        const amount = formatBalance(asset.fun.asFungible, {decimals: chainInfo.decimals[0], withSi: false, forceUnit: '-' })
        const interior = asset.id.interior
        let token: string;
        if (interior.isHere) {
            token = chainInfo.tokens[0]
        } else if (interior.isX3) {
            // Not supported yet. Should be processed for the parachain monitoring
            continue
        } else {
            log.error(`Asset Junctions not supported: ${interior.type}. Block ${blockNumber}`)
            continue
        }
        result.push([token, amount])
    }
    return result
}

export const isBalancesTransferEvent = (event: Event): boolean => {
    return event.section === 'balances' && event.method === 'Transfer'
}

export function isXcmSentEvent(event: Event): boolean {
    return ['polkadotXcm', 'xcmPallet'].includes(event.section) && event.method === 'Sent'
}

const extractTransferInfoFromBalancesEvent = (event: BalancesTransferEvent, chainInfo: ChainInfo, _blockNumber: number): TransferInfo =>{
    return {
        from: event.origin,
        to: event.destination,
        amount: formatBalance(event.amount, {decimals: chainInfo.decimals[0], withSi: false, forceUnit: '-' })
    }
}
