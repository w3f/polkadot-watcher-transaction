import { Client } from "@w3f/polkadot-api-client";
import { Logger } from '@w3f/logger';

export const initClient = (endpoint: string, logger?: Logger): Client =>{
  if(logger) return new Client(endpoint, logger)
  else return new Client(endpoint)
}