/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Logger } from '@w3f/logger';
import { Client, Keyring } from '@w3f/polkadot-api-client';
import { Notifier, TransactionData } from '../src/types';
import { initClient, sendFromAToB } from './utils';
import { TestPolkadotRPC } from '@w3f/test-utils';
import { Extrinsic } from '@polkadot/types/interfaces';

const delay = (ms: number): Promise<void> =>{
  return new Promise( resolve => setTimeout(resolve, ms) );
}
export class NotifierMock implements Notifier{
    private _receivedTransactions: Array<TransactionData> = [];
    private _receivedBalanceChanges: Array<TransactionData> = [];
    private _receivedTransferEvent: Array<TransactionData> = [];

    get receivedTransactions(): Array<TransactionData> {
        return this._receivedTransactions;
    }

    get receivedBalanceChanges(): Array<TransactionData> {
      return this._receivedBalanceChanges;
    }

    newTransaction = async (data: TransactionData): Promise<string> =>{
        this._receivedTransactions.push(data);
        return "";
    }

    newBalanceChange = async (data: TransactionData): Promise<string> =>{
      this._receivedBalanceChanges.push(data);
      return "";
    }

    newTransfer = async (data: TransactionData): Promise<string> =>{
      this._receivedTransferEvent.push(data);
      return "";
    }

    resetReceivedData = (): void =>{
        this._receivedTransactions = [];
        this._receivedBalanceChanges = [];
        this._receivedTransferEvent = [];
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
    sendFromAToB(AUri,BUri,this.keyring,this.client,true)
    return await this.getAndCheckAndSetExtrinsic('isEqual','balances','transferKeepAlive')
  }

  generateNonTransferExtrinsic = async (): Promise<Extrinsic> =>{
    return await this.getAndCheckAndSetExtrinsic('isNotEqual','balances','transferKeepAlive')
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
    await(delay(3000))
    unsubscribe()
    
    return result  
  }

}


