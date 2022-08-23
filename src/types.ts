import { Balance } from '@polkadot/types/interfaces';

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
  subscriptions: Array<Subscribable>;
  modules?: {
    transferEventScanner?: SubscriptionModuleConfig;
  };
}

export interface MatrixbotConfig {
  endpoint: string;
  strategy?: "TBD" | "Default";
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
}

export interface TransferInfo {
  from: string;
  to: string;
  amount: Balance;
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
}
