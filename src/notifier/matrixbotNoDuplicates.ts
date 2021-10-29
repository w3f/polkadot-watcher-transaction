import { Logger } from '@w3f/logger';
import {
    TransactionData,
    MatrixbotMsg,
} from '../types';
import { Notifier } from './INotifier';
import { Matrixbot } from './matrixbot';

/*
This implementation remove identical messages present in a
configurable noDuplicatesWindow time window 
*/
export class MatrixbotNoDuplicates extends Matrixbot implements Notifier {
  private _storePending = new Set<string>();
  private _storeToBeSent = new Set<string>();
  private timer: NodeJS.Timeout;

  constructor(endpoint: string, private readonly noDuplicatesWindow: number, logger: Logger) {
    super(endpoint, logger);
    this._setInterval()
  }

  private _setInterval = (): void => {
    this.timer = setInterval(this._sendAll,this.noDuplicatesWindow)
  }

  private _restartInterval = (): void => {
    clearInterval(this.timer)
    this._setInterval()
  }

  newTransfer = async (data: TransactionData): Promise<string> =>{
    const json = this._transferMsg(data);
    this._add(json)
    return JSON.stringify(json)
  }

  newBalanceChange = async (data: TransactionData): Promise<string> =>{
    const json = this._balanceChangeMsg(data);
    this._add(json)
    return JSON.stringify(json)
  }

  newTransaction = async (data: TransactionData): Promise<string> =>{
    const json = this._transactionMsg(data);
    this._add(json)
    return JSON.stringify(json)
}

  _sendAll = async (): Promise<void> => {
    if(this._storePending.size != 0){
      this._filterMsgs()
      this._storeToBeSent.forEach(msg => this._send(JSON.parse(msg) as MatrixbotMsg))
    }
  }

  _add = (val: MatrixbotMsg): void => {
    const msg = JSON.stringify(val)
    this._restartInterval()
    this._storePending.add(msg)
  }

  _filterMsgs = (): void => {
    this._storeToBeSent.clear()

    //first priority
    this._filterTransferMsgs()

    this._filterBalanceChangeMsgs()
  }

  _filterTransferMsgs = (): void => {
    this._storePending.forEach(candidateStringMsg => {
      const candidateMatrixMsg = JSON.parse(candidateStringMsg) as MatrixbotMsg
      const candidateAlertname = candidateMatrixMsg.alerts[0].labels.alertname
      if(candidateAlertname == "TransferReceived" || candidateAlertname == "TransferSent"){
        this._storeToBeSent.add(candidateStringMsg)
        this._storePending.delete(candidateStringMsg)
      }
    })
  }

  _filterBalanceChangeMsgs = (): void => {
    this._storePending.forEach(candidateStringMsg => {
      const candidateMatrixMsg = JSON.parse(candidateStringMsg) as MatrixbotMsg

      let toBeSent = true
      this._storeToBeSent.forEach(testStringMsg => {
        const testMatrixMsg = JSON.parse(testStringMsg) as MatrixbotMsg
        if(this._isBalanceMsgSuperfluous(candidateMatrixMsg,testMatrixMsg))
          toBeSent = false
      })
      if(toBeSent) 
        this._storeToBeSent.add(candidateStringMsg)
      else{
        //TOSEE if is better debug instead info
        this.logger.info(`Suppressing superfluous notification...`)
        this.logger.info(`${candidateStringMsg}`)
      }  

      this._storePending.delete(candidateStringMsg)
    })
  }

  _isBalanceMsgSuperfluous = (candidate: MatrixbotMsg, test: MatrixbotMsg): boolean => {
    const candidateAddress = candidate.alerts[0].annotations.description.match(/\/account\/(.*)\?/)[1]
    const testAddress = test.alerts[0].annotations.description.match(/\/account\/(.*)\?/)[1]
    const candidateAlertname = candidate.alerts[0].labels.alertname
    const testAlertname = test.alerts[0].labels.alertname

    if(candidateAddress == testAddress){
      if(candidateAlertname == "BalanceDecreased" && testAlertname == "TransferSent")
        return true
      if(candidateAlertname == "BalanceIncreased" && testAlertname == "TransferReceived")
        return true
    }
    
    return false
  }
  

}
