import * as express from 'express';
import { register } from 'prom-client';
import * as promClient from 'prom-client';
import { Logger, LoggerSingleton } from './logger';
import { PromClient } from './types';

export class Prometheus implements PromClient {

    private scanHeight: promClient.Gauge<"network" | "environment">
    private readonly logger: Logger = LoggerSingleton.getInstance()

    constructor(private readonly environment: string) {
      this._initMetrics()
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

    _initMetrics(): void {
      this.scanHeight = new promClient.Gauge({
        name: 'polkadot_watcher_tx_scan_height',
        help: 'Block heigh reached by the scanner',
        labelNames: ['network', 'environment']
      });
    }


}
