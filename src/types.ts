import '@polkadot/api-augment/polkadot';
import { Balance, Event, CodecHash, EventRecord } from '@polkadot/types/interfaces';
import { DeriveAccountRegistration } from '@polkadot/api-derive/accounts/types';
import { StagingXcmV4Location, StagingXcmV4Xcm, StagingXcmV4Asset } from '@polkadot/types/lookup';
import { TypeRegistry } from '@polkadot/types';


export type ChainId = 'polkadot' | 'kusama'

export { StagingXcmV4Location, StagingXcmV4Xcm, StagingXcmV4Asset, Balance, Event, EventRecord, CodecHash, DeriveAccountRegistration, TypeRegistry }

export interface ChainInfo {
  id: ChainId;
  decimals: number[];
  tokens: string[];
  SS58: number;
}

export interface BalancesTransferEvent {
  origin: string;
  destination: string;
  amount: Balance;
}

export interface XcmSentEvent {
  origin: StagingXcmV4Location;
  destination: StagingXcmV4Location;
  message: StagingXcmV4Xcm;
}

export interface InputConfig {
    logLevel: string;
    port: number;
    endpoint: string;
    environment: string;
    subscriber: SubscriberConfig;
    matrixbot: MatrixbotConfig;
}

export interface Subscribable {
  name: string;
  address: string;
  transferEventScanner?: SubscriptionModuleConfig;
  threshold?: number;
  thresholdCountReserved?: boolean; 
}

export interface SubscriptionModuleConfig {
  enabled?: boolean;
  startFromBlock?: number;
  sent?: boolean;
  received?: boolean;
  dataDir?: string;
  scanIntervalMillis?: number;
  retriesBeforeLeave?: number;
  delayBeforeRetryMillis?: number;
}

export interface SubscriberConfig {
  subscriptions?: Array<Subscribable>;
  subscriptionsFromGit?: {
    enabled: boolean;
    targets: Array<{
      platform: string;
      private: {
          enabled: boolean;
          apiToken: string;
      };
      network?: string;
      url: string;
    }>;
  };
  modules?: {
    transferEventScanner?: SubscriptionModuleConfig;
    balanceBelowThreshold?: {
      enabled: boolean;
      threshold: number;
    };
  };
}

export interface MatrixbotConfig {
  enabled: boolean;
  endpoint?: string;
  strategy?: "default";
  noDuplicatesWindow?: number;
}

export interface FreeBalance {
  [name: string]: Balance;
}

export enum TransactionType {
  Received,
  Sent
}

export interface TransactionData extends Subscribable {
  txType?: TransactionType;
  networkId: string;
  hash?: string;
  amount?: string;
  token?: string;
}

export interface TransferInfo {
  origin: {
    address: string;
    chain: string;
  };
  destination: {
    address: string;
    chain: string;
  };
  token: string;
  amount: string;
}

export interface InitializedMap {
  [name: string]: boolean;
}

interface LabelMap {
  alertname: string;
  severity: string;
}

interface Annotation {
  description: string;
}

interface Alert {
  status: string;
  labels: LabelMap;
  annotations: Annotation;
}

export interface MatrixbotMsg {
  receiver: string;
  status: string;
  alerts: Array<Alert>;
  version: string;
}

export interface PromClient {
  updateScanHeight(network: string, blockNumber: number): void;
  updateDesiredBalance(network: string, name: string, address: string, balance?: number): void;
  updateCurrentBalance(network: string, name: string, address: string, balance: number): void;
}
