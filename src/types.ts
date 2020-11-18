import { Balance } from '@polkadot/types/interfaces';

export interface InputConfig {
    logLevel: string;
    port: number;
    endpoint: string;
    subscribe: SubscriberConfig;
    matrixbot: MatrixbotConfig;
}

export interface Subscribable {
  name: string;
  address: string;
}

export interface SubscriberConfig {
  transactions: Array<Subscribable>;
}

export interface MatrixbotConfig {
  endpoint: string;
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
}

export interface InitializedMap {
  [name: string]: boolean;
}

export interface Notifier {
  newTransaction(data: TransactionData): Promise<string>;
  newBalanceChange(data: TransactionData): Promise<string>;
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

