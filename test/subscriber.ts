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
import { initClient, sendFromAToB  } from './utils';

should();

let keyring: Keyring;

const cfg = {
    logLevel: 'info',
    port: 3000,
    endpoint: 'some_endpoint',
    matrixbot: {
        endpoint: 'some_endpoint'
    },
    subscribe: {
        transactions: [{
            name: 'Alice',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        },
        {
            name: 'Bob',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
        }]
    }
};

const logger = createLogger();
const nt = new NotifierMock();

const testRPC = new TestPolkadotRPC();

const extrinsicMock = new ExtrinsicMock(logger,testRPC)

let subject: Subscriber;

const sendFromAliceToBob = async (client?: Client): Promise<void> =>{

    if(!client){
      client = initClient(testRPC.endpoint())
    }

    await sendFromAToB('//Alice','//Bob',keyring,client)
}

const checkTransaction = (expectedName: string, expectedTxType: TransactionType): void =>{
    let found = false;

    for (const data of nt.receivedData) {
        if (data.name === expectedName &&
            data.txType === expectedTxType) {
            found = true;
            break;
        }
    }
    found.should.be.true;
}

describe('Subscriber', () => {
    before(async () => {
        await testRPC.start();

        keyring = new Keyring({ type: 'sr25519' });

        cfg.endpoint = testRPC.endpoint();
        subject = new Subscriber(cfg, nt, logger);
    });

    after(async () => {
        await testRPC.stop();
    });

    describe('with an started instance', () => {
        before(async () => {
            await subject.start();
        });

        describe('transactions', async () => {
            it('should record sent and received transactions', async () => {
                nt.resetReceivedData();

                await sendFromAliceToBob();

                checkTransaction('Alice', TransactionType.Sent);
                checkTransaction('Bob', TransactionType.Received);
            });
        });

        describe('transferBalancesExtrinsicHandler', async () => {
            it('is not transferBalances extrinsic', async () => {
                const extrinsic = await extrinsicMock.generateNonTransferExtrinsic()

                const isNewNotificationTriggered = await subject["_transferBalancesExtrinsicHandler"](extrinsic,extrinsic.hash.toHex())

                isNewNotificationTriggered.should.be.false
            });

            it('is transferBalances extrinsic, but our addresses are not involved', async () => {
                const extrinsic = await extrinsicMock.generateTransferExtrinsic('//Charlie','//Dave')

                const isNewNotificationTriggered = await subject["_transferBalancesExtrinsicHandler"](extrinsic,extrinsic.hash.toHex())

                isNewNotificationTriggered.should.be.false
            });

            it('is transferBalances extrinsic 1', async () => {
                const extrinsic = await extrinsicMock.generateTransferExtrinsic('//Alice','//Bob')

                const isNewNotificationTriggered = await subject["_transferBalancesExtrinsicHandler"](extrinsic,extrinsic.hash.toHex())

                isNewNotificationTriggered.should.be.true
            });

            it('is transferBalances extrinsic 2', async () => {
              const extrinsic = await extrinsicMock.generateTransferExtrinsic('//Bob','//Alice')

              const isNewNotificationTriggered = await subject["_transferBalancesExtrinsicHandler"](extrinsic,extrinsic.hash.toHex())

              isNewNotificationTriggered.should.be.true
            });
        });

        
    });
});
