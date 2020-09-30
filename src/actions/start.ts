import express from 'express';
import { createLogger } from '@w3f/logger';
import { Config } from '@w3f/config';

import { Subscriber } from '../subscriber';
import { Matrixbot } from '../matrixbot';
import { InputConfig } from '../types';

const _startServer = (port: number): void =>{
  const server = express();

  server.get('/healthcheck',
      async (req: express.Request, res: express.Response): Promise<void> => {
          res.status(200).send('OK!')
      })
      
  server.listen(port);
}

export const startAction = async (cmd): Promise<void> =>{
    const cfg = new Config<InputConfig>().parse(cmd.config);

    _startServer(cfg.port)

    const notifier = new Matrixbot(cfg.matrixbot.endpoint);
    const logger = createLogger(cfg.logLevel);
    const subscriber = new Subscriber(cfg,notifier,logger);
    await subscriber.start();
}