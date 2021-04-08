import nock from 'nock';
import { should } from 'chai';

import { MatrixbotSerial } from '../src/notifier/matrixbotSerial';
import { TransactionType } from '../src/types';
import { createLogger } from '@w3f/logger';
import { delay } from '../src/utils';
import { MessageDelay } from '../src/constants';

should();

const host = 'http://localhost:9090';
const path = 'matrixbot';
const endpoint = `${host}/${path}`;
const subject = new MatrixbotSerial(endpoint,createLogger());
const senderName = 'senderName';
const senderAddress = 'senderAddress';
const networkId = 'networkId';
const txHash = 'txHash';

const mock200 = (): void => {
  nock(host).post(`/${path}`).reply(200);
}

describe('MatrixbotSerial', () => {
    describe('newBalanceChange', () => {
        afterEach(() => {
            nock.cleanAll();
        });

        it('notifies balance decreased', async () => {
          mock200()
          const data = {
              name: senderName,
              txType: TransactionType.Sent,
              address: senderAddress,
              networkId: networkId,
              hash: txHash
          };

          await subject.newBalanceChange(data);
          subject['_store'].length.should.be.equals(1)
          await delay(MessageDelay)
          subject['_store'].length.should.be.equals(0)
        });

        it('notifies 3 balance decreased in a serial way', async () => {
          mock200()
          mock200()
          mock200()
          const data = {
              name: senderName,
              txType: TransactionType.Sent,
              address: senderAddress,
              networkId: networkId,
              hash: txHash
          };

          await subject.newBalanceChange(data);
          await subject.newBalanceChange(data);
          await subject.newBalanceChange(data);
          let current = subject['_store'].length
          subject['_store'].length.should.be.equals(current)
          await delay(MessageDelay)
          subject['_store'].length.should.be.equals(--current)
          await delay(MessageDelay)
          subject['_store'].length.should.be.equals(--current)
          await delay(MessageDelay)
          subject['_store'].length.should.be.equals(--current)
        });
    });
});
