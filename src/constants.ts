import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';

export const ZeroBN = new BN(0);
export const ZeroBalance = ZeroBN as Balance;
export const scanIntervalMillis = 300000 //5 minutes
export const retriesBeforeLeave = 5
export const delayBeforeRetryMillis = 5000 //5 seconds
export const dataFileName = "lastChecked.txt"
