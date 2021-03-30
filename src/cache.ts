import { Logger } from "@w3f/logger"
import { CacheDelay } from "./constants"
import { TransferInfo } from "./types"
import { delayFunction } from "./utils"

export class Cache {

  private ongoingTransferEvents = new Set<string>()

  constructor(private readonly logger: Logger){}

  isTransferEventPresent = (transfer: TransferInfo): boolean => {
    if(this.ongoingTransferEvents.has(JSON.stringify(transfer))){
      this.logger.debug(`Balances Transfer Event already present: ${JSON.stringify(transfer)}`)
      return true
    }
    return false 
  }

  addTransferEvent = async (transfer: TransferInfo): Promise<void> => {
    this.ongoingTransferEvents.add(JSON.stringify(transfer))
    delayFunction(CacheDelay,()=>this._removeTransferEvent(transfer))
  }

  private _removeTransferEvent = (transfer: TransferInfo): void => {
    this.ongoingTransferEvents.delete(JSON.stringify(transfer))
  }


}