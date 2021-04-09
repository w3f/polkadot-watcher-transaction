import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';

export const ZeroBN = new BN(0);
export const ZeroBalance = ZeroBN as Balance;
export const CacheDelay = 3000 //3 seconds
export const MessageDelay = 1000 //1 second
export const NoDuplicatesWindow = 4000 //4 second
