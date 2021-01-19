import nock from 'nock';
import * as _ from 'lodash';
import { should } from 'chai';

import { Matrixbot } from '../src/matrixbot';
import { TransactionType } from '../src/types';

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

const expectedSentMessage = `Finalization confirmation: new transaction sent from account ${senderName}, check https://polkascan.io/${networkId}/transaction/${txHash} for details`;
const expectedSentAlertname = 'TransactionSent';

const expectedReceivedMessage = `Finalization confirmation: new transaction received in account ${receiverName}, check https://polkascan.io/${networkId}/transaction/${txHash} for details`;
const expectedReceivedAlertname = 'TransactionReceived';

const expectedBalanceDecreasedMessage = `New transaction sent from account ${senderName}, check https://polkascan.io/pre/${networkId}/account/${senderAddress}#transactions for details.`;
const expectedBalanceDecreasedAlertname = 'BalanceDecreased';

const expectedBalanceIncreasedMessage = `New transaction received in account ${receiverName}, check https://polkascan.io/pre/${networkId}/account/${receiverAddress}#transactions for details.`;
const expectedBalanceIncreasedAlertname = 'BalanceIncreased';

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

        it('notifies balance decreased', async () => {
          mockRestNotifier(expectedBalanceDecreasedAlertname,expectedBalanceDecreasedMessage)

          const data = {
              name: senderName,
              txType: TransactionType.Sent,
              address: senderAddress,
              networkId: networkId,
              hash: txHash
          };

          await subject.newBalanceChange(data);
        });

        it('notifies balance increased', async () => {
          mockRestNotifier(expectedBalanceIncreasedAlertname,expectedBalanceIncreasedMessage)

          const data = {
              name: receiverName,
              txType: TransactionType.Received,
              address: receiverAddress,
              networkId: networkId,
              hash: txHash
          };

          await subject.newBalanceChange(data);
        });

        it('notifies transactions sent', async () => {
          mockRestNotifier(expectedSentAlertname,expectedSentMessage)

          const data = {
              name: senderName,
              txType: TransactionType.Sent,
              address: senderAddress,
              networkId: networkId,
              hash: txHash
          };

          await subject.newTransaction(data);
        });

        it('notifies transactions received', async () => {
          mockRestNotifier(expectedReceivedAlertname,expectedReceivedMessage)

          const data = {
              name: receiverName,
              txType: TransactionType.Received,
              address: receiverAddress,
              networkId: networkId,
              hash: txHash
          };

          await subject.newTransaction(data);
        });
    });
});
