import { Receipt } from "../types";

const commonSuffixes = ["wholesale", "inc", "llc", "corp", "ltd", "co", "store", "market", "supermarket", "grocery"];
const suffixRegex = new RegExp(`\\b(${commonSuffixes.join("|")})\\b`, "gi");

export const computeReceiptHash = (receipt: Partial<Receipt>): string | undefined => {
    if (!receipt.storeName || !receipt.date || typeof receipt.total !== "number") return undefined;
    const cleanStoreName = receipt.storeName
        .trim()
        .toLowerCase()
        .replace(suffixRegex, "")
        .replace(/[^a-z0-9]/gi, "");
    const cleanDate = receipt.date.trim();
    const cleanTotal = receipt.total.toFixed(2);
    return `${cleanStoreName}-${cleanDate}-${cleanTotal}`;
};
