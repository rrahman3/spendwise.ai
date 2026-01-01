import { Receipt } from "../types";

import { db } from "./firebaseConfig";
import { collection, query, where, getDocs, setDoc, doc, updateDoc, deleteDoc, limit } from "firebase/firestore";

export const dbService = {
  getReceipts: async (userId: string): Promise<Receipt[]> => {
    try {
      const q = query(collection(db, "receipts"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const receipts: Receipt[] = [];
      querySnapshot.forEach((doc) => {
        // We exclude userId from the returned object to match Receipt type, or we can just cast it
        const data = doc.data() as Receipt & { userId: string };
        const { userId: _, ...receipt } = data; // optional cleanup
        receipts.push(data);
      });
      // Sort by date/createdAt if needed, currently just returning
      return receipts.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Error getting receipts:", error);
      return [];
    }
  },

  saveReceipt: async (userId: string, receipt: Receipt): Promise<void> => {
    try {
      await setDoc(doc(db, "receipts", receipt.id), {
        ...receipt,
        userId
      });
    } catch (error) {
      console.error("Error saving receipt:", error);
      throw error;
    }
  },

  updateReceipt: async (userId: string, updatedReceipt: Receipt): Promise<void> => {
    try {
      const receiptRef = doc(db, "receipts", updatedReceipt.id);
      await updateDoc(receiptRef, {
        ...updatedReceipt,
        userId // Ensure userId stays if we were using 'set' but update is fine
      });
    } catch (error) {
      console.error("Error updating receipt:", error);
      throw error;
    }
  },

  deleteReceipt: async (userId: string, receiptId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, "receipts", receiptId));
    } catch (error) {
      console.error("Error deleting receipt:", error);
      throw error;
    }
  },

  generateReceiptHash: async (receipt: Receipt): Promise<string> => {
    const dataString = `${receipt.storeName}|${receipt.date}|${receipt.time || '00:00:00'}|${receipt.total}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  checkDuplicate: async (userId: string, receipt: Receipt): Promise<boolean> => {
    try {
      if (!receipt.hash) {
        // If hash is missing, try to generate it temporarily for the check
        receipt.hash = await dbService.generateReceiptHash(receipt);
      }

      const q = query(
        collection(db, "receipts"),
        where("userId", "==", userId),
        where("hash", "==", receipt.hash),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking for duplicate:", error);
      return false;
    }
  },

  uploadReceiptImage: async (file: string): Promise<string> => {
    // For now, still returning the base64/url as is. 
    // In a real app, this should upload to Firebase Storage
    return file;
  }
};
