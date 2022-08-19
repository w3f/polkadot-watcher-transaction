import nock from 'nock';
import * as _ from 'lodash';
import { should } from 'chai';

import { Matrixbot } from '../src/notifier/matrixbot';
import { TransactionType } from '../src/types';
import { LoggerSingleton } from '../src/logger'

should();

const host = 'http://localhost:9090';
const path = 'matrixbot';
const endpoint = `${host}/${path}`;
const subject = new Matrixbot(endpoint);
const senderName = 'senderName';
const senderAddress = 'senderAddress';
const receiverName = 'receiverName';
const receiverAddress = 'receiverAddress';
const networkId = 'networkId';
const txHash = 'txHash';
const amount = '100'

const expectedSentMessage = `New Transfer of ${amount} sent from the account ${senderName}, check https://${networkId}.subscan.io/extrinsic/${txHash} for details`;
const expectedSentAlertname = 'TransactionSent';
const expectedReceivedMessage = `New Transfer of ${amount} received in the account ${receiverName}, check https://${networkId}.subscan.io/extrinsic/${txHash} for details`;
const expectedReceivedAlertname = 'TransactionReceived';

LoggerSingleton.setInstance("info")

const mockRestNotifier = (alertname: string, message: string): void => {
  nock(host).post(`/${path}`,_.matches(
    {
      alerts: [
          {
              labels: {
                  alertname: alertname
              },
              annotations: { description: message }
          }
      ]
    })).reply(200);
}

describe('Matrixbot', () => {
    describe('newTransaction', () => {
        afterEach(() => {
            nock.cleanAll();
        });

        it('notifies transactions sent', async () => {
          mockRestNotifier(expectedSentAlertname,expectedSentMessage)

          const data = {
              name: senderName,
              txType: TransactionType.Sent,
              address: senderAddress,
              networkId: networkId,
              hash: txHash,
              amount: amount
          };

          await subject.newTransfer(data);
        });

        it('notifies transactions received', async () => {
          mockRestNotifier(expectedReceivedAlertname,expectedReceivedMessage)

          const data = {
              name: receiverName,
              txType: TransactionType.Received,
              address: receiverAddress,
              networkId: networkId,
              hash: txHash,
              amount: amount
          };

          await subject.newTransfer(data);
        });
    });
});
