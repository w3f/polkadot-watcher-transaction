import { ApiPromise} from '@polkadot/api';
import { Logger } from '@w3f/logger';
import readline from 'readline';
import {
    TransactionData, TransactionType, SubscriberConfig, Subscribable
} from '../types';
import { Event, CodecHash } from '@polkadot/types/interfaces';
import { closeFile, delay, extractTransferInfoFromEvent, getFileNames, getSubscriptionNotificationConfig, initReadFileStream, initWriteFileStream, isBalanceTransferEvent, isDirEmpty, isDirExistent, makeDir, setIntervalFunction } from '../utils';
import { formatBalance } from '@polkadot/util/format/formatBalance'
import { ISubscriptionModule, SubscriptionModuleConstructorParams } from './ISubscribscriptionModule';
import { Notifier } from '../notifier/INotifier';
import { ScanInterval } from '../constants';

export class EventScannerBased implements ISubscriptionModule{

    private subscriptions = new Map<string,Subscribable>()
    private readonly api: ApiPromise
    private readonly networkId: string
    private readonly notifier: Notifier
    private readonly config: SubscriberConfig
    private readonly logger: Logger
    private readonly scanInterval: number = ScanInterval
    private dataDir: string;
    private dataFileName = "lastChecked.txt"
    private isScanOngoing = false //lock for concurrency
    private isNewScanRequired = false
    
    constructor(params: SubscriptionModuleConstructorParams) {
      this.api = params.api
      this.networkId = params.networkId
      this.notifier = params.notifier
      this.config = params.config
      this.logger = params.logger
      this.dataDir = this.config.modules.transferEventScanner.dataDir
      this.scanInterval = this.config.modules.transferEventScanner.scanInterval
      
      this._initSubscriptions()
    }

    private _initSubscriptions = (): void => {
      for (const subscription of this.config.subscriptions) {
        this.subscriptions.set(subscription.address,subscription)
      }
    }

    public subscribe = async (): Promise<void> => {

      await this._initDataDir()

      await this._handleEventsSubscriptions() // scan immediately after a event detection
      this.logger.info(`Event Scanner Based Module subscribed...`)

      this._requestNewScan() //first scan after a restart

      setIntervalFunction(this.scanInterval,this._requestNewScan) //scheduled scans (i.e. every x minutes)
    }

    private _initDataDir = async (): Promise<void> =>{
      if ( ! isDirExistent(this.dataDir) ) {
        makeDir(this.dataDir)
      }

      if( isDirEmpty(this.dataDir) || !getFileNames(this.dataDir,this.logger).includes(this.dataFileName) || ! await this._getLastCheckedBlock()){
        const file = initWriteFileStream(this.dataDir,this.dataFileName,this.logger)
        file.write(`${(await this.api.rpc.chain.getHeader()).number.unwrap().toNumber()}`) //init with current block header
        await closeFile(file)
      }
    }

    private _handleEventsSubscriptions = async (): Promise<void> => {
      this.api.query.system.events((events) => {
        events.forEach(async (record) => {
          const { event } = record;
          if(isBalanceTransferEvent(event,this.api)) await this._handleBalanceTransferEvents(event)
        })
      })
    }

    private _handleBalanceTransferEvents = async (event: Event): Promise<void> => {
      const {from,to} = extractTransferInfoFromEvent(event)
      if(this.subscriptions.has(from) || this.subscriptions.has(to)) this._requestNewScan()
    }

    private _requestNewScan = async (): Promise<void> => {
      if(this.isScanOngoing){
        this.isNewScanRequired = true
        this.logger.info(`new scan queued...`)
      }else{
        try {
          await this._scanForTransferEvents()
        } catch (error) {
          this.logger.error(`last SCAN had an issue !: ${JSON.stringify(error)}`)
          this.isNewScanRequired = true
        } finally {
          this.isScanOngoing = false
        }

        if(this.isNewScanRequired){
          this._requestNewScan()
        }
      } 
    }

