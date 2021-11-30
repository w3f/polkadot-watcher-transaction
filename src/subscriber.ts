import { ApiPromise, WsProvider } from '@polkadot/api';
import { Logger } from '@w3f/logger';
import { Text } from '@polkadot/types/primitive';
import {
    InputConfig, SubscriberConfig, TransactionData, TransactionType
} from './types';
import { EventScannerBased } from './subscriptionModules/eventScannerBased';
import { SubscriptionModuleConstructorParams } from './subscriptionModules/ISubscribscriptionModule';
import { Notifier } from './notifier/INotifier';


export class Subscriber {
    private chain: Text;
    private api: ApiPromise;
    private networkId: string;
    private endpoint: string;
    private logLevel: string;
    private config: SubscriberConfig;

    private eventScannerBased: EventScannerBased;
    
    constructor(
        cfg: InputConfig,
        private readonly notifier: Notifier,
        private readonly logger: Logger) {
        this.endpoint = cfg.endpoint;
        this.logLevel = cfg.logLevel;

        this._initSubscriberConfig(cfg)
    }

    private _initSubscriberConfig = (cfg: InputConfig): void => {
      this.config = cfg.subscriber
    }

    public start = async (): Promise<void> => {

        try {
          await this._initAPI();
        } catch (error) {
          this.logger.error("initAPI error... exiting: "+JSON.stringify(error))
          process.exit(1)
        }

        this._initModules()

        if(this.logLevel === 'debug') await this._triggerDebugActions()

        this.config.modules?.transferEventScanner?.enabled != false && this.eventScannerBased.subscribe();
    }

    public triggerTestTransfer = async (): Promise<boolean> => {

      const data: TransactionData = {
        name: "TestName",
        address: "TestAddress",
        hash: "TestHash",
        networkId: this.networkId,
        txType: TransactionType.Sent,
        amount: "0 Unit"
      };

      try {
        await this.notifier.newTransfer(data)
        return true
      } catch (error) {
        return false
      } 
    }

    private _initAPI = async (): Promise<void> =>{
        const provider = new WsProvider(this.endpoint);

        this.api = new ApiPromise({provider})
        if(this.api){
          this.api.on("error", error => {
            if( error.toString().includes("FATAL") || JSON.stringify(error).includes("FATAL") ){
              this.logger.error("The API had a FATAL error... exiting!")
              process.exit(1)
            }
          })
        }
        await this.api.isReadyOrError;
        
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

    /*to agevolate the tests*/
    private _initModules = (): void => {
      const subscriptionModuleConfig: SubscriptionModuleConstructorParams = {
        api: this.api,
        networkId: this.networkId,
        notifier: this.notifier,
        config: this.config,
        logger: this.logger
      }

      this.eventScannerBased = new EventScannerBased(subscriptionModuleConfig)
    }

}
