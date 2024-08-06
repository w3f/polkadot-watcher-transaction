import { ApiPromise} from '@polkadot/api';
import { Logger, LoggerSingleton } from '../logger';
import { SubscriberConfig, Subscribable, PromClient } from '../types';
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';

export class BalanceBelowThreshold implements ISubscriptionModule{

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
      const denominator = BigInt(10**this.api.registry.chainDecimals[0])
      const result = Number(scaledNumerator / denominator) / Number(scalingFactor);
      return result
    }

    public subscribe = async (): Promise<void> => {

      // set desired balance for each account
      for (const account of this.subscriptions) {
        this.promClient.updateDesiredBalance(this.networkId,account.name,account.address,account.threshold)
      }

      await this.api.query.system.account.multi(this.subscriptions.map(a => a.address), (balances: any) => {
        this.subscriptions.forEach((account, index) => {
          const free = balances[index].data.free;
          let balance = this.formatBalance(free.toBigInt());
          if(account.thresholdCountReserved){
            const reserved = balances[index].data.reserved;
            balance += this.formatBalance(reserved.toBigInt());
          }
          this.promClient.updateCurrentBalance(this.networkId,account.name,account.address,balance)
          this.logger.info(`Account: ${account.name} | Address ${account.address} -> Balance: ${balance}`);
        });
      });
    }

  

}
