import { ApiPromise} from '@polkadot/api';
import { Logger } from '@w3f/logger';
import {
    TransactionData, TransactionType, SubscriberConfig, Subscribable
} from '../types';
import { Extrinsic, Header, Balance, Address, SignedBlock } from '@polkadot/types/interfaces';
import { formatBalance } from '@polkadot/util/format/formatBalance'
import { getSubscriptionNotificationConfig, isBatchExtrinsic, isTransferBalance, isTransferBalancesExtrinsic } from '../utils';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';
import { Notifier } from '../notifier/INotifier';


export class BlockBased implements ISubscriptionModule {

    private subscriptions = new Map<string,Subscribable>()
    private readonly api: ApiPromise
    private readonly networkId: string
    private readonly notifier: Notifier
    private readonly config: SubscriberConfig
    private readonly logger: Logger

    constructor(params: SubscriptionModuleConstructorParams) {
        this.api = params.api
        this.networkId = params.networkId
        this.notifier = params.notifier
        this.config = params.config
        this.logger = params.logger
        
        this._initSubscriptions()
    }

    private _initSubscriptions = (): void => {
      for (const subscription of this.config.subscriptions) {
        this.subscriptions.set(subscription.address,subscription)
      }
    }  

    public subscribe = async (): Promise<void> => {
      await this._handleNewHeadSubscriptions();
      this.logger.info(`Block Based Module subscribed...`)
    }

    private _handleNewHeadSubscriptions = async (): Promise<void> =>{

      this.api.rpc.chain.subscribeFinalizedHeads(async (header) => {
       
        await this._blocksHandler(header)

      })
    }

    private _blocksHandler = async (header: Header): Promise<void> =>{

      const hash = header.hash.toHex()
      const block = await this.api.rpc.chain.getBlock(hash)
      //this.logger.debug(`block:`)
      //this.logger.debug(JSON.stringify(block))

      block.block.extrinsics.forEach( async (extrinsic) => {
        this._transferBalancesExtrinsicHandler(extrinsic, block, hash)
        this._batchedTransferBalancesExtrinsicHandler(extrinsic, hash)
      })

    }

    private _transferBalancesExtrinsicHandler = async (extrinsic: Extrinsic, block: SignedBlock, blockHash: string): Promise<boolean> =>{
      const isNewNotificationTriggered = false
      if(!isTransferBalancesExtrinsic(extrinsic)) return isNewNotificationTriggered
      this.logger.debug(`detected new balances > transfer extrinsic`)

      this.logger.debug(`Extrinsic: ${JSON.stringify(extrinsic.toHuman())}`)
      this.logger.debug(`Block: ${JSON.stringify(block.toHuman())}`)

      return this._transferBalancesInnerCallHandler(extrinsic.method,extrinsic.signer,blockHash,extrinsic.hash.toHex())
    }

    private _batchedTransferBalancesExtrinsicHandler = async (extrinsic: Extrinsic, blockHash: string): Promise<boolean> =>{
      let isNewNotificationTriggered = false
      if(!isBatchExtrinsic(extrinsic)) return isNewNotificationTriggered
      this.logger.debug(`detected new utility > batch extrinsic`)

      const { signer, hash, method: { args } } = extrinsic;

      for (const innerCall of args[0] as any) {
        if(!isTransferBalance(innerCall.toJSON())) {
          this.logger.debug(`detected new utility > batch > balances > transfer extrinsic`)
          isNewNotificationTriggered = await this._transferBalancesInnerCallHandler(innerCall,signer,blockHash,hash.toHex())
        } 
      }

      return isNewNotificationTriggered
    }

    private _transferBalancesInnerCallHandler = async (innerCall: any, signer: Address,  blockHash: string, transactionHash: string): Promise<boolean> =>{
      let isNewNotificationTriggered = false

      const { args, method } = innerCall

      const sender = signer.toString()
      const receiver = args[0].toString()
      const amount = this._formatArgAmount(method,args[1])

      this.logger.debug(`\nsender: ${sender}\nreceiver: ${receiver}\nunit: ${amount}\nblockHash: ${blockHash}\ntransactionHash: ${transactionHash}`)

      if(this.subscriptions.has(sender)){
        const data: TransactionData = {
          name: this.subscriptions.get(sender).name,
          address: sender,
          networkId: this.networkId,
          txType: TransactionType.Sent,
          hash: transactionHash,
          amount: amount
        };

        const notificationConfig = getSubscriptionNotificationConfig(this.config.modules?.transferExtrinsic,this.subscriptions.get(sender).transferExtrinsic)

        if(notificationConfig.sent){
          this.logger.info(`Transfer Balance extrinsic block from ${sender} detected`)
          await this._notifyNewTransaction(data)
          isNewNotificationTriggered = true
        }
        else{
          this.logger.debug(`Transfer Balance extrinsic block from ${sender} detected`)
        }
        
      }

      if(this.subscriptions.has(receiver)){
        const data: TransactionData = {
          name: this.subscriptions.get(receiver).name,
          address: receiver,
          networkId: this.networkId,
          txType: TransactionType.Received,
          hash: transactionHash,
          amount: amount
        };

        const notificationConfig = getSubscriptionNotificationConfig(this.config.modules?.transferExtrinsic,this.subscriptions.get(receiver).transferExtrinsic)
        
        if(notificationConfig.sent){
          this.logger.info(`Transfer Balance Extrinsic block to ${receiver} detected`)
          await this._notifyNewTransaction(data)
          isNewNotificationTriggered = true
        }
        else{
          this.logger.debug(`Transfer Balance Extrinsic block to ${receiver} detected`)
        }
        
      }
      
      return isNewNotificationTriggered
    }

    private _notifyNewTransaction = async (data: TransactionData): Promise<void> => {
      this.logger.debug(`Delegating to the Notifier the New Transfer Balance Extrinsic notification...`)
      this.logger.debug(JSON.stringify(data))
      await this.notifier.newTransaction(data) 
    }

    private _formatArgAmount = ( transferType: string, arg: any): string => {
      if(transferType == "transferAll"){
        return "FULL AMOUNT"
      }
      const amount = arg as unknown as Balance
      return formatBalance(amount,{forceUnit: '-'},this.api.registry.chainDecimals[0])
    }
 
}
