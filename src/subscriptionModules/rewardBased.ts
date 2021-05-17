import { ApiPromise } from '@polkadot/api';
import { Logger } from '@w3f/logger';
import {
    TransactionData, TransactionType, FreeBalance, SubscriberConfig
} from '../types';
import { asyncForEach, getSubscriptionNotificationConfig } from '../utils';
import { ZeroBalance } from '../constants';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';
import { Notifier } from '../notifier/INotifier';

const HISTORY_DEPTH = 2;

export class RewardBased implements ISubscriptionModule{

    private readonly api: ApiPromise
    private readonly networkId: string
    private readonly notifier: Notifier
    private readonly config: SubscriberConfig
    private readonly logger: Logger
    private checkedEras: Array<number>
    
    constructor(params: SubscriptionModuleConstructorParams) {
      this.api = params.api
      this.networkId = params.networkId
      this.notifier = params.notifier
      this.config = params.config
      this.logger = params.logger
      this.checkedEras = new Array();
    }

    public subscribe = async (): Promise<void> => {
        await this._startEraRewardCheck()
        this.logger.info(`Reward Based Module subscribed...`)
    }

    private async _startEraRewardCheck(): Promise<void> {
      // Get current Era
      let tryCurrentEra = await this.api.query.staking.activeEra();
      let currentEra;
      if (tryCurrentEra.isSome) {
        currentEra = tryCurrentEra.unwrap().index.toNumber();
        this.logger.info(`Current Era index: ${currentEra}`);
      } else {
        throw Error("failed to fetch current Era index");
      }

      // Generate list of Era indexes to fetch.
      let toCheck = Array(HISTORY_DEPTH)
        .fill(0)
        .map((era, index) => currentEra - HISTORY_DEPTH + index)
        // Skip checked Eras.
        .filter((era) => !this.checkedEras.includes(era));

      console.log(toCheck);

      await asyncForEach(toCheck, async (era) => {
        this.logger.debug(`Checking validator reward for Era ${era}`);

        // Get total reward for the specified Era.
        let tryTotalReward = await this.api.query.staking.erasValidatorReward(era);
        let totalReward;
        if (tryTotalReward.isSome) {
          totalReward = tryTotalReward.unwrap().toBigInt();
        } else {
          throw Error("failed to fetch Era validator rewards");
        }

        // Get the reward points.
        const { total: totalPoints, individual: individualPoints } = await this.api.query.staking.erasRewardPoints(era);
        const rewardPerPoint = totalReward / totalPoints.toBigInt();

        this.config.subscriptions.forEach((target) => {
          let account_id = this.api.createType('AccountId', target.address);
          let validator_points= individualPoints.get(account_id);
          if (validator_points != undefined) {
            const validator_reward = validator_points.toBigInt() * rewardPerPoint;

            // TODO: Track reward.
            this.logger.info(`Validator ${target.address} received a reward of ${validator_reward} for Era ${era}`);
          } else {
            // TODO: Track *missing* reward.
            this.logger.warn(`Validator ${target.address} did NOT receive a reward for Era ${era}`);
          }
        });

        // Track checked era
        this.checkedEras.push(era)
      });
    }
}
