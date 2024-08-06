import { ApiPromise, WsProvider } from '@polkadot/api';
import { expect } from 'chai';
import { ChainId, EventRecord } from '../../src/types';
import { chainsInfo } from '../../src/constants';
import { extractTransferInfoFromEvent, isTransferEvent } from '../../src/transfers';
import { xcmTests } from './xcmData'
import { balancesTests } from './balancesData'
import { registry } from '../../src/subscriber';


const chains: ChainId[] = ['kusama', 'polkadot'];
const urls = {
  kusama: 'wss://kusama-rpc.dwellir.com',
  polkadot: 'wss://polkadot-rpc.dwellir.com'
};

for (const chain of chains) {

  describe(`Transfers: ${chain}`, (): void => {
    let api: ApiPromise;

    before(async (): Promise<void> => {
      api = await ApiPromise.create({ provider: new WsProvider(urls[chain]), registry, throwOnConnect: true });
    });

    after(async (): Promise<void> => {
      await api.disconnect();
    })

    for (const test of [...balancesTests[chain], ...xcmTests[chain]]) {
      it(test.description, async function() {
        const { block, origin, destination, amount, token, eventIndex } = test;
        const blockHash = await api.rpc.chain.getBlockHash(block);
        const apiAt = await api.at(blockHash);

        await apiAt.query.system.events((records: EventRecord[]) => {
          records.forEach(({ event }, index) => {
            if (index === eventIndex) {
              expect(isTransferEvent(event))
              const transferInfo = extractTransferInfoFromEvent(event, chainsInfo[chain], block);
              expect(transferInfo).to.not.be.null;
              expect(transferInfo.origin.address).to.equal(origin.address);
              expect(transferInfo.origin.chain.toLowerCase()).to.equal(origin.chain.toLowerCase());
              expect(transferInfo.destination.address).to.equal(destination.address);
              expect(transferInfo.destination.chain.toLowerCase()).to.equal(destination.chain.toLowerCase());
              expect(transferInfo.amount).to.equal(amount);
              expect(transferInfo.token).to.equal(token);
              return
            }
          })
        })
      })
    }
  })
}
