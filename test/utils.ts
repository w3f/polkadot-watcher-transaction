import { Balance, Client, Keyring, Keystore } from "@w3f/polkadot-api-client";
import { Logger } from '@w3f/logger';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import BN from 'bn.js';

export const initClient = (endpoint: string, logger?: Logger): Client =>{
  if(logger) return new Client(endpoint, logger)
  else return new Client(endpoint)
}

export const sendFromAToB = async (AUri: string, BUri: string, keyring: Keyring, client: Client, isKeepAliveForced = false): Promise<void> =>{  
  const A = keyring.addFromUri(AUri);
  const B = keyring.addFromUri(BUri);
  const pass = 'pass';
  const AKeypairJson = keyring.toJson(A.address, pass);
  const ksFile = tmp.fileSync();
  fs.writeSync(ksFile.fd, JSON.stringify(AKeypairJson));
  const passFile = tmp.fileSync();
  fs.writeSync(passFile.fd, pass);

  const ks: Keystore = { filePath: ksFile.name, passwordPath: passFile.name };
  const toSend = new BN(10000000000000);

  await client.send(ks, B.address, toSend as Balance, isKeepAliveForced)
}