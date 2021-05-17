import { ApiPromise } from '@polkadot/api';
import { Logger } from '@w3f/logger';
import {
    TransactionData, TransactionType, FreeBalance, SubscriberConfig
} from '../types';
import { asyncForEach, getSubscriptionNotificationConfig } from '../utils';
import { ZeroBalance } from '../constants';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';
import { Notifier } from '../notifier/INotifier';

const HISTORY_DEPTH = 4;

export class RewardBased implements ISubscriptionModule{

    private readonly api: ApiPromise
    private readonly networkId: string
    private readonly notifier: Notifier
    private readonly config: SubscriberConfig
    private readonly logger: Logger
    private lastEraCheck: number
    private checkedEras: Array<number>
    
    constructor(params: SubscriptionModuleConstructorParams) {
      this.api = params.api
      this.networkId = params.networkId
      this.notifier = params.notifier
      this.config = params.config
      this.logger = params.logger
      this.lastEraCheck = 0;
      this.checkedEras = new Array();
    }

    public subscribe = async (): Promise<void> => {
        await this._handleEraChange()
        this.logger.info(`Reward Based Module subscribed...`)
    }

    private async _handleEraChange(): Promise<void> {
      while (true) {
        // Get current Era
        let tryCurrentEra = await this.api.query.staking.activeEra();
        if (tryCurrentEra.isSome) {
          const lastCompletedEra = tryCurrentEra.unwrap().index.toNumber() - 1;

          // Determine whether a new check must be run (Era change).
          if (lastCompletedEra > this.lastEraCheck) {
            let toCheck;

            // On startup, generate a list of Eras (`HISTORY_DEPTH`) that need
            // to be checked.
            if (this.lastEraCheck === 0) {
              toCheck = Array(HISTORY_DEPTH)
                .fill(0)
                .map((era, index) => lastCompletedEra - HISTORY_DEPTH + index + 1)
                // Skip checked Eras.
                .filter((era) => !this.checkedEras.includes(era));
            } else {
              // Just check the latest (completed) Era.
              toCheck = Array(lastCompletedEra);
            }

            // Update last Era index check.
            this.lastEraCheck = lastCompletedEra;

            // Start the reward check.
            await this._startEraRewardCheck(toCheck);

            this.logger.info(`Last Era index check: ${this.lastEraCheck}`);
          }
        } else {
          throw Error("failed to fetch current Era index");
        }

        // Sleep
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    private async _startEraRewardCheck(toCheck: Array<number>): Promise<void> {
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
          // NOTE: This does not seem to work:
          //
          // ```
          // let account_id = this.api.createType('AccountId', target.address);
          // let points = individualPoints.get(account_id);
          // ```
          //
          // Related to: https://stackoverflow.com/a/64449712
          //
          // As of now, iterate through the entire map and match addresses (which is inefficient).
          for (const [account_id, points] of individualPoints) {
            if (account_id.toString() === target.address) {
              if (points != undefined) {
                const validator_reward = this.api.createType('Balance', points.toBigInt() * rewardPerPoint);

                // TODO: Track reward.
                this.logger.info(`Validator ${target.address} received a reward of ${validator_reward.toHuman()} for Era ${era}`);
                return;
              }
            }
          }

          this.logger.warn(`Validator ${target.address} did NOT receive a reward for Era ${era}`);
        });

        // Track checked era
        this.checkedEras.push(era)
      });
    }
}
