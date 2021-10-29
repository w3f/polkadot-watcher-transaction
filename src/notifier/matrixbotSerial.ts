import { Logger } from '@w3f/logger';
import { MessageDelay } from '../constants';

import {
    TransactionData,
    MatrixbotMsg,
} from '../types';
import { Notifier } from './INotifier';
import { Matrixbot } from './matrixbot';

/*
This implementation sends serial messages with a minimum MessageDelay time delay
*/
export class MatrixbotSerial extends Matrixbot implements Notifier {
  private _store: MatrixbotMsg[] = [];

  constructor(endpoint: string, logger: Logger) {
    super(endpoint, logger);
    setInterval(this._sendQueued,MessageDelay)
  }

  newTransfer = async (data: TransactionData): Promise<string> =>{
    const json = this._transferMsg(data);
    this._push(json)
    return JSON.stringify(json)
  }

  newBalanceChange = async (data: TransactionData): Promise<string> =>{
    const json = this._balanceChangeMsg(data);
    this._push(json)
    return JSON.stringify(json)
  }

  newTransaction = async (data: TransactionData): Promise<string> =>{
    const json = this._transactionMsg(data);
    this._push(json)
    return JSON.stringify(json)
}

  _sendQueued = async (): Promise<void> => {
    if(this._store.length != 0){
      await this._send(this._pop())
    }
  }

  _push = (val: MatrixbotMsg): number => {
    return this._store.push(val);
  }

  _pop = (): MatrixbotMsg | undefined => {
    const msg = this._store.shift();
    return msg
  }
  


}
