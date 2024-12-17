import { ApiPromise} from '@polkadot/api';
import { Logger, LoggerSingleton } from '../logger';
import { SubscriberConfig, Subscribable, PromClient } from '../types';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';

export class TokenBalanceBelowThreshold implements ISubscriptionModule{

    private subscriptions: Subscribable[] = []
    private readonly api: ApiPromise
    private readonly networkId: string
    private readonly config: SubscriberConfig
    private readonly logger: Logger = LoggerSingleton.getInstance()

    constructor(params: SubscriptionModuleConstructorParams, private readonly promClient: PromClient) {
      this.api = params.api
      this.networkId = params.networkId
      this.config = params.config
      this.subscriptions = this.config.subscriptions
    }

    private formatBalance(free: bigint): number {
      const decimalPlaces = 1
      const scalingFactor = 10n ** BigInt(decimalPlaces);
      const scaledNumerator = free * scalingFactor;
      const denominator = BigInt(10**6)
      const result = Number(scaledNumerator / denominator) / Number(scalingFactor);
      return result
    }

    public subscribe = async (): Promise<void> => {

      const usdtSubscriptions: Subscribable[] = []
      const usdcSubscriptions: Subscribable[] = []

      for (const account of this.subscriptions) {
        const token = account.token?.toUpperCase().trim()
        let isToken = true
        switch (token) {
          case "USDT":
            usdtSubscriptions.push(account)
            break;
          case "USDC":
            usdcSubscriptions.push(account)
            break;  
          default:
            isToken = false
        }
        if(!isToken)
          continue

        this.promClient.updateDesiredTokenBalance(this.networkId,account.name,account.address,token,account.threshold)
      }

      for (const subscription of usdtSubscriptions) {
        await this.api.query.assets?.account(1984,subscription.address, asset => {
          // console.log(asset.toHuman())
          const balance = asset.isSome ? this.formatBalance(asset.value.balance.toBigInt()) : 0
          this.promClient.updateCurrentTokenBalance(this.networkId,subscription.name,subscription.address,"USDT",balance)
          this.logger.info(`Account: ${subscription.name} | Address ${subscription.address} | Token: USDT -> Balance: ${balance}`);
        })
      }

      for (const subscription of usdcSubscriptions) {
        await this.api.query.assets?.account(1337,subscription.address, asset => {
          // console.log(asset.toHuman())
          const balance = asset.isSome ? this.formatBalance(asset.value.balance.toBigInt()) : 0
          this.promClient.updateCurrentTokenBalance(this.networkId,subscription.name,subscription.address,"USDC",balance)
          this.logger.info(`Account: ${subscription.name} | Address ${subscription.address} | Token: USDC -> Balance: ${balance}`);
        })
      }
    }
}
