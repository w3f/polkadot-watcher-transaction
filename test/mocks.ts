/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import '@polkadot/api-augment'; //https://github.com/polkadot-js/api/issues/4450
import { Client, Keyring } from '@w3f/polkadot-api-client';
import { TransactionData } from '../src/types';
import { initClient, sendFromAToB } from './utils';
import { TestPolkadotRPC } from '@w3f/test-utils';
import { delay, isBalanceTransferEvent } from '../src/utils';
import { Event } from '@polkadot/types/interfaces';
import { Notifier } from '../src/notifier/INotifier';
import { PromClient } from "../src/types";
import { Logger, LoggerSingleton } from '../src/logger';

export class NotifierMock implements Notifier{
    private _receivedTransferEvents: Array<TransactionData> = [];

    get receivedTransactionEvents(): Array<TransactionData> {
      return this._receivedTransferEvents;
    }

    newTransfer = async (data: TransactionData): Promise<boolean> =>{
      this._receivedTransferEvents.push(data);
      return true;
    }

    resetReceivedData = (): void =>{
        this._receivedTransferEvents = [];
    }
}

export class NotifierMockBroken implements Notifier{
  newTransfer = async (data: TransactionData): Promise<boolean> =>{
    return false;
  }
}

export class ExtrinsicMock {
  private serverRPC: TestPolkadotRPC;
  private client: Client;
  private keyring: Keyring;
  private readonly logger: Logger = LoggerSingleton.getInstance()
  
  constructor(serverRPC?: TestPolkadotRPC, client?: Client){
    if(serverRPC) this.serverRPC = serverRPC
    else{ 
      this.serverRPC = new TestPolkadotRPC() 
      this.serverRPC.start()
    }
    if(client) this.client = client
    else this.client = initClient(this.serverRPC.endpoint())

    this.keyring = new Keyring({ type: 'sr25519' })
  }

  generateTransferEvent = async (AUri: string, BUri: string): Promise<Event> =>{
    sendFromAToB(AUri,BUri,this.keyring,this.client,true)
    return await this.getEvent()
  }

  private getEvent = async (): Promise<Event> =>{
    let result: Event | null = null

    const api = await this.client.api()

    const unsubscribe = await api.query.system.events((events) => {

      events.forEach(async (record) => {
        const { event } = record;

        if (isBalanceTransferEvent(event,api)) {
          unsubscribe()
          result = event
        }

      })
    })

    while(!result){
      this.logger.info(`waiting for a Transfer Event to be produced ...`)
      await(delay(3000))
    }
    await(delay(3000))
    unsubscribe()
    
    return result  
  }

}


export class PrometheusMock implements PromClient {
  private _scanHeight = 0;

  updateScanHeight = (_network: string, blockNumber: number): void => {
    this._scanHeight = blockNumber
  }
  
  public get scanHeight(): number {
    return this._scanHeight
  }
  
}

