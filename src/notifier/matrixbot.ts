import { Logger } from '@w3f/logger';
import got from 'got';

import {
    TransactionData,
    MatrixbotMsg,
    TransactionType
} from '../types';
import { Notifier } from './INotifier';

const MsgTemplate = {
    "receiver": "webhook",
    "status": "firing",
    "alerts": [
        {
            "status": "firing",
            "labels": {
                "alertname": "",
                "severity": "info"
            },
            "annotations": {
                "description": ""
            }
        }
    ],
    "version": "4"
};


export class Matrixbot implements Notifier {
    constructor(protected readonly endpoint: string, protected readonly logger: Logger) { }

    newTransaction = async (data: TransactionData): Promise<string> =>{
        const json = this._transactionMsg(data);

        return await this._send(json);
    }

    newBalanceChange = async (data: TransactionData): Promise<string> =>{
      const json = this._balanceChangeMsg(data);
      
      return await this._send(json);
    }

    newTransfer = async (data: TransactionData): Promise<string> =>{
      const json = this._transferMsg(data);

      return await this._send(json);
    }

    protected _transactionMsg = (data: TransactionData): MatrixbotMsg =>{
        //TODO: this functionality is not ready to be used
        const msg = { ...MsgTemplate };

        let description: string;
        let alertname: string;
        if (data.txType === TransactionType.Sent) {
            description = `Finalization confirmation: new transaction sent from the account ${data.name}, check https://polkascan.io/${data.networkId}/transaction/${data.hash} for details`;
            alertname = 'TransactionSent';
        } else {
            description = `Finalization confirmation: new transaction received in the account ${data.name}, check https://polkascan.io/${data.networkId}/transaction/${data.hash} for details`;
            alertname = 'TransactionReceived';
        }
        msg.alerts[0].labels.alertname = alertname;
        msg.alerts[0].annotations.description = description;
        return msg;
    }

    protected _balanceChangeMsg = (data: TransactionData): MatrixbotMsg =>{
      const msg = { ...MsgTemplate };

      const description = `New Balance Change detected (i.e. staking rewards, transfers, ...) for the account ${data.name}, check https://${data.networkId}.subscan.io/account/${data.address}?tab=reward for details.`;
      let alertname: string;
      if (data.txType === TransactionType.Sent) {
          alertname = 'BalanceDecreased';
      } else {
          alertname = 'BalanceIncreased';
      }
      msg.alerts[0].labels.alertname = alertname;
      msg.alerts[0].annotations.description = description;
      return msg;
    }

    protected _transferMsg = (data: TransactionData): MatrixbotMsg =>{
      const msg = { ...MsgTemplate };

      let description: string;
      let alertname: string;
      if (data.txType === TransactionType.Sent) {
          description = `New Transfer of ${data.amount.toHuman()} sent from the account ${data.name}, check https://${data.networkId}.subscan.io/account/${data.address}?tab=transfer for details.`;
          alertname = 'TransferSent';
      } else {
          description = `New Transfer of ${data.amount.toHuman()} received in the account ${data.name}, check https://${data.networkId}.subscan.io/account/${data.address}?tab=transfer for details.`;
          alertname = 'TransferReceived';
      }
      msg.alerts[0].labels.alertname = alertname;
      msg.alerts[0].annotations.description = description;
      return msg;
    }

    protected _send = async (json: MatrixbotMsg): Promise<string> =>{
      try {
        this.logger.info(`Sending New notification...`)
        this.logger.info(`${JSON.stringify(json)}`)
        const result = await got.post(this.endpoint, { json });
        return result.body;
      } catch (error) {
        this.logger.error(`could not notify Transfer Event: ${error.message}`);
        return error.message
      }
    }

}
