import { Balance } from '@polkadot/types/interfaces';

export interface InputConfig {
    logLevel: string;
    port: number;
    endpoint: string;
    subscriber: SubscriberConfig;
    matrixbot: MatrixbotConfig;
}

export interface Subscribable {
  name: string;
  address: string;
  transferEvent?: SubscriptionModuleConfig;
  balanceChange?: SubscriptionModuleConfig;
  transferExtrinsic?: SubscriptionModuleConfig;
}

export interface SubscriptionModuleConfig {
  enabled?: boolean;
  sent?: boolean;
  received?: boolean;
}

export interface SubscriberConfig {
  subscriptions: Array<Subscribable>;
  modules?: {
    transferEvent?: SubscriptionModuleConfig;
    balanceChange?: SubscriptionModuleConfig;
    transferExtrinsic?: SubscriptionModuleConfig;
    rewardCheck?: SubscriptionModuleConfig;
  };
}

export interface MatrixbotConfig {
  endpoint: string;
  strategy?: "NoDuplicates" | "Serial" | "Default";
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
  amount?: Balance;
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
