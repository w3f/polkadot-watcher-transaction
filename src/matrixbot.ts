import got from 'got';

import {
    TransactionData,
    Notifier,
    MatrixbotMsg,
    TransactionType
} from './types';

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
    constructor(private readonly endpoint: string) { }

    newTransaction = (data: TransactionData): Promise<string> =>{
        const json = this._transactionMsg(data);

        return this._send(json);
    }

    newBalanceChange = (data: TransactionData): Promise<string> =>{
      const json = this._balanceChangeMsg(data);

      return this._send(json);
  }

    private _transactionMsg = (data: TransactionData): MatrixbotMsg =>{
        const msg = { ...MsgTemplate };

        let description: string;
        let alertname: string;
        if (data.txType === TransactionType.Sent) {
            description = `Finalization confirmation: new transaction sent from account ${data.name}, check https://polkascan.io/${data.networkId}/transaction/${data.hash} for details`;
            alertname = 'TransactionSent';
        } else {
            description = `Finalization confirmation: new transaction received in account ${data.name}, check https://polkascan.io/${data.networkId}/transaction/${data.hash} for details`;
            alertname = 'TransactionReceived';
        }
        msg.alerts[0].labels.alertname = alertname;
        msg.alerts[0].annotations.description = description;
        return msg;
    }

    private _balanceChangeMsg = (data: TransactionData): MatrixbotMsg =>{
      const msg = { ...MsgTemplate };

      let description: string;
      let alertname: string;
      if (data.txType === TransactionType.Sent) {
          description = `New transaction sent from account ${data.name}, check https://polkascan.io/pre/${data.networkId}/account/${data.address}#transactions for details.`;
          alertname = 'BalanceDecreased';
      } else {
          description = `New transaction received in account ${data.name}, check https://polkascan.io/pre/${data.networkId}/account/${data.address}#transactions for details.`;
          alertname = 'BalanceIncreased';
      }
      msg.alerts[0].labels.alertname = alertname;
      msg.alerts[0].annotations.description = description;
      return msg;
  }

    private _send = async (json: MatrixbotMsg): Promise<string> =>{
        const result = await got.post(this.endpoint, { json });
        return result.body;
    }
}
