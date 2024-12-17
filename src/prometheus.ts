import * as express from 'express';
import { register } from 'prom-client';
import * as promClient from 'prom-client';
import { Logger, LoggerSingleton } from './logger';
import { InputConfig, PromClient } from './types';
import { environment } from './constants';

export class Prometheus implements PromClient {

    private scanHeight: promClient.Gauge<"network" | "environment">
    private balanceCurrent: promClient.Gauge<"network" | "name" | "address" | "environment">
    private balanceDesired: promClient.Gauge<"network" | "name" | "address" | "environment">
    private tokenBalanceCurrent: promClient.Gauge<"network" | "name" | "address" | "token" | "environment">
    private tokenBalanceDesired: promClient.Gauge<"network" | "name" | "address" | "token" | "environment">
    private defaultBalanceDesired: number;
    private readonly logger: Logger = LoggerSingleton.getInstance()
    private readonly environment: string

    constructor(config: InputConfig) {

      this.environment = config.environment ? config.environment : environment
      
      this._initMetrics()
      if(config.subscriber.modules.balanceBelowThreshold?.enabled){
        this.defaultBalanceDesired = config.subscriber.modules.balanceBelowThreshold.threshold
        this._initBalanceThresholdMetrics()
      }
      if(config.subscriber.modules.tokenBalanceBelowThreshold?.enabled){
        this._initTokenBalanceThresholdMetrics()
      }
    }

    startCollection(): void {
        this.logger.info(
            'Starting the collection of metrics, the metrics are available on /metrics'
        );
        promClient.collectDefaultMetrics();
    }

    injectMetricsRoute(app: express.Application): void {
        app.get('/metrics', (req: express.Request, res: express.Response) => {
            res.set('Content-Type', register.contentType)
            res.end(register.metrics())
        })
    }

    updateScanHeight(network: string, blockNumer: number): void {
      this.scanHeight.set({ network: network, environment: this.environment },blockNumer)
    }
    
    updateCurrentBalance(network: string, name: string, address: string, balance: number): void {
      this.balanceCurrent.set({network:network, name, address, environment: this.environment }, balance);        
    }

    updateDesiredBalance(network: string, name: string, address: string, balance: number = this.defaultBalanceDesired): void {
      this.balanceDesired.set({network:network, name, address, environment: this.environment }, balance);        
    }

    updateCurrentTokenBalance(network: string, name: string, address: string, token: string, balance: number): void {
      this.tokenBalanceCurrent.set({network:this._toSubscanAssethubFormat(network), name, address, token, environment: this.environment }, balance);        
    }

    updateDesiredTokenBalance(network: string, name: string, address: string, token: string, balance: number): void {
      this.tokenBalanceDesired.set({network:this._toSubscanAssethubFormat(network), name, address, token, environment: this.environment }, balance);        
    }

    _toSubscanAssethubFormat(network: string): string{
      if(network.includes("kusama"))
        return "assethub-kusama"
      if(network.includes("polkadot"))
        return "assethub-polkadot"
      return "unknown"
    }

    _initMetrics(): void {
      this.scanHeight = new promClient.Gauge({
        name: 'polkadot_watcher_tx_scan_height',
        help: 'Block heigh reached by the scanner',
        labelNames: ['network', 'environment']
      });
    }

    _initBalanceThresholdMetrics(): void {
      this.balanceCurrent = new promClient.Gauge({
        name: 'polkadot_account_balance_current',
        help: 'Current balance',
        labelNames: ['network', 'name', 'address', 'environment']
      });
      this.balanceDesired = new promClient.Gauge({
        name: 'polkadot_account_balance_desired',
        help: 'Minimum Desired balance',
        labelNames: ['network', 'name', 'address', 'environment']
      });
    }

    _initTokenBalanceThresholdMetrics(): void {
      this.tokenBalanceCurrent = new promClient.Gauge({
        name: 'polkadot_account_token_balance_current',
        help: 'Current balance',
        labelNames: ['network', 'name', 'address', 'token', 'environment']
      });
      this.tokenBalanceDesired = new promClient.Gauge({
        name: 'polkadot_account_token_balance_desired',
        help: 'Minimum Desired balance',
        labelNames: ['network', 'name', 'address', 'token', 'environment']
      });
    }

}
