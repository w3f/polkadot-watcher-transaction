/* eslint-disable @typescript-eslint/interface-name-prefix */

import { ApiPromise } from "@polkadot/api";
import { Logger } from "@w3f/logger";
import { SubscriberConfig } from "../types";
import { MessageQueue } from "../messageQueue";

export interface ISubscriptionModule{
  subscribe(): Promise<void>;
}

export interface SubscriptionModuleConstructorParams {
  api: ApiPromise;
  networkId: string;
  messageQueue: MessageQueue;
  config: SubscriberConfig;
  logger: Logger;
}