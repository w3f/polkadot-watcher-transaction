import { ApiPromise } from '@polkadot/api';
import { Logger } from '@w3f/logger';
import {
    TransactionData, TransactionType, FreeBalance, SubscriberConfig
} from '../types';
import { asyncForEach, getSubscriptionNotificationConfig } from '../utils';
import { ZeroBalance } from '../constants';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';
import { Notifier } from '../notifier/INotifier';

export class RewardBased implements ISubscriptionModule{

    private readonly api: ApiPromise
    private readonly networkId: string
    private readonly notifier: Notifier
    private readonly config: SubscriberConfig
    private readonly logger: Logger
    private checkedEras: Array<[]>
    
    constructor(params: SubscriptionModuleConstructorParams) {
      this.api = params.api
      this.networkId = params.networkId
      this.notifier = params.notifier
      this.config = params.config
      this.logger = params.logger
    }

    public subscribe = async (): Promise<void> => {
        await this._handleAccountBalanceSubscription()
        this.logger.info(`Reward Based Module subscribed...`)
    }

    private async _handleAccountBalanceSubscription(): Promise<void> {
      // Get current Era
      let tryCurrentEra = await this.api.query.staking.activeEra();
      let currentEra;
      if (tryCurrentEra.isSome) {
        currentEra = tryCurrentEra.unwrap().index.toBigInt();
      } else {
        throw Error("");
      }

      // Get total reward for the specified Era.
      let tryTotalReward = await this.api.query.staking.erasValidatorReward(2250);
      let totalReward;
      if (tryTotalReward.isSome) {
        totalReward = tryTotalReward.unwrap().toBigInt();
      } else {
        throw Error("");
      }

      // Get the reward points.
      const { total: totalPoints, individual: individualPoints } = await this.api.query.staking.erasRewardPoints(2250);
      const rewardPerPont = totalReward / totalPoints.toBigInt();

      this.config.subscriptions.forEach((target) => {
        let account_id = this.api.createType('AccountId', target.address);
        let validator_points= individualPoints.get(account_id);
        if (validator_points != undefined) {
          const validator_reward = validator_points.toBigInt() * rewardPerPont;
        } else {
          // No reward for validator!
          // TODO
        }
      });
    }
}
