import { ApiPromise, WsProvider } from '@polkadot/api';
import { Logger } from '@w3f/logger';
import { Text } from '@polkadot/types/primitive';

import {
    InputConfig, SubscriberConfig, FreeBalance, TransactionData, InitializedMap, TransactionType, Notifier,
} from './types';
import { asyncForEach } from './utils';
import { ZeroBalance } from './constants';

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

        this._initializedTransactions = {};
        for (const subscription of this.subscribe.transactions) {
            this._initializedTransactions[subscription.name] = false;
        }
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

    private  _triggerDebugActions = async (): Promise<void> => {
      this.logger.debug('debug mode active')
    }

    private _subscribeTransactions = async (): Promise<void> =>{
      const freeBalance: FreeBalance = {};
      await asyncForEach(this.subscribe.transactions, async (account) => {
          const { data: { free: previousFree } } = await this.api.query.system.account(account.address);
          freeBalance[account.address] = previousFree;
          await this.api.query.system.account(account.address, async (acc) => {
              const nonce = acc.nonce;
              this.logger.info(`The nonce for ${account.name} is ${nonce}`);
              const currentFree = acc.data.free;

              if (this._initializedTransactions[account.name]) {
                  const data: TransactionData = {
                      name: account.name,
                      address: account.address,
                      networkId: this.networkId
                  };

                  // check if the action was performed by the account or externally
                  const change = currentFree.sub(freeBalance[account.address]);
                  if (!change.gt(ZeroBalance)) {
                      this.logger.info(`Action performed from account ${account.name}`);

                      data.txType = TransactionType.Sent;
                  } else {
                      this.logger.info(`Transfer received in account ${account.name}`);

                      data.txType = TransactionType.Received;
                  }

                  freeBalance[account.address] = currentFree;

                  try {
                      await this.notifier.newTransaction(data);
                  } catch (e) {
                      this.logger.error(`could not notify transaction: ${e.message}`);
                  }
              } else {
                  this._initializedTransactions[account.name] = true;
              }
          });
      });
  }
    
}
