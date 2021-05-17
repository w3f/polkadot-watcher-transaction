import { ApiPromise } from '@polkadot/api';
import { Logger } from '@w3f/logger';
import {
    TransactionData, TransactionType, FreeBalance, SubscriberConfig
} from '../types';
import { asyncForEach, getSubscriptionNotificationConfig } from '../utils';
import { ZeroBalance } from '../constants';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';
import { Notifier } from '../notifier/INotifier';

interface InitializedMap {
  [name: string]: boolean;
}

export class RewardBased implements ISubscriptionModule{

    private initializedBalanceSubscriptions: InitializedMap = {};
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
      
      this._initBalanceChangeSubscriptions()
    }

    private _initBalanceChangeSubscriptions = (): void => {
      for (const subscription of this.config.subscriptions) {
        this.initializedBalanceSubscriptions[subscription.name] = false;
      }
    }

    public subscribe = async (): Promise<void> => {
        await this._handleAccountBalanceSubscription()
        this.logger.info(`Balance Change Based Module subscribed...`)
    }

    private async _handleAccountBalanceSubscription(): Promise<void> {
        const freeBalance: FreeBalance = {};
        await asyncForEach(this.config.subscriptions, async (subscription) => {
            const data = await this.api.query.staking.erasValidatorReward(0);
            // TODO
        });
    }

    private _notifyNewBalanceChange = async (data: TransactionData): Promise<void> => {
      this.logger.debug(`Delegating to the Notifier the New Balance Change notification...`)
      this.logger.debug(JSON.stringify(data))
      await this.notifier.newBalanceChange(data)
    }

 
}
