import { Client, Keyring } from '@w3f/polkadot-api-client';
import { TestPolkadotRPC } from '@w3f/test-utils';
import { createLogger } from '@w3f/logger';
import { should } from 'chai';
import { Subscriber } from '../src/subscriber';
import {
  ExtrinsicMock,
    NotifierMock,
} from './mocks';
import { TransactionType } from '../src/types';
import { delay, initClient, sendFromAToB  } from './utils';

should();

let keyring: Keyring;

const cfg = {
    logLevel: 'debug',
    port: 3000,
    endpoint: 'some_endpoint',
    matrixbot: {
        endpoint: 'some_endpoint'
    },
    subscriber: {
      subscriptions: [{
            name: 'Alice',
            address: 'HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F'
        },
        {
            name: 'Bob',
            address: 'FoQJpPyadYccjavVdTWxpxU7rUEaYhfLCPwXgkfD6Zat9QP'
        }]
    }
};

const cfg2 = {
  ...cfg,
  subscriber: {
    modules:{
      transferExtrinsic: {
        sent: false,
        received: false
      }
    },
    subscriptions: [{
          name: 'Alice',
          address: 'HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F',
      },
      {
          name: 'Bob',
          address: 'FoQJpPyadYccjavVdTWxpxU7rUEaYhfLCPwXgkfD6Zat9QP',
          balanceChange: {
            received: false
          }
      }]
  }
};

const logger = createLogger();

const testRPC = new TestPolkadotRPC();

const extrinsicMock = new ExtrinsicMock(logger,testRPC)

const sendFromAliceToBob = async (client?: Client): Promise<void> =>{

    if(!client){
      client = initClient(testRPC.endpoint())
    }

    await sendFromAToB('//Alice','//Bob',keyring,client)
}

const checkNotifiedTransactionExtrinsic = (expectedName: string, expectedTxType: TransactionType, nt: NotifierMock, expectedOutcome = true): void =>{
    let found = false;

    for (const data of nt.receivedTransactionsExtrinsic) {
        if (data.name === expectedName &&
            data.txType === expectedTxType) {
            found = true;
            break;
        }
    }
    if(expectedOutcome)
      found.should.be.true; 
    else
    found.should.be.false; 
}

const checkNotifiedTransactionEvent = (expectedName: string, expectedTxType: TransactionType, nt: NotifierMock, expectedOutcome = true): void =>{
  let found = false;

  for (const data of nt.receivedTransactionEvents) {
      if (data.name === expectedName &&
          data.txType === expectedTxType) {
          found = true;
          break;
      }
  }
  if(expectedOutcome)
    found.should.be.true; 
  else
  found.should.be.false; 
}

const checkNotifiedBalanceChange = (expectedName: string, expectedTxType: TransactionType, nt: NotifierMock, expectedOutcome = true): void =>{
  let found = false;

  for (const data of nt.receivedBalanceChanges) {
      if (data.name === expectedName &&
          data.txType === expectedTxType) {
          found = true;
          break;
      }
  }
  if(expectedOutcome)
    found.should.be.true;
  else
    found.should.be.false;  
}

describe('Subscriber', () => {
  before(async () => {
      await testRPC.start();
      keyring = new Keyring({ type: 'sr25519' });
  });

  after(async () => {
      await testRPC.stop();
  });

  describe('with a started instance, cfg1', () => {
      let nt: NotifierMock
      let subject: Subscriber
      
      before(async () => {
          nt = new NotifierMock();
          cfg.endpoint = testRPC.endpoint();
          subject = new Subscriber(cfg, nt, logger);
          await subject.start();
      });

      describe('transactions', async () => {
          it('should notify balance changes, events, and transactions', async () => {
              nt.resetReceivedData();

              await sendFromAliceToBob();

              checkNotifiedBalanceChange('Alice', TransactionType.Sent, nt);
              checkNotifiedBalanceChange('Bob', TransactionType.Received, nt);
              checkNotifiedTransactionExtrinsic('Alice', TransactionType.Sent, nt)
              checkNotifiedTransactionExtrinsic('Bob', TransactionType.Received, nt)
              checkNotifiedTransactionEvent('Alice', TransactionType.Sent, nt)
              checkNotifiedTransactionEvent('Bob', TransactionType.Received, nt)
          });
      });

      describe('transferBalancesEventHandler', async () => {
        it('is transferBalances event, but our addresses are not involved', async () => {
            const event = await extrinsicMock.generateTransferEvent('//Charlie','//Dave')

            const isNewNotificationTriggered = await subject["eventBased"]["_balanceTransferHandler"](event)

            isNewNotificationTriggered.should.be.false
            await(delay(3000))
        });

        it('is transferBalances event 1', async () => {
            const event = await extrinsicMock.generateTransferEvent('//Alice','//Bob')

            const isNewNotificationTriggered = await subject["eventBased"]["_balanceTransferHandler"](event)

            isNewNotificationTriggered.should.be.true
        });

        it('is transferBalances event 2', async () => {
          const event = await extrinsicMock.generateTransferEvent('//Bob','//Alice')

          const isNewNotificationTriggered = await subject["eventBased"]["_balanceTransferHandler"](event)

          isNewNotificationTriggered.should.be.true
        });
    });

      describe('transferBalancesExtrinsicHandler', async () => {
          it('is not transferBalances extrinsic', async () => {
              const extrinsic = await extrinsicMock.generateNonTransferExtrinsic()

              const isNewNotificationTriggered = await subject["blockBased"]["_transferBalancesExtrinsicHandler"](extrinsic,extrinsic.hash.toHex())

              isNewNotificationTriggered.should.be.false
          });

          it('is transferBalances extrinsic, but our addresses are not involved', async () => {
              const extrinsic = await extrinsicMock.generateTransferExtrinsic('//Charlie','//Dave')

              const isNewNotificationTriggered = await subject["blockBased"]["_transferBalancesExtrinsicHandler"](extrinsic,extrinsic.hash.toHex())

              isNewNotificationTriggered.should.be.false
          });

          it('is transferBalances extrinsic 1', async () => {
              const extrinsic = await extrinsicMock.generateTransferExtrinsic('//Alice','//Bob')

              const isNewNotificationTriggered = await subject["blockBased"]["_transferBalancesExtrinsicHandler"](extrinsic,extrinsic.hash.toHex())

              isNewNotificationTriggered.should.be.true
          });

          it('is transferBalances extrinsic 2', async () => {
            const extrinsic = await extrinsicMock.generateTransferExtrinsic('//Bob','//Alice')

            const isNewNotificationTriggered = await subject["blockBased"]["_transferBalancesExtrinsicHandler"](extrinsic,extrinsic.hash.toHex())

            isNewNotificationTriggered.should.be.true
          });
      });
  });

  describe('with an started instance, cfg2', () => {
    let nt: NotifierMock
    
    before(async () => {
        nt = new NotifierMock();
        const cfg = cfg2
        cfg.endpoint = testRPC.endpoint();
        const subject = new Subscriber(cfg, nt, logger);
        await subject.start();
    });

    describe('transactions', async () => {
        it('should NOT notify...', async () => {
            nt.resetReceivedData();

            await sendFromAliceToBob();

            checkNotifiedBalanceChange('Alice', TransactionType.Sent, nt, true);
            checkNotifiedBalanceChange('Bob', TransactionType.Received, nt, false);
            checkNotifiedTransactionExtrinsic('Alice', TransactionType.Sent, nt, false)
            checkNotifiedTransactionExtrinsic('Bob', TransactionType.Received, nt, false)
            checkNotifiedTransactionEvent('Alice', TransactionType.Sent, nt, true)
            checkNotifiedTransactionEvent('Bob', TransactionType.Received, nt, true)
        });

    });
  });

});
