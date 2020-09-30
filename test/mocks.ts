/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { TransactionData } from '../src/types';

export class NotifierMock {
    private _receivedData: Array<TransactionData> = [];

    async newTransaction(data: TransactionData): Promise<string> {
        this._receivedData.push(data);
        return "";
    }

    get receivedData(): Array<TransactionData> {
        return this._receivedData;
    }

    resetReceivedData(): void {
        this._receivedData = [];
    }
}
