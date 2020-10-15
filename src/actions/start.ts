import express from 'express';
import {  } from "express/";
import { createLogger } from '@w3f/logger';
import { Config } from '@w3f/config';
import { Prometheus } from '../prometheus';
import { Subscriber } from '../subscriber';
import { Matrixbot } from '../matrixbot';
import { InputConfig } from '../types';

const _startServer = (port: number): express.Application =>{
  const server = express();

  server.get('/healthcheck',
      async (req: express.Request, res: express.Response): Promise<void> => {
          res.status(200).send('OK!')
      })
      
  server.listen(port);
  return server
}

export const startAction = async (cmd): Promise<void> =>{
    const cfg = new Config<InputConfig>().parse(cmd.config);
    
    const logger = createLogger(cfg.logLevel);
    
    const server = _startServer(cfg.port)

    const promClient = new Prometheus(logger);
    promClient.injectMetricsRoute(server)
    promClient.startCollection()

    const notifier = new Matrixbot(cfg.matrixbot.endpoint);

    const subscriber = new Subscriber(cfg,notifier,logger);
    await subscriber.start();
}