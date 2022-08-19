import express from 'express';
import {  } from "express/";
import { createLogger } from '@w3f/logger';
import { Config } from '@w3f/config';
import { Prometheus } from '../prometheus';
import { Subscriber } from '../subscriber';
import { InputConfig } from '../types';
import { NotifierFactory } from '../notifier/NotifierFactory';
import { environment } from '../constants';
import { LoggerSingleton } from '../logger';

const _startServer = (port: number): express.Application =>{
  const server = express();

  server.get('/healthcheck',
      async (req: express.Request, res: express.Response): Promise<void> => {
          res.status(200).send('OK!')
      })
      
  server.listen(port);
  return server
}

const _addTestEndpoint = (server: express.Application, subscriber: Subscriber): void =>{
 
  server.get('/test',
      async (req: express.Request, res: express.Response): Promise<void> => {
          const result = await subscriber.triggerTestTransfer()
          res.status(200).send(result)
      })
}

export const startAction = async (cmd): Promise<void> =>{
    const cfg = new Config<InputConfig>().parse(cmd.config);
        
    const server = _startServer(cfg.port)
    const env = cfg.environment ? cfg.environment : environment

    LoggerSingleton.setInstance(cfg.logLevel)

    const promClient = new Prometheus(env);
    promClient.injectMetricsRoute(server)
    promClient.startCollection()

    const notifier = new NotifierFactory(cfg.matrixbot).makeNotifier()

    const subscriber = new Subscriber(cfg,notifier,promClient);
    await subscriber.start();

    _addTestEndpoint(server,subscriber)

}