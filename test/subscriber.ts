import '@polkadot/api-augment'; //https://github.com/polkadot-js/api/issues/4450
import { Client, Keyring } from '@w3f/polkadot-api-client';
import { TestPolkadotRPC } from '@w3f/test-utils';
import { createLogger } from '@w3f/logger';
import { should } from 'chai';
import { Subscriber } from '../src/subscriber';
import {
  ExtrinsicMock,
    NotifierMock,
    NotifierMockBroken,
    PrometheusMock,
} from './mocks';
import { TransactionType } from '../src/types';
import { initClient, sendFromAToB  } from './utils';
import { isDirExistent, rmDir } from '../src/utils';
import { CodecHash } from '@polkadot/types/interfaces';
import sinon from 'sinon'

should();

let keyring: Keyring;

const dataDir = "./test/data"

const cfg = {
    logLevel: 'info',
    environment: 'test',
    port: 3000,
    endpoint: 'some_endpoint',
    matrixbot: {
        enabled: true,
        endpoint: 'some_endpoint'
    },
    subscriber: {
      modules: {
        transferEventScanner: {
          enabled: true,
          sent: true,
          received: true,
          dataDir: dataDir
        }
      },
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
    ...cfg.subscriber,
    subscriptions: [{
          name: 'Alice',
          address: 'HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F',
          transferEventScanner: {
            sent: false,
          }
      },
      {
          name: 'Bob',
          address: 'FoQJpPyadYccjavVdTWxpxU7rUEaYhfLCPwXgkfD6Zat9QP',
          transferEventScanner: {
            received: false,
          }
      }]
  }
};

const logger = createLogger();

const testRPC = new TestPolkadotRPC();

const extrinsicMock = new ExtrinsicMock(testRPC)

const sendFromAliceToBob = async (client?: Client): Promise<void> =>{

    if(!client){
      client = initClient(testRPC.endpoint())
    }

    await sendFromAToB('//Alice','//Bob',keyring,client)
}

const sendFromBobToAlice = async (client?: Client): Promise<void> =>{

  if(!client){
    client = initClient(testRPC.endpoint())
  }

  await sendFromAToB('//Bob','//Alice',keyring,client)
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

const createCodecHash = async (client?: Client): Promise<CodecHash> =>{

  if(!client){
    client = initClient(testRPC.endpoint())
  }

  return (await client.api()).createType('CodecHash')
}

describe('Subscriber, with a started new chain...', () => {
  before(async () => {
      // we are starting a chain from scratch
      if ( isDirExistent(dataDir) ) {
        rmDir(dataDir)
      }
      await testRPC.start();
      keyring = new Keyring({ type: 'sr25519' });
  });

  after(async () => {
      await testRPC.stop();
  });

  describe('with a started instance, cfg1', () => {
      let nt: NotifierMock
      let subject: Subscriber
      let prometheus: PrometheusMock
      
      before(async () => {
          nt = new NotifierMock();
          cfg.endpoint = testRPC.endpoint();
          prometheus = new PrometheusMock();
          subject = new Subscriber(cfg, nt, prometheus);
          await subject.start();
      });

      describe('transactions', async () => {
          it('should notify transfer events', async () => {
              nt.resetReceivedData();
              const initialScanHeight = prometheus.scanHeight

              await sendFromAliceToBob();

              checkNotifiedTransactionEvent('Alice', TransactionType.Sent, nt)
              checkNotifiedTransactionEvent('Bob', TransactionType.Received, nt)
              prometheus.scanHeight.should.greaterThan(initialScanHeight)
          });
      });

      describe('transferBalancesEventHandler', async () => {
        it('is transferBalances event, our addresses are not involved so a notification is not necessary', async () => {
            const event = await extrinsicMock.generateTransferEvent('//Charlie','//Dave')

            const result = await subject["eventScannerBased"]["_balanceTransferHandler"](event,await createCodecHash())

            result.should.be.true
        });

        it('is transferBalances event 1', async () => {
            const event = await extrinsicMock.generateTransferEvent('//Alice','//Bob')

            const result = await subject["eventScannerBased"]["_balanceTransferHandler"](event,await createCodecHash())

            result.should.be.true
        });

        it('is transferBalances event 2', async () => {
          const event = await extrinsicMock.generateTransferEvent('//Bob','//Alice')

          const result = await subject["eventScannerBased"]["_balanceTransferHandler"](event,await createCodecHash())

          result.should.be.true
        });
      });
  });

  describe('with an started instance, cfg2', () => {
    let nt: NotifierMock
    let prometheus: PrometheusMock
    
    before(async () => {
        nt = new NotifierMock();
        const cfg = cfg2
        cfg.endpoint = testRPC.endpoint();
        prometheus = new PrometheusMock();
        const subject = new Subscriber(cfg, nt, prometheus);
        await subject.start();
    });

    describe('transactions', async () => {
        it('should NOT notify, according to the configuration...', async () => {
            nt.resetReceivedData();
            const initialScanHeight = prometheus.scanHeight

            await sendFromAliceToBob();
            checkNotifiedTransactionEvent('Alice', TransactionType.Sent, nt, false)
            checkNotifiedTransactionEvent('Bob', TransactionType.Received, nt, false)

            await sendFromBobToAlice();
            checkNotifiedTransactionEvent('Bob', TransactionType.Sent, nt, true)
            checkNotifiedTransactionEvent('Alice', TransactionType.Received, nt, true)
            prometheus.scanHeight.should.greaterThan(initialScanHeight)
        });

    });
  });

  describe('with a started instance, cfg1, notifier Broken...', () => {
    let nt: NotifierMockBroken
    let subject: Subscriber
    let prometheus: PrometheusMock
    let stub: sinon.SinonStub
    
    before(async () => {
        nt = new NotifierMockBroken();
        cfg.endpoint = testRPC.endpoint();
        prometheus = new PrometheusMock();
        subject = new Subscriber(cfg, nt, prometheus);
        stub = sinon.stub(process, 'exit');
        await subject.start();
    });

    after(async () => {
      stub.restore()
    });

    describe('transactions', async () => {
      it('prometheus scan height should stuck because of the broken notifier', async () => {
          await sendFromAliceToBob();//this will trigger a scan. We want to show that we're going to get stuck right there.
          const height = prometheus.scanHeight
          await sendFromAliceToBob();//this will eventually trigger or queue a scan. We should be stucked though.
          prometheus.scanHeight.should.equal(height)
          sinon.assert.called(stub)
      });
    });

    describe('transferBalancesEventHandler', async () => {
      it('is transferBalances event, but the notifier is broken', async () => {
          const event = await extrinsicMock.generateTransferEvent('//Alice','//Bob')

          const result = await subject["eventScannerBased"]["_balanceTransferHandler"](event,await createCodecHash())

          result.should.be.false
      });
    });
  });

});
