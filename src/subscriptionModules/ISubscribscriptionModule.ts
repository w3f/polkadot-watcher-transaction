/* eslint-disable @typescript-eslint/interface-name-prefix */

import { ApiPromise } from "@polkadot/api";
import { Notifier } from "../notifier/INotifier";
import { SubscriberConfig } from "../types";

export interface ISubscriptionModule{
  subscribe(): Promise<void>;
}

export interface SubscriptionModuleConstructorParams {
  api: ApiPromise;
  networkId: string;
  notifier: Notifier;
  config: SubscriberConfig;
}