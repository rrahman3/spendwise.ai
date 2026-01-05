import { httpsCallable } from "firebase/functions";
import { functions } from "./firebaseConfig";
import { Receipt } from "../types";

const callFunction = async <T>(name: string, data: Record<string, unknown>): Promise<T> => {
  const callable = httpsCallable(functions, name);
  const result = await callable(data);
  return result.data as T;
};

export const extractReceiptData = async (base64Image: string): Promise<Partial<Receipt>> => {
  const data = await callFunction<{ receipt: Partial<Receipt> }>("processReceiptImage", { base64Image });
  return data.receipt;
};

export const extractReceiptsFromCsv = async (
  csvText: string,
  onProgress: (progress: number) => void
): Promise<Receipt[]> => {
  onProgress(0);
  const data = await callFunction<{ receipts: Receipt[] }>("processCsv", { csvText });
  onProgress(100);
  return data.receipts;
};

export const chatWithHistory = async (history: Receipt[], userQuestion: string): Promise<string> => {
  const data = await callFunction<{ answer: string }>("chatWithReceipts", {
    history,
    question: userQuestion,
  });
  return data.answer;
};
