import { ApiPromise, WsProvider } from '@polkadot/api';
import { Logger } from '@w3f/logger';
import { Text } from '@polkadot/types/primitive';

import {
    InputConfig, SubscriberConfig, FreeBalance, TransactionData, InitializedMap, TransactionType, Notifier, Subscribable,
} from './types';
import { asyncForEach } from './utils';
import { ZeroBalance } from './constants';
import { Balance, AccountInfo } from '@polkadot/types/interfaces';

export class Subscriber {
    private chain: Text;
    private api: ApiPromise;
    private networkId: string;
    private endpoint: string;
    private logLevel: string;

    private subscribe: SubscriberConfig;
    private _initializedTransactions: InitializedMap;
    
    constructor(
        cfg: InputConfig,
        private readonly notifier: Notifier,
        private readonly logger: Logger) {
        this.endpoint = cfg.endpoint;
        this.logLevel = cfg.logLevel;
        this.subscribe = cfg.subscribe

        this._initTransactions()
    }

    public start = async (): Promise<void> => {
        await this._initAPI();

        if(this.logLevel === 'debug') await this._triggerDebugActions()

        await this._subscribeTransactions();
    }

    get isInitialized(): InitializedMap {
      return this._initializedTransactions;
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

    private _initTransactions = (): void => {
      this._initializedTransactions = {};
      for (const subscription of this.subscribe.transactions) {
          this._initializedTransactions[subscription.name] = false;
      }
    }

    private  _triggerDebugActions = async (): Promise<void> => {
      this.logger.debug('debug mode active')
    }

    private _subscribeTransactions = async (): Promise<void> =>{
      const freeBalance: FreeBalance = {};
      await asyncForEach(this.subscribe.transactions, async (account) => {
          const { data: { free: previousFree } } = await this.api.query.system.account(account.address);
          freeBalance[account.address] = previousFree;
          
          await this.api.query.system.account(account.address, async (accountInfo) => { this._transactionHandler(accountInfo,account,freeBalance) });
      });
  }

  private _transactionHandler = async (accountInfo: AccountInfo, account: Subscribable, freeBalance: FreeBalance): Promise<void> => {
    this.logger.info(`The nonce for ${account.name} is ${accountInfo.nonce}`);

    if (this._initializedTransactions[account.name]) {
        const data: TransactionData = {
            name: account.name,
            address: account.address,
            networkId: this.networkId
            //add hash
        };

        const currentFreeBalance = accountInfo.data.free;

        this._setTransactionType(data,currentFreeBalance,freeBalance[account.address],account)

        freeBalance[account.address] = currentFreeBalance;

        try {
            await this.notifier.newTransaction(data);
        } catch (e) {
            this.logger.error(`could not notify transaction: ${e.message}`);
        }
    } else {
        this._initializedTransactions[account.name] = true;
    }
  }

  private _setTransactionType = (data: TransactionData, currentFreeBalance: Balance, previousFreeBalance: Balance, account: Subscribable): void => {
    
    // check if the action was performed by the account or externally
    const change = currentFreeBalance.sub(previousFreeBalance);
    if (!change.gt(ZeroBalance)) {
        this.logger.info(`Action performed from account ${account.name}`);

        data.txType = TransactionType.Sent;
    } else {
        this.logger.info(`Transfer received in account ${account.name}`);

        data.txType = TransactionType.Received;
    }
  }
    
}
