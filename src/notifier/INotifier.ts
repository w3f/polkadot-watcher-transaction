import { TransactionData } from "../types";

export interface Notifier {
  newTransfer(data: TransactionData): Promise<boolean>;
}