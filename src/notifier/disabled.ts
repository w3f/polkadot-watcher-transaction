import { Logger, LoggerSingleton } from '../logger';

import {
    TransactionData,
} from '../types';
import { Notifier } from './INotifier';


export class Disabled implements Notifier {
    private readonly logger: Logger = LoggerSingleton.getInstance()
    constructor() { }
    newTransfer = async (data: TransactionData): Promise<boolean> =>{
        this.logger.info("Notifier disabled...")
        return true
    }
}
