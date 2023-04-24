import { MatrixbotConfig } from "../types";
import { Notifier } from "./INotifier";
import { Disabled } from "./disabled";
import { Matrixbot } from "./matrixbot";

export class NotifierFactory {
  constructor(private readonly cfg: MatrixbotConfig){}
  makeNotifier = (): Notifier => {

    if(!this.cfg.enabled)
      return new Disabled()

    if(this.cfg.strategy == undefined)
      return new Matrixbot(this.cfg.endpoint) //default

    switch (this.cfg.strategy.trim().toLowerCase()) {  
      default:
        return new Matrixbot(this.cfg.endpoint)
    }  
  }
}