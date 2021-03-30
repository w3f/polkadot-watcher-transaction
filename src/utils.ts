import fs, { WriteStream } from 'fs';
import { Logger } from '@w3f/logger';
import { DeriveAccountRegistration } from '@polkadot/api-derive/accounts/types';
import { Extrinsic, Event, Balance } from '@polkadot/types/interfaces';
import { SubscriptionModuleConfig, TransferInfo } from './types';

export const isDirEmpty = (path: string): boolean =>{
  return fs.readdirSync(path).length === 0
}

export const isDirExistent = (path: string): boolean =>{
  return fs.existsSync(path)
}

export const makeDir = (path: string): void =>{
  fs.mkdirSync(path)
}

export const getFileNames = (sourceDir: string, logger: Logger): string[] =>{

  let names = []
  try {
    names = fs.readdirSync(sourceDir)
  } catch (error) {
    logger.error(error)
  } 
  return names
}

export const deleteFile = (filePath: string, logger: Logger): void =>{
    
  try {
    fs.unlinkSync(filePath)
    logger.info('deleted ' + filePath)
  } catch(err) {
    logger.error(err)
  }
}

export const initFile = (exportDir: string,fileName: string,logger: Logger): WriteStream => {

  const filePath = `${exportDir}/${fileName}`;
  const file = fs.createWriteStream(filePath);
  file.on('error', function(err) { logger.error(err.stack) });

  return file
}

export const closeFile = (file: WriteStream): void=> {
  file.end();
}

export const getDisplayName = (identity: DeriveAccountRegistration): string =>{
  /* TODO
  This code is coming from https://github.com/mariopino/substrate-data-csv/blob/master/utils.js
  and needs to be refactored
  */

  if (
    identity.displayParent &&
    identity.displayParent !== `` &&
    identity.display &&
    identity.display !== ``
  ) {
    return `${identity.displayParent.replace(/\n/g, '')} / ${identity.display.replace(/\n/g, '')}`;
  } else {
    return identity.display || ``;
  }
}

export const asyncForEach = async < T extends {} > (array: Array<T>, callback: (arg0: T, arg1: number, arg2: Array<T>) => void): Promise<void> =>{
  for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
  }
}

export const isTransferBalancesExtrinsic = (extrinsic: Extrinsic): boolean => {
  const { method: { method, section } } = extrinsic;
  return section == 'balances' && ( method == 'transfer' || method == 'transferKeepAlive' )
}

export const isBalanceTransferEvent = (event: Event): boolean => {
  //https://polkadot.js.org/docs/substrate/events#transferaccountid-accountid-balance
  const { method, section } = event;
  return section == 'balances' && method == 'Transfer';
}

export const extractTransferInfoFromEvent = (event: Event): TransferInfo =>{
  const from = event.data[0].toString()
  const to = event.data[1].toString()
  const amount = event.data[2] as unknown as Balance

  return {from,to,amount}
}

export const getSubscriptionNotificationConfig = (config: SubscriptionModuleConfig, configSpecific: SubscriptionModuleConfig): {sent: boolean; received: boolean} => {
  /*
  Specific config is the most prioritized
  */
  const defaultSent = true
  const defaultReceived = true
  const defaultModuleSent = config?.sent == false ? false : defaultSent
  const defaultModuleReceived = config?.received == false ? false : defaultReceived
  const enabledNotifications = {
      sent: configSpecific?.sent == false ? false : defaultModuleSent,
      received: configSpecific?.received == false ? false : defaultModuleReceived
  }
  return enabledNotifications
}

export const delayFunction = (ms: number, fn: () => void): Promise<void> =>{
  return new Promise( resolve => setTimeout( () => { fn(); resolve;}, ms) );
}

export const delay = (ms: number): Promise<void> =>{
  return new Promise( resolve => setTimeout(resolve, ms) );
}