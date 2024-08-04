import { ApiPromise, WsProvider } from '@polkadot/api';
import { expect } from 'chai';
import { ChainId, EventRecord } from '../../src/types';
import { extractTransferInfoFromEvent, isTransferEvent, registry } from '../../src/transfers';
import { xcmTests } from './xcmData'
import { balancesTests } from './balancesData'


const chains: ChainId[] = ['kusama', 'polkadot'];
const chainInfos = {
  kusama: { id: 'kusama' as ChainId, decimals: [12], tokens: ['KSM'], SS58: 2 },
  polkadot: { id: 'polkadot' as ChainId, decimals: [10], tokens: ['DOT'], SS58: 0 }
}
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
        const { block, origin, destination, amount, eventIndex } = test;
        const blockHash = await api.rpc.chain.getBlockHash(block);
        const apiAt = await api.at(blockHash);

        await apiAt.query.system.events((records: EventRecord[]) => {
          records.forEach(({ event }, index) => {
            if (index === eventIndex) {
              expect(isTransferEvent(event))
              const transferInfo = extractTransferInfoFromEvent(event, chainInfos[chain], block);
              expect(transferInfo).to.not.be.null;
              expect(transferInfo.from).to.equal(origin.address);
              expect(transferInfo.to).to.equal(destination.address);
              expect(transferInfo.amount).to.equal(amount);
              return
            }
          })
        })
      })
    }
  })
}
