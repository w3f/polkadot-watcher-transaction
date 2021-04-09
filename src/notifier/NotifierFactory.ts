import { Logger } from "@w3f/logger";
import { MatrixbotConfig } from "../types";
import { Notifier } from "./INotifier";
import { MatrixbotSerial } from "./matrixbotSerial";
import { Matrixbot } from "./matrixbot";
import { MatrixbotNoDuplicates } from "./matrixbotNoDuplicates";
import { NoDuplicatesWindow } from "../constants";

export class NotifierFactory {
  constructor(private readonly cfg: MatrixbotConfig, private readonly logger: Logger){}
  makeNotifier = (): Notifier => {

    if(this.cfg.strategy == undefined)
      return new Matrixbot(this.cfg.endpoint,this.logger)

    switch (this.cfg.strategy) {
      case "NoDuplicates": {
        const noDuplicatesWindow = this.cfg.noDuplicatesWindow != undefined ? this.cfg.noDuplicatesWindow : NoDuplicatesWindow 
        return new MatrixbotNoDuplicates(this.cfg.endpoint, noDuplicatesWindow, this.logger)
      }
      case "Serial":
        return new MatrixbotSerial(this.cfg.endpoint, this.logger)  
      case "Default":
        return new Matrixbot(this.cfg.endpoint, this.logger)    
      default:
        return new Matrixbot(this.cfg.endpoint,this.logger)
    }  
  }
}