import { ApiPromise} from '@polkadot/api';
import { Logger } from '@w3f/logger';
import {
    TransactionData, TransactionType, Notifier, SubscriberConfig, Subscribable
} from '../types';
import { Extrinsic, Header } from '@polkadot/types/interfaces';
import { getSubscriptionNotificationConfig, isTransferBalancesExtrinsic } from '../utils';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';


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
      this.logger.debug(`block:`)
      this.logger.debug(JSON.stringify(block))

      block.block.extrinsics.forEach( async (extrinsic) => {

        this._transferBalancesExtrinsicHandler(extrinsic, hash)
  
      })

    }

    private _transferBalancesExtrinsicHandler = async (extrinsic: Extrinsic, blockHash: string): Promise<boolean> =>{
      let isNewNotificationTriggered = false
      if(!isTransferBalancesExtrinsic(extrinsic)) return isNewNotificationTriggered
      this.logger.debug(`detected new balances > transfer extrinsic`)

      const { signer, method: { args } } = extrinsic;
      const sender = signer.toString()
      const receiver = args[0].toString()
      const unit = args[1].toString()
      const transactionHash = extrinsic.hash.toHex()
      this.logger.debug(`\nsender: ${sender}\nreceiver: ${receiver}\nunit: ${unit}\nblockHash: ${blockHash}\ntransactionHash: ${transactionHash}`)

      if(this.subscriptions.has(sender)){
        const data: TransactionData = {
          name: this.subscriptions.get(sender).name,
          address: sender,
          networkId: this.networkId,
          txType: TransactionType.Sent,
          hash: transactionHash
        };

        const notificationConfig = getSubscriptionNotificationConfig(this.config.modules?.transferExtrinsic,this.subscriptions.get(sender).transferExtrinsic)

        if(notificationConfig.sent){
          this.logger.info(`Transfer Balance extrinsic block from ${sender} detected`)
          this._notifyNewTransaction(data)
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
          hash: transactionHash
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
      try {
        this.logger.info(`Sending New Transfer Balance Extrinsic notification...`)
        this.logger.debug(JSON.stringify(data))
        await this.notifier.newTransaction(data);
      } catch (e) {
          this.logger.error(`could not notify Extrinsic Block detection: ${e.message}`);
      }
    }
 
}
