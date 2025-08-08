import { Logger, LoggerSingleton } from './logger';
import { hexToU8a, formatBalance } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import {
    Event, TransferInfo, XcmSentEvent, StagingXcmV4Xcm, StagingXcmV4Location, StagingXcmV4Asset,
    ChainInfo, BalancesTransferEvent, Balance } from './types';
import { parachainNames } from './constants';
import { registry } from './subscriber';


const log: Logger = LoggerSingleton.getInstance()


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
            origin: rawOrigin as unknown as StagingXcmV4Location,
            destination: rawDestination as unknown as StagingXcmV4Location,
            message: rawMessage as unknown as StagingXcmV4Xcm
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
    const { origin, message } = event
    let { destination } = event

    // TODO: Validate if the message includes a supported command.
    // Categorize commands as:
    //   - Supported.
    //   - Unsupported (custom XCM): commands that include one or more instructions not yet supported and may require custom handling.
    //   - Non-asset-transfer: commands that do not involve asset transfers and should be skipped during processing.
    // Example: Some commands, such as those including only a `Transact` instruction, do not involve asset transfers.
    // Reference: https://polkadot.subscan.io/block/23164873?tab=event&event=23164873-57

    // 1. Get origin from the MultiLocation (X1.AccountId32)
    const originAddress = getLocation(origin, chainInfo, blockNumber)

    if (!originAddress || originAddress === 'Unknown') {
        log.info(`XCM. Cannot determine origin at block ${blockNumber}`)
        return {
            origin: {
                address: 'Unknown',
                chain: chainInfo.id
            },
            destination: {
                address: 'Unknown',
                chain: 'Unknown'
            },
            amount: 'Unknown',
            token: 'Unknown'
        }
    }

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
        }
    }
    const destinationAddress = getLocation(beneficiaryInstruction?.beneficiary, chainInfo, blockNumber)
    // 3. Get assets information
    const assetInstruction = findInstruction(message, 'ReserveAssetDeposited') || 
                             findInstruction(message, 'ReceiveTeleportedAsset') || [];
    
    const destChain = getLocation(destination, chainInfo, blockNumber)
    const transfers = getTokenAmountFromAsset(
        assetInstruction,
        chainInfo,
        blockNumber
    )

    // TODO: AssetHub monitoring. The list of assets should be returned instead.
    const [token, amount] = transfers[0]
    return {
        origin: {
            address: originAddress,
            chain: chainInfo.id
        },
        destination: {
            address: destinationAddress,
            chain: destChain
        },
        amount: amount,
        token: token
    }
}

function getLocation(location: StagingXcmV4Location, chainInfo: ChainInfo, blockNumber: number): string {
    if (!location || !location.interior) {
        log.info(`XCM. Instruction not supported or doesn't include asset transfer. Block ${blockNumber}`)
        return 'Unknown'
    } else if (!(location.interior.isX1)) {
        log.info(`XCM. Junctions not supported: ${location?.interior.type}. Block ${blockNumber}`)
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
        log.info(`XCM. Junctions not supported: ${x1.type}. Block ${blockNumber}`)
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
            // TODO: AssetHub monitoring. The token address should be processed.
            continue
        } else {
            log.info(`Asset Junctions not supported: ${interior.type}. Block ${blockNumber}`)
            continue
        }
        result.push([token, amount])
    }
    return result.length > 0 ? result : [['Unknown', 'Unknown']]
}

export const isBalancesTransferEvent = (event: Event): boolean => {
    return event.section === 'balances' && event.method === 'Transfer'
}

export function isXcmSentEvent(event: Event): boolean {
    return ['polkadotXcm', 'xcmPallet'].includes(event.section) && event.method === 'Sent'
}

const extractTransferInfoFromBalancesEvent = (event: BalancesTransferEvent, chainInfo: ChainInfo, _blockNumber: number): TransferInfo =>{
    return {
        origin: {
            address: event.origin,
            chain: chainInfo.id
        },
        destination: {
            address: event.destination,
            chain: chainInfo.id
        },
        amount: formatBalance(event.amount, {decimals: chainInfo.decimals[0], withSi: false, forceUnit: '-' }),
        token: chainInfo.tokens[0]
    }
}