    private _scanForTransferEvents = async (): Promise<void> => {
      this.isScanOngoing = true
      this.isNewScanRequired = false

      const currentBlockNumber = (await this.api.rpc.chain.getHeader()).number.unwrap().toNumber()
      const lastCheckedBlock = await this._getLastCheckedBlock()
      let result = true // important to decide whether to continue the loop or not
      this.logger.info(`\n*****\nStarting a new SCAN...\nStarting Block: ${lastCheckedBlock+1}\nEnding Block: ${currentBlockNumber}\n*****`)
      for (let blockNumber = lastCheckedBlock + 1; blockNumber <= currentBlockNumber; result == true ? blockNumber++ : {} ){

        // important to decide whether to continue the loop or not
        result = true

        const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber)
        const block = await this.api.rpc.chain.getBlock(blockHash)
        const allRecords = await this.api.query.system.events.at(blockHash);

        for (const [index, { hash }] of block.block.extrinsics.entries()) {
          for (const {event} of allRecords
            .filter(({ phase,event }) => 
              phase.isApplyExtrinsic &&
              phase.asApplyExtrinsic.eq(index) && 
              isBalanceTransferEvent(event,this.api)
            )) {

              let retriesLeft = 3
              do {
                result = await this._balanceTransferHandler(event, hash)
                if(!result){
                  retriesLeft--
                  this.logger.warn(`New retry at block ${blockNumber} !!`)
                  await delay(5000)
                }
                
              } while (!result && retriesLeft > 0);
          }
        }

        if(result){
          this.logger.debug(`Updated lastCheckedBlock to ${blockNumber} !!`)
          result = await this._updateLastCheckedBlock(blockNumber)
        }

        if(!result){
          // better to risk to send them all again (block) than loose one of them
          this.logger.warn(`\n*****\nSCAN had an issue at block ${blockNumber}, exiting...\n*****`)
          throw `SCAN ERROR at block ${blockNumber}`
        }
      }
      
      if(result){
        this.logger.info(`\n*****\nSCAN completed at block ${await this._getLastCheckedBlock()}\n*****`)
      }else{
        throw `SCAN ERROR, something went wrong`
      }
    }

    private _balanceTransferHandler = async (event: Event, extrinsicHash: CodecHash): Promise<boolean> => {
      //this.logger.debug('Balances Transfer Event Detected')
      const {from,to,amount} = extractTransferInfoFromEvent(event)

      let isNewNotificationDelivered = false
      let isNewNotificationNecessary = false

      if(this.subscriptions.has(from)){
        isNewNotificationNecessary = true
        const data: TransactionData = {
          name: this.subscriptions.get(from).name,
          address: from,
          networkId: this.networkId,
          txType: TransactionType.Sent,
          hash: extrinsicHash.toString(),
          amount: formatBalance(amount,{},this.api.registry.chainDecimals[0])
        };

        const notificationConfig = getSubscriptionNotificationConfig(this.config.modules?.transferEventScanner,this.subscriptions.get(from).transferEventScanner)

        if(notificationConfig.sent){
          this.logger.info(`Balances Transfer Event from ${from} detected`)
          isNewNotificationDelivered = await this._notifyNewTransfer(data)
        }
        else{
          isNewNotificationNecessary = false
          this.logger.debug(`Balances Transfer Event from ${from} detected. Notification SUPPRESSED`)
        }
      }

      if(this.subscriptions.has(to)){
        isNewNotificationNecessary = true
        const data: TransactionData = {
          name: this.subscriptions.get(to).name,
          address: to,
          networkId: this.networkId,
          txType: TransactionType.Received,
          hash: extrinsicHash.toString(),
          amount: formatBalance(amount,{},this.api.registry.chainDecimals[0])
        };

        const notificationConfig = getSubscriptionNotificationConfig(this.config.modules?.transferEventScanner,this.subscriptions.get(to).transferEventScanner)
        
        if(notificationConfig.received){
          this.logger.info(`Balances Transfer Event to ${to} detected`)
          isNewNotificationDelivered = await this._notifyNewTransfer(data)
        }
        else{
          isNewNotificationNecessary = false
          this.logger.debug(`Balances Transfer Event to ${to} detected. Notification SUPPRESSED`)
        }
      }
      
      return isNewNotificationDelivered || !isNewNotificationNecessary
    }
    
    private _notifyNewTransfer = async (data: TransactionData): Promise<boolean> => {
      this.logger.debug(`Delegating to the Notifier the New Transfer Event notification...`)
      this.logger.debug(JSON.stringify(data))
      return await this.notifier.newTransfer(data)

      //TODO now it is just a mock
      // await this.notifier.newTransfer(data)
      // return true
    }

    private _getLastCheckedBlock = async (): Promise<number> => {
      const file = initReadFileStream(this.dataDir,this.dataFileName,this.logger)
      const rl = readline.createInterface({
        input: file,
        crlfDelay: Infinity
      });
      
      let lastCheckedBlock: number
      for await (const line of rl) {
        // Each line in input.txt will be successively available here as `line`.
        //console.log(`Line from file: ${line}`);
        lastCheckedBlock = Number.parseInt(line)
      }
      await closeFile(file)

      return lastCheckedBlock
    }

    private _updateLastCheckedBlock = async (blockNumber: number): Promise<boolean> => {
      const file = initWriteFileStream(this.dataDir,this.dataFileName,this.logger)
      const result = file.write(blockNumber.toString())
      await closeFile(file)
      return result
    }

}
