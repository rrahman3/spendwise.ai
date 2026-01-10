
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebaseConfig";
import { Receipt } from "../types";

type ReceiptListResult = { receipts: Receipt[]; nextPageToken: string | null };
type SaveReceiptResult = { id: string };
type DuplicateResult = { receipt: Receipt | null };
type ScanResult = { found: number };
type BackfillResult = { scanned: number; updated: number };

const callFunction = async <T>(name: string, data: Record<string, unknown>): Promise<T> => {
    const callable = httpsCallable(functions, name);
    const result = await callable(data);
    return result.data as T;
};

export const dbService = {
    getReceipts: async (
        userId: string,
        opts?: { pageSize?: number; pageToken?: string }
    ): Promise<ReceiptListResult> => {
        const data = await callFunction<ReceiptListResult>("getReceipts", {
            userId,
            pageSize: opts?.pageSize,
            pageToken: opts?.pageToken,
        });
        return data;
    },

    saveReceipt: async (userId: string, receipt: Omit<Receipt, "id">): Promise<string> => {
        const data = await callFunction<SaveReceiptResult>("saveReceipt", { userId, receipt });
        return data.id;
    },

    updateReceipt: async (userId: string, receipt: Partial<Receipt>): Promise<void> => {
        await callFunction("updateReceipt", { userId, receipt });
    },

    deleteReceipt: async (userId: string, receiptId: string): Promise<void> => {
        await callFunction("deleteReceipt", { userId, receiptId });
    },

    checkDuplicate: async (userId: string, receipt: Omit<Receipt, "id">): Promise<Receipt | null> => {
        const data = await callFunction<DuplicateResult>("checkDuplicate", { userId, receipt });
        return data.receipt;
    },

    findAndFlagDuplicates: async (userId: string, action: "flag" | "delete"): Promise<{ found: number }> => {
        const data = await callFunction<ScanResult>("findAndFlagDuplicates", { userId, action });
        return data;
    },

    backfillHashes: async (userId: string): Promise<{ scanned: number; updated: number }> => {
        const data = await callFunction<BackfillResult>("backfillHashes", { userId });
        return data;
    },
};
