
import { collection, getDocs, query, where, limit, addDoc, updateDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Receipt } from "../types";

// Centralized hash generation. This creates a stable, unique "fingerprint" for each receipt.
const generateReceiptHash = (receipt: Partial<Receipt>): string | null => {
    if (!receipt.storeName || !receipt.date || typeof receipt.total === 'undefined') {
        console.warn("Cannot generate a stable hash for an incomplete receipt.", receipt);
        return null;
    }
    const commonSuffixes = ['wholesale', 'inc', 'llc', 'corp', 'ltd', 'co', 'store', 'market', 'supermarket', 'grocery'];
    const suffixRegex = new RegExp(`\\b(${commonSuffixes.join('|')})\\b`, 'gi');
    const cleanStoreName = receipt.storeName
        .trim()
        .toLowerCase()
        .replace(suffixRegex, '')
        .replace(/[^a-z0-9]/gi, '');
    const cleanDate = receipt.date.trim();
    const cleanTotal = receipt.total.toFixed(2);

    return `${cleanStoreName}-${cleanDate}-${cleanTotal}`;
};

export const dbService = {
    getReceipts: async (userId: string): Promise<Receipt[]> => {
        const q = query(collection(db, "receipts"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const receipts: Receipt[] = [];
        snapshot.forEach(doc => {
            receipts.push({ ...doc.data(), id: doc.id } as Receipt);
        });
        return receipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    saveReceipt: async (userId: string, receipt: Omit<Receipt, 'id'>): Promise<string> => {
        const docRef = await addDoc(collection(db, "receipts"), { 
            ...receipt, 
            userId, 
            hash: generateReceiptHash(receipt),
            createdAt: Date.now()
        });
        return docRef.id;
    },

    updateReceipt: async (userId: string, receipt: Partial<Receipt>): Promise<void> => {
        if (!receipt.id) throw new Error("Receipt ID is required for updates.");
        const receiptRef = doc(db, "receipts", receipt.id);
        const { id, ...dataToUpdate } = receipt;
        await updateDoc(receiptRef, { ...dataToUpdate, hash: generateReceiptHash(dataToUpdate) });
    },

    deleteReceipt: async (userId: string, receiptId: string): Promise<void> => {
        const receiptRef = doc(db, "receipts", receiptId);
        await deleteDoc(receiptRef);
    },

    checkDuplicate: async (userId: string, receipt: Omit<Receipt, 'id'>): Promise<Receipt | null> => {
        try {
            const hashToCheck = generateReceiptHash(receipt);
            if (hashToCheck === null) return null;

            const q = query(
                collection(db, "receipts"),
                where("userId", "==", userId),
                where("hash", "==", hashToCheck),
                where("status", "==", "processed"),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }
            const doc = querySnapshot.docs[0];
            return { ...doc.data(), id: doc.id } as Receipt;

        } catch (error) {
            console.error("Error checking for duplicate:", error);
            return null;
        }
    },

    findAndFlagDuplicates: async (userId: string, action: 'flag' | 'delete'): Promise<{ found: number }> => {
        let found = 0;
        const q = query(collection(db, "receipts"), where("userId", "==", userId), where("status", "==", "processed"));
        const snapshot = await getDocs(q);
        const receiptsByHash = new Map<string, Receipt[]>();

        snapshot.forEach(document => {
            const receipt = { ...document.data(), id: document.id } as Receipt;
            if (receipt.hash) {
                if (!receiptsByHash.has(receipt.hash)) {
                    receiptsByHash.set(receipt.hash, []);
                }
                receiptsByHash.get(receipt.hash)!.push(receipt);
            }
        });

        let batch = writeBatch(db);
        let batchSize = 0;

        for (const receipts of receiptsByHash.values()) {
            if (receipts.length > 1) {
                receipts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                const originalReceipt = receipts[0];

                for (let i = 1; i < receipts.length; i++) {
                    const duplicateReceipt = receipts[i];
                    const docRef = doc(db, "receipts", duplicateReceipt.id);

                    if (action === 'flag') {
                        batch.update(docRef, {
                            status: 'pending_review',
                            originalReceiptId: originalReceipt.id
                        });
                    } else { 
                        batch.delete(docRef);
                    }
                    found++;
                    batchSize++;

                    if (batchSize >= 400) {
                        await batch.commit();
                        batch = writeBatch(db);
                        batchSize = 0;
                    }
                }
            }
        }

        if (batchSize > 0) {
            await batch.commit();
        }

        console.log(`Duplicate find complete. Action: ${action}. Found: ${found}.`);
        return { found };
    },

    backfillHashes: async (userId: string): Promise<{ scanned: number, updated: number }> => {
        let scanned = 0;
        let updated = 0;
        const q = query(collection(db, "receipts"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        let batch = writeBatch(db);
        let batchSize = 0;

        for (const document of snapshot.docs) {
            scanned++;
            const receipt = document.data() as Receipt;
            const newHash = generateReceiptHash(receipt);

            if (receipt.hash !== newHash) {
                const docRef = doc(db, "receipts", document.id);
                batch.update(docRef, { hash: newHash });
                updated++;
                batchSize++;
            }
            
            if (batchSize >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchSize = 0;
            }
        }

        if (batchSize > 0) {
            await batch.commit();
        }

        console.log(`Backfill complete. Scanned: ${scanned}, Updated: ${updated}`);
        return { scanned, updated };
    },
};