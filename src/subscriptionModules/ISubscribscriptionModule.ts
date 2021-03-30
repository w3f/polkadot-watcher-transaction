/* eslint-disable @typescript-eslint/interface-name-prefix */

import { ApiPromise } from "@polkadot/api";
import { Logger } from "@w3f/logger";
import { Notifier, SubscriberConfig } from "../types";

export interface ISubscriptionModule{
  subscribe(): Promise<void>;
}

export interface SubscriptionModuleConstructorParams {
  api: ApiPromise;
  networkId: string;
  notifier: Notifier;
  config: SubscriberConfig;
  logger: Logger;
}