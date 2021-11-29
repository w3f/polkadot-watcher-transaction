import { Logger } from "@w3f/logger";
import { MatrixbotConfig } from "../types";
import { Notifier } from "./INotifier";
import { Matrixbot } from "./matrixbot";

export class NotifierFactory {
  constructor(private readonly cfg: MatrixbotConfig, private readonly logger: Logger){}
  makeNotifier = (): Notifier => {

    if(this.cfg.strategy == undefined)
      return new Matrixbot(this.cfg.endpoint,this.logger)

    switch (this.cfg.strategy) {
      case "Default":
        return new Matrixbot(this.cfg.endpoint, this.logger)    
      default:
        return new Matrixbot(this.cfg.endpoint,this.logger)
    }  
  }
}