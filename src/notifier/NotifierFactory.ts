import { Logger } from "@w3f/logger";
import { MatrixbotConfig } from "../types";
import { Notifier } from "./INotifier";
import { MatrixbotSerial } from "./matrixbotSerial";

export class NotifierFactory {
  constructor(private readonly cfg: MatrixbotConfig, private readonly logger: Logger){}
  makeNotifier = (): Notifier => {
    // For now NotifierSerial strategy by default
    return new MatrixbotSerial(this.cfg.endpoint,this.logger)
  }
}