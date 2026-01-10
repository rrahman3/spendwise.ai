import { Receipt } from "../types";

export const normalizeTotal = (total: number): number => Math.abs(total ?? 0);

export const applyReceiptSign = (amount: number, type?: Receipt["type"]): number => {
    const magnitude = normalizeTotal(amount);
    return (type === "refund" ? -1 : 1) * magnitude;
};

export const getReceiptNetTotal = (receipt: Pick<Receipt, "total" | "type">): number =>
    applyReceiptSign(receipt.total, receipt.type);

export const withNormalizedTotal = <T extends { total: number }>(receipt: T): T => ({
    ...receipt,
    total: normalizeTotal(receipt.total),
});
