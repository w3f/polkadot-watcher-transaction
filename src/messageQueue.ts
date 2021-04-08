import { Logger } from "@w3f/logger";
import { MessageDelay } from "./constants";
import { Notifier, TransactionData } from "./types";

type MessageType = "Transfer" | "BalanceChange" | "Extrinsic"

interface MessageQueueData {
  data: TransactionData;
  messageType: MessageType;
}

export class MessageQueue {
  private _store: MessageQueueData[] = [];

  constructor(private readonly notifier: Notifier, private readonly logger: Logger){
    /**** Matrixbot ... ***/
    setInterval(this._notifyMessage,MessageDelay)
    /************************************************************/
  }

  _notifyMessage = async (): Promise<void> => {
    if(this._store.length != 0){
      const message = this.pop()
      switch (message.messageType) {
        case "Transfer":
          try {
            this.logger.info(`Sending New Transfer Event notification...`)
            this.logger.debug(JSON.stringify(message.data))
            await this.notifier.newTransfer(message.data);
          } catch (e) {
              this.logger.error(`could not notify Transfer Event: ${e.message}`);
          }
          break;
        case "BalanceChange":
          try {
            this.logger.info(`Sending New Balance Change notification...`)
            this.logger.debug(JSON.stringify(message.data))
            await this.notifier.newBalanceChange(message.data)
          } catch (e) {
              this.logger.error(`could not notify balance change: ${e.message}`);
          }
          break;  
        case "Extrinsic":
          try {
            this.logger.info(`Sending New Transfer Balance Extrinsic notification...`)
            this.logger.debug(JSON.stringify(message.data))
            await this.notifier.newTransaction(message.data) //TO FIX: name convention
          } catch (e) {
              this.logger.error(`could not notify Extrinsic Block detection: ${e.message}`);
          }
          break;  
        default:
          this.logger.error(`Message Type not recognized...`)
          break;
      }
    }
  }

  push = (val: MessageQueueData): number => {
    return this._store.push(val);
  }

  pushTransfer = (val: TransactionData): number => {
    return this.push({
      data: val,
      messageType: "Transfer"
    });
  } 

  pushBalanceChange = (val: TransactionData): number => {
    return this.push({
      data: val,
      messageType: "BalanceChange"
    });
  } 

  pushExtrinsic = (val: TransactionData): number => {
    return this.push({
      data: val,
      messageType: "Extrinsic"
    });
  } 

  pop = (): MessageQueueData | undefined => {
    return this._store.shift();
  }
}