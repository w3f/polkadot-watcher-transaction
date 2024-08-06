import got from 'got';
import _ from 'lodash';
import { Logger, LoggerSingleton } from '../logger';

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

    private readonly logger: Logger = LoggerSingleton.getInstance()

    constructor(protected readonly endpoint: string) { }

    newTransfer = async (data: TransactionData): Promise<boolean> =>{
      const json = this._transferMsg(data);

      return await this._send(json);
    }

    protected _transactionMsg = (data: TransactionData): MatrixbotMsg =>{
        const msg = _.cloneDeep(MsgTemplate)

        let description: string;
        let alertname: string;
        if (data.txType === TransactionType.Sent) {
            description = `New Transfer of ${data.amount} sent from the account ${data.name}, check https://${data.networkId}.subscan.io/extrinsic/${data.hash} for details`;
            alertname = 'TransactionSent';
        } else {
            description = `New Transfer of ${data.amount} received in the account ${data.name}, check https://${data.networkId}.subscan.io/extrinsic/${data.hash} for details`;
            alertname = 'TransactionReceived';
        }
        msg.alerts[0].labels.alertname = alertname;
        msg.alerts[0].annotations.description = description;
        return msg;
    }

    protected _balanceChangeMsg = (data: TransactionData): MatrixbotMsg =>{
      const msg = _.cloneDeep(MsgTemplate)

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
      const msg = _.cloneDeep(MsgTemplate)

      let description: string;
      let alertname: string;
      const chainName = data.networkId[0].toUpperCase() + data.networkId.slice(1)
      const checkUrl = data.hash ? `https://${data.networkId}.subscan.io/extrinsic/${data.hash} for details.` : `https://${data.networkId}.subscan.io/account/${data.address}?tab=transfer for details.`

      if (data.txType === TransactionType.Sent) {
          description = `New Transfer of ${data.amount} ${data.token} sent from the ${chainName} account ${data.name}, check ${checkUrl}`;
          alertname = 'TransferSent';
      } else {
          description = `New Transfer of ${data.amount} ${data.token} received in the ${chainName} account ${data.name}, check ${checkUrl}`;
          alertname = 'TransferReceived';
      }
      msg.alerts[0].labels.alertname = alertname;
      msg.alerts[0].annotations.description = description;
      return msg;
    }

    protected _send = async (json: MatrixbotMsg): Promise<boolean> =>{
      try {
        this.logger.info(`Sending New notification...`)
        this.logger.info(`${JSON.stringify(json)}`)
        const result = await got.post(this.endpoint, { json });
        return result.statusCode == 200;
      } catch (error) {
        this.logger.error(`could not send the notification: ${error.message}`);
        return false
      }
    }

}
