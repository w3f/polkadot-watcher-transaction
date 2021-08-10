import { ApiPromise} from '@polkadot/api';
import { Logger } from '@w3f/logger';
import {
    TransactionData, TransactionType, SubscriberConfig, Subscribable
} from '../types';
import { Event } from '@polkadot/types/interfaces';
import { extractTransferInfoFromEvent, getSubscriptionNotificationConfig, isBalanceTransferEvent } from '../utils';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';
import { Cache } from '../cache';
import { Notifier } from '../notifier/INotifier';

export class EventBased implements ISubscriptionModule{

    private subscriptions = new Map<string,Subscribable>()
    private readonly api: ApiPromise
    private readonly networkId: string
    private readonly notifier: Notifier
    private readonly config: SubscriberConfig
    private readonly logger: Logger
    
    constructor(params: SubscriptionModuleConstructorParams, private readonly cache: Cache) {
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
      await this._handleEventsSubscriptions()
      this.logger.info(`Event Based Module subscribed...`)
    }

    private _handleEventsSubscriptions = async (): Promise<void> => {
      this.api.query.system.events((events) => {

        events.forEach(async (record) => {
          const { event } = record;

          await this._handleBalanceTransferEvents(event)

        })
      })
    }

    private _handleBalanceTransferEvents = async (event: Event): Promise<void> => {
      if (isBalanceTransferEvent(event)) {
        this._balanceTransferHandler(event)
      }
    }

    private _balanceTransferHandler = async (event: Event): Promise<boolean> => {
      //this.logger.debug('Balances Transfer Event Received')
      const transferInfo = extractTransferInfoFromEvent(event)
      //this.logger.debug(`${JSON.stringify(transferInfo)}`)
      const {from,to,amount} = transferInfo

      let isNewNotificationTriggered = false

      if(this.cache.isTransferEventPresent(transferInfo)){
        this.logger.debug(`A duplicated event is being skipped...`)
        return false
      }
      if(this.subscriptions.has(from) || this.subscriptions.has(to)){
        this.cache.addTransferEvent(transferInfo)
      }

      if(this.subscriptions.has(from)){
        const data: TransactionData = {
          name: this.subscriptions.get(from).name,
          address: from,
          networkId: this.networkId,
          txType: TransactionType.Sent,
          amount: amount
        };

        const notificationConfig = getSubscriptionNotificationConfig(this.config.modules?.transferEvent,this.subscriptions.get(from).transferEvent)

        if(notificationConfig.sent){
          this.logger.info(`Balances Transfer Event from ${from} detected`)
          await this._notifyNewTransfer(data)
          isNewNotificationTriggered = true
        }
        else{
          this.logger.debug(`Balances Transfer Event from ${from} detected. Notification SUPPRESSED`)
        }
      }

      if(this.subscriptions.has(to)){
        const data: TransactionData = {
          name: this.subscriptions.get(to).name,
          address: to,
          networkId: this.networkId,
          txType: TransactionType.Received,
          amount: amount
        };

        const notificationConfig = getSubscriptionNotificationConfig(this.config.modules?.transferEvent,this.subscriptions.get(to).transferEvent)
        
        if(notificationConfig.received){
          this.logger.info(`Balances Transfer Event to ${to} detected`)
          await this._notifyNewTransfer(data)
          isNewNotificationTriggered = true
        }
        else{
          this.logger.debug(`Balances Transfer Event to ${to} detected. Notification SUPPRESSED`)
        }
        
      }
      
      return isNewNotificationTriggered
    }
    
    private _notifyNewTransfer = async (data: TransactionData): Promise<void> => {
      this.logger.debug(`Delegating to the Notifier the New Transfer Event notification...`)
      this.logger.debug(JSON.stringify(data))
      await this.notifier.newTransfer(data)
    }

}
