/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import Extrinsic from '@polkadot/types/extrinsic/Extrinsic';
import { Logger } from '@w3f/logger';
import { Balance, Client, Keyring, Keystore } from '@w3f/polkadot-api-client';
import { TransactionData } from '../src/types';
import { initClient } from './utils';
import { TestPolkadotRPC } from '@w3f/test-utils';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import BN from 'bn.js';

const delay = (ms: number): Promise<void> =>{
  return new Promise( resolve => setTimeout(resolve, ms) );
}
export class NotifierMock {
    private _receivedData: Array<TransactionData> = [];

    newTransaction = async (data: TransactionData): Promise<string> =>{
        this._receivedData.push(data);
        return "";
    }

    get receivedData(): Array<TransactionData> {
        return this._receivedData;
    }

    resetReceivedData = (): void =>{
        this._receivedData = [];
    }
}

export class ExtrinsicMock {
  private transferExtrinsic: Extrinsic
  private nonTransferExtrinsic: Extrinsic
  private serverRPC: TestPolkadotRPC;
  private client: Client;
  private keyring: Keyring;
  
  constructor(private readonly logger: Logger, serverRPC?: TestPolkadotRPC, client?: Client){
    if(serverRPC) this.serverRPC = serverRPC
    else{ 
      this.serverRPC = new TestPolkadotRPC() 
      this.serverRPC.start()
    }
    if(client) this.client = client
    else this.client = initClient(this.serverRPC.endpoint(), this.logger)

    this.keyring = new Keyring({ type: 'sr25519' })
  }

  generateTransferExtrinsic = async (AUri: string, BUri: string): Promise<Extrinsic> =>{
    this.sendFromAToB(AUri,BUri)
    return await this.getAndCheckAndSetExtrinsic(this.transferExtrinsic,'isEqual','balances','transfer')
  }

  generateNonTransferExtrinsic = async (): Promise<Extrinsic> =>{
    return await this.getAndCheckAndSetExtrinsic(this.nonTransferExtrinsic,'isNotEqual','balances','transfer')
  }

  //TODO refactor, the name smells
  private getAndCheckAndSetExtrinsic = async (toBeSet: Extrinsic, checkLogic: string, expectedSection: string, expectedMethod: string): Promise<Extrinsic> =>{
    if(toBeSet) toBeSet = undefined

    const api = await this.client.api()

    const unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {

      const hash = header.hash.toHex()
      const block = await api.rpc.chain.getBlock(hash)
  
      block.block.extrinsics.forEach( async (extrinsic) => {
        const { method: { method, section } } = extrinsic;

        switch (checkLogic) {
          case 'isEqual':
            if(method == expectedMethod && section == expectedSection){
              toBeSet = extrinsic
            }
            break;
          case 'isNotEqual':
            if(method != expectedMethod || section != expectedSection){
              toBeSet = extrinsic
            }
            break;  
        
          default:
            if(method == expectedMethod && section == expectedSection){
              toBeSet = extrinsic
            }
            break;
        }

      })
    })

    while(!toBeSet){
      this.logger.info(`waiting for a ${expectedMethod} Extrinsic (${checkLogic}) to be produced ...`)
      await(delay(3000))
    }
    unsubscribe()
    
    return toBeSet  
  }

  private sendFromAToB = async (AUri: string, BUri: string): Promise<void> =>{  
    const A = this.keyring.addFromUri(AUri);
    const B = this.keyring.addFromUri(BUri);
    const pass = 'pass';
    const AKeypairJson = this.keyring.toJson(A.address, pass);
    const ksFile = tmp.fileSync();
    fs.writeSync(ksFile.fd, JSON.stringify(AKeypairJson));
    const passFile = tmp.fileSync();
    fs.writeSync(passFile.fd, pass);
  
    const ks: Keystore = { filePath: ksFile.name, passwordPath: passFile.name };
    const toSend = new BN(10000000000000);
  
    await this.client.send(ks, B.address, toSend as Balance);
  }
}


