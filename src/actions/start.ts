import express from 'express';
import {  } from "express/";
import { Config } from '@w3f/config';
import { Prometheus } from '../prometheus';
import { Subscriber } from '../subscriber';
import { InputConfig, Subscribable } from '../types';
import { NotifierFactory } from '../notifier/NotifierFactory';
import { environment } from '../constants';
import { LoggerSingleton } from '../logger';
import { GitConfigLoaderFactory } from '../gitConfigLoader/gitConfigLoaderFactory';

const _loadConfig = async (config: any): Promise<InputConfig> =>{
    const cfg = new Config<InputConfig>().parse(config);
    const gitLoaders = new GitConfigLoaderFactory(cfg).makeGitConfigLoaders()

    const gitTargets: Array<Subscribable> = []
    for (const l of gitLoaders) {
        const t = await l.downloadAndLoad()
        gitTargets.push(...t)
    }

    const seen = new Set();
    if(!cfg.subscriber.subscriptions) cfg.subscriber.subscriptions = []
    const filteredArr = [...cfg.subscriber.subscriptions,...gitTargets].filter(el=>{ //priority given to locals over downloaded ones
        const isDuplicate = seen.has(el.name);
        seen.add(el.name)
        return !isDuplicate
    })
    cfg.subscriber.subscriptions = filteredArr
    return cfg
}

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
    const cfg = await _loadConfig(cmd.config)

    const logger = LoggerSingleton.getInstance(cfg.logLevel)
    logger.info(`loaded ${cfg.subscriber.subscriptions.length} targets`)
        
    const server = _startServer(cfg.port)
    const env = cfg.environment ? cfg.environment : environment

    const promClient = new Prometheus(env);
    promClient.injectMetricsRoute(server)
    promClient.startCollection()

    const notifier = new NotifierFactory(cfg.matrixbot).makeNotifier()

    const subscriber = new Subscriber(cfg,notifier,promClient);
    await subscriber.start();

    _addTestEndpoint(server,subscriber)

}