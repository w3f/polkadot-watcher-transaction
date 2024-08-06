import { Balance } from '@polkadot/types/interfaces';
import { ChainId } from './types';
import BN from 'bn.js';

export const ZeroBN = new BN(0);
export const ZeroBalance = ZeroBN as Balance;
export const scanIntervalMillis = 300000 //5 minutes
export const retriesBeforeLeave = 5
export const delayBeforeRetryMillis = 5000 //5 seconds
export const dataFileName = "lastChecked.txt"
export const environment = "production"
export const chainsInfo = {
  kusama: { id: 'kusama' as ChainId, decimals: [12], tokens: ['KSM'], SS58: 2 },
  polkadot: { id: 'polkadot' as ChainId, decimals: [10], tokens: ['DOT'], SS58: 0 },
  development: { id: 'polkadot' as ChainId, decimals: [10], tokens: ['DOT'], SS58: 0 }
}
export const parachainNames = {
  polkadot: {
    "1000": "AssetHub",
    "1001": "Collectives",
    "1002": "BridgeHub",
    "1004": "People",
    "2000": "Acala",
    "2002": "Clover",
    "2004": "Moonbeam",
    "2006": "Astar",
    "2008": "Crust",
    "2012": "Parallel",
    "2013": "Litentry",
    "2025": "SORA",
    "2026": "Nodle",
    "2030": "Bifrost",
    "2031": "Centrifuge",
    "2032": "Interlay",
    "2034": "Hydration",
    "2035": "Phala Network",
    "2037": "Unique Network",
    "2040": "Polkadex",
    "2043": "NeuroWeb",
    "2046": "Darwinia2",
    "2051": "Ajuna",
    "2056": "Aventus",
    "2086": "KILT Protocol",
    "2090": "OAK Network",
    "2092": "Zeitgeist",
    "2093": "Hashed Network",
    "2094": "Pendulum",
    "2104": "Manta",
    "3338": "peaq",
    "3345": "Energy Web X",
    "3346": "Continuum",
    "3369": "Mythos"
  },
  kusama: {
    "1000": "AssetHub",
    "1001": "Collectives",
    "1002": "BridgeHub",
    "1004": "People",
    "1005": "Coretime",
    "2000": "Karura",
    "2001": "Bifrost",
    "2004": "Khala Network",
    "2007": "Shiden",
    "2011": "SORA",
    "2012": "Crust Shadow",
    "2023": "Moonriver",
    "2024": "Genshiro",
    "2048": "Robonomics",
    "2084": "Calamari",
    "2087": "Picasso",
    "2090": "Basilisk",
    "2092": "Kintsugi",
    "2095": "Quartz",
    "2096": "Pioneer",
    "2105": "Crab2",
    "2106": "Litmus",
    "2110": "Mangata",
    "2113": "Kabocha",
    "2114": "Turing Network",
    "2119": "Bajun Network",
    "2239": "Acurast",
    "2241": "krest",
    "3339": "Curio",
    "3344": "Xode"
  }
};