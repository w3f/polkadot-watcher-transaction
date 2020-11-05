/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import Extrinsic from '@polkadot/types/extrinsic/Extrinsic';
import { Logger } from '@w3f/logger';
import { Client, Keyring } from '@w3f/polkadot-api-client';
import { TransactionData } from '../src/types';
import { initClient, sendFromAToB } from './utils';
import { TestPolkadotRPC } from '@w3f/test-utils';

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
    sendFromAToB(AUri,BUri,this.keyring,this.client)
    return await this.getAndCheckAndSetExtrinsic('isEqual','balances','transfer')
  }

  generateNonTransferExtrinsic = async (): Promise<Extrinsic> =>{
    return await this.getAndCheckAndSetExtrinsic('isNotEqual','balances','transfer')
  }

  //TODO refactor, the name smells
  private getAndCheckAndSetExtrinsic = async (checkLogic: string, expectedSection: string, expectedMethod: string): Promise<Extrinsic> =>{
    let result: Extrinsic

    const api = await this.client.api()

    const unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {

      const hash = header.hash.toHex()
      const block = await api.rpc.chain.getBlock(hash)
  
      block.block.extrinsics.forEach( async (extrinsic) => {
        const { method: { method, section } } = extrinsic;

        switch (checkLogic) {
          case 'isEqual':
            if(method == expectedMethod && section == expectedSection){
              result = extrinsic
            }
            break;
          case 'isNotEqual':
            if(method != expectedMethod || section != expectedSection){
              result = extrinsic
            }
            break;  
        
          default:
            if(method == expectedMethod && section == expectedSection){
              result = extrinsic
            }
            break;
        }

      })
    })

    while(!result){
      this.logger.info(`waiting for a ${expectedMethod} Extrinsic (${checkLogic}) to be produced ...`)
      await(delay(3000))
    }
    unsubscribe()
    
    return result  
  }

}


