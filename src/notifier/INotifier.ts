import { TransactionData } from "../types";

export interface Notifier {
  newTransaction(data: TransactionData): Promise<string>;
  newBalanceChange(data: TransactionData): Promise<string>;
  newTransfer(data: TransactionData): Promise<string>;
}