import BN from 'bn.js';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import { Client, Keyring, Keystore, Balance } from '@w3f/polkadot-api-client';
import { TestPolkadotRPC } from '@w3f/test-utils';
import { createLogger } from '@w3f/logger';
import { should } from 'chai';

import { Subscriber } from '../src/subscriber';
import {
    NotifierMock,
} from './mocks';
import { TransactionType } from '../src/types';

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

let subject: Subscriber;

async function sendFromAliceToBob(): Promise<void> {
    const alice = keyring.addFromUri('//Alice');
    const bob = keyring.addFromUri('//Bob');

    const pass = 'pass';
    const aliceKeypairJson = keyring.toJson(alice.address, pass);
    const ksFile = tmp.fileSync();
    fs.writeSync(ksFile.fd, JSON.stringify(aliceKeypairJson));
    const passFile = tmp.fileSync();
    fs.writeSync(passFile.fd, pass);

    const ks: Keystore = { filePath: ksFile.name, passwordPath: passFile.name };
    const toSend = new BN(10000000000000);

    const endpoint = testRPC.endpoint();
    const client = new Client(endpoint, logger);

    await client.send(ks, bob.address, toSend as Balance);
}

function checkTransaction(expectedName: string, expectedTxType: TransactionType): void {
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
        await testRPC.start('0.7.33');

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
    });
});
