import { MatrixbotConfig } from "../types";
import { Notifier } from "./INotifier";
import { Matrixbot } from "./matrixbot";

export class NotifierFactory {
  constructor(private readonly cfg: MatrixbotConfig){}
  makeNotifier = (): Notifier => {

    if(this.cfg.strategy == undefined)
      return new Matrixbot(this.cfg.endpoint)

    switch (this.cfg.strategy) {  
      default:
        return new Matrixbot(this.cfg.endpoint)
    }  
  }
}