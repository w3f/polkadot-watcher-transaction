import { ApiPromise, WsProvider } from '@polkadot/api';
import { Logger } from '@w3f/logger';
import { Text } from '@polkadot/types/primitive';

import {
    InputConfig, TransactionData, TransactionType, Notifier, FreeBalance, SubscriberConfig,
} from './types';
import { Header } from '@polkadot/types/interfaces';
import Extrinsic from '@polkadot/types/extrinsic/Extrinsic';
import { asyncForEach, isTransferBalancesExtrinsic } from './utils';
import { ZeroBalance } from './constants';

interface InitializedMap {
  [name: string]: boolean;
}

export class Subscriber {
    private chain: Text;
    private api: ApiPromise;
    private networkId: string;
    private endpoint: string;
    private logLevel: string;

    private subscribe: SubscriberConfig;
    private subscriptions: Map<string,string>
    private initializedBalanceSubscriptions: InitializedMap = {};
    
    constructor(
        cfg: InputConfig,
        private readonly notifier: Notifier,
        private readonly logger: Logger) {
        this.endpoint = cfg.endpoint;
        this.logLevel = cfg.logLevel;

        this._initSubscribe(cfg)
        this._initSubscriptions(cfg)
        this._initBalanceSubscriptions(cfg)
    }

    private _initSubscribe = (cfg): void => {
      this.subscribe = cfg.subscribe
    }

    private _initSubscriptions = (cfg): void => {
      this.subscriptions = new Map<string,string>()
      for (const subscription of cfg.subscribe.transactions) {
        this.subscriptions.set(subscription.address,subscription.name)
      }
    }

    private _initBalanceSubscriptions = (cfg): void => {
      for (const subscription of cfg.subscribe.transactions) {
        this.initializedBalanceSubscriptions[subscription.name] = false;
      }
    }

    public start = async (): Promise<void> => {
        await this._initAPI();

        if(this.logLevel === 'debug') await this._triggerDebugActions()

        false && await this._handleNewHeadSubscriptions(); //DISABLED
        await this._handleAccountBalanceSubscription()

    }

    private _initAPI = async (): Promise<void> =>{
        const provider = new WsProvider(this.endpoint);
        this.api = await ApiPromise.create({ provider });
        
        this.chain = await this.api.rpc.system.chain();
        this.networkId = this.chain.toString().toLowerCase()
        const [nodeName, nodeVersion] = await Promise.all([
            this.api.rpc.system.name(),
            this.api.rpc.system.version()
        ]);
        this.logger.info(
            `You are connected to chain ${this.chain} using ${nodeName} v${nodeVersion}`
        );
    }

    private  _triggerDebugActions = async (): Promise<void> => {
      this.logger.debug('debug mode active')
    }

    private async _handleAccountBalanceSubscription(): Promise<void> {
        const freeBalance: FreeBalance = {};
        await asyncForEach(this.subscribe.transactions, async (account) => {
            const { data: { free: previousFree } } = await this.api.query.system.account(account.address);
            freeBalance[account.address] = previousFree;
            await this.api.query.system.account(account.address, async (acc) => {
                const nonce = acc.nonce;
                this.logger.info(`The nonce for ${account.name} is ${nonce}`);
                const currentFree = acc.data.free;

                if (this.initializedBalanceSubscriptions[account.name]) {
                    const data: TransactionData = {
                        name: account.name,
                        address: account.address,
                        networkId: this.networkId
                    };

                    const enabledNotifications = {
                        sent: account.enabledNotifications && account.enabledNotifications.sent != undefined ? account.enabledNotifications.sent : true,
                        received: account.enabledNotifications && account.enabledNotifications.received != undefined ? account.enabledNotifications.received : true
                    }
                    let isNotificationEnabled = true

                    // check if the action was performed by the account or externally
                    const change = currentFree.sub(freeBalance[account.address]);
                    if (!change.gt(ZeroBalance)) {
                        this.logger.info(`Action performed from account ${account.name}`);

                        data.txType = TransactionType.Sent;
                        isNotificationEnabled = enabledNotifications.sent
                    } else {
                        this.logger.info(`Transfer received in account ${account.name}`);

                        data.txType = TransactionType.Received;
                        isNotificationEnabled = enabledNotifications.received
                    }

                    freeBalance[account.address] = currentFree;

                    if(isNotificationEnabled){
                      await this._notifyNewBalanceChange(data)
                    }  
                } else {
                    this.initializedBalanceSubscriptions[account.name] = true;
                }
            });
        });
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
      this.logger.debug(`received new transfer balances`)

      const { signer, method: { args } } = extrinsic;
      const sender = signer.toString()
      const receiver = args[0].toString()
      const unit = args[1].toString()
      const transactionHash = extrinsic.hash.toHex()
      this.logger.debug(`\nsender: ${sender}\nreceiver: ${receiver}\nunit: ${unit}\nblockHash: ${blockHash}\ntransactionHash: ${transactionHash}`)

      if(this.subscriptions.has(sender)){
        const data: TransactionData = {
          name: this.subscriptions.get(sender),
          address: sender,
          networkId: this.networkId,
          txType: TransactionType.Sent,
          hash: transactionHash
        };

        this.logger.info(`notification to be sent:`)
        this.logger.info(JSON.stringify(data))
        this._notifyNewTransaction(data)
        isNewNotificationTriggered = true
      }

      if(this.subscriptions.has(receiver)){
        const data: TransactionData = {
          name: this.subscriptions.get(receiver),
          address: receiver,
          networkId: this.networkId,
          txType: TransactionType.Received,
          hash: transactionHash
        };
        
        this.logger.info(`notification to be sent:`)
        this.logger.info(JSON.stringify(data))
        await this._notifyNewTransaction(data)
        isNewNotificationTriggered = true
      }
      
      return isNewNotificationTriggered
    }

    private _notifyNewTransaction = async (data: TransactionData): Promise<void> => {
      try {
        await this.notifier.newTransaction(data);
      } catch (e) {
          this.logger.error(`could not notify transaction: ${e.message}`);
      }
    }

    private _notifyNewBalanceChange = async (data: TransactionData): Promise<void> => {
      try {
        this.logger.info(`notification to be sent:`)
        this.logger.info(JSON.stringify(data))
        await this.notifier.newBalanceChange(data);
      } catch (e) {
          this.logger.error(`could not notify balance change: ${e.message}`);
      }
    }
 
}
