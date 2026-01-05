"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithReceipts = exports.processCsv = exports.processReceiptImage = exports.backfillHashes = exports.findAndFlagDuplicates = exports.checkDuplicate = exports.deleteReceipt = exports.updateReceipt = exports.saveReceipt = exports.getReceipts = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const genai_1 = require("@google/genai");
admin.initializeApp();
const firestore = admin.firestore();
const receiptsCollection = firestore.collection("receipts");
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
const generateReceiptHash = (receipt) => {
    if (!receipt.storeName || !receipt.date || typeof receipt.total !== "number") {
        firebase_functions_1.logger.warn("Cannot generate hash for incomplete receipt", receipt);
        return undefined;
    }
    const commonSuffixes = ["wholesale", "inc", "llc", "corp", "ltd", "co", "store", "market", "supermarket", "grocery"];
    const suffixRegex = new RegExp(`\\b(${commonSuffixes.join("|")})\\b`, "gi");
    const cleanStoreName = receipt.storeName
        .trim()
        .toLowerCase()
        .replace(suffixRegex, "")
        .replace(/[^a-z0-9]/gi, "");
    const cleanDate = receipt.date.trim();
    const cleanTotal = receipt.total.toFixed(2);
    return `${cleanStoreName}-${cleanDate}-${cleanTotal}`;
};
const requireAuth = (request, userIdFromClient) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "You must be authenticated to call this function.");
    }
    const resolvedUserId = userIdFromClient ?? request.auth.uid;
    if (resolvedUserId !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "User ID mismatch.");
    }
    return resolvedUserId;
};
const toReceipt = (doc) => {
    const data = doc.data();
    return { ...data, id: doc.id };
};
// --- Gemini helpers ---
const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set for Cloud Functions");
    }
    return new genai_1.GoogleGenAI({ apiKey });
};
const receiptSchema = {
    type: genai_1.Type.OBJECT,
    properties: {
        storeName: { type: genai_1.Type.STRING },
        date: { type: genai_1.Type.STRING },
        time: { type: genai_1.Type.STRING },
        total: { type: genai_1.Type.NUMBER },
        currency: { type: genai_1.Type.STRING },
        source: { type: genai_1.Type.STRING },
        items: {
            type: genai_1.Type.ARRAY,
            items: {
                type: genai_1.Type.OBJECT,
                properties: {
                    name: { type: genai_1.Type.STRING },
                    quantity: { type: genai_1.Type.NUMBER },
                    price: { type: genai_1.Type.NUMBER },
                    category: { type: genai_1.Type.STRING },
                    subcategory: { type: genai_1.Type.STRING },
                },
                required: ["name", "quantity", "price"],
            },
        },
    },
    required: ["storeName", "date", "time", "total", "items", "source"],
};
const csvReceiptArraySchema = {
    type: genai_1.Type.ARRAY,
    items: {
        type: genai_1.Type.OBJECT,
        properties: {
            id: { type: genai_1.Type.STRING },
            storeName: { type: genai_1.Type.STRING },
            date: { type: genai_1.Type.STRING },
            total: { type: genai_1.Type.NUMBER },
            items: {
                type: genai_1.Type.ARRAY,
                items: {
                    type: genai_1.Type.OBJECT,
                    properties: {
                        name: { type: genai_1.Type.STRING },
                        quantity: { type: genai_1.Type.NUMBER },
                        price: { type: genai_1.Type.NUMBER },
                    },
                    required: ["name", "quantity", "price"],
                },
            },
            currency: { type: genai_1.Type.STRING },
            createdAt: { type: genai_1.Type.NUMBER },
            source: { type: genai_1.Type.STRING },
        },
        required: ["id", "storeName", "date", "total", "items", "currency", "createdAt", "source"],
    },
};
const corsAllowlist = true;
exports.getReceipts = (0, https_1.onCall)({ timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request, request.data?.userId);
    const snapshot = await receiptsCollection.where("userId", "==", userId).get();
    const receipts = snapshot.docs.map(toReceipt).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { receipts };
});
exports.saveReceipt = (0, https_1.onCall)({ timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request, request.data?.userId);
    const receipt = request.data?.receipt;
    if (!receipt?.storeName || !receipt?.date || typeof receipt?.total !== "number") {
        throw new https_1.HttpsError("invalid-argument", "Receipt payload is missing required fields.");
    }
    const payload = {
        ...receipt,
        userId,
        createdAt: receipt.createdAt ?? Date.now(),
        hash: generateReceiptHash(receipt),
    };
    const docRef = await receiptsCollection.add(payload);
    return { id: docRef.id };
});
exports.updateReceipt = (0, https_1.onCall)({ timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request, request.data?.userId);
    const receipt = request.data?.receipt;
    if (!receipt?.id) {
        throw new https_1.HttpsError("invalid-argument", "Receipt ID is required.");
    }
    const docRef = receiptsCollection.doc(receipt.id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
        throw new https_1.HttpsError("not-found", "Receipt not found.");
    }
    const current = snapshot.data();
    if (current.userId !== userId) {
        throw new https_1.HttpsError("permission-denied", "You can only update your own receipts.");
    }
    const { id, ...dataToUpdate } = receipt;
    const nextHash = generateReceiptHash({ ...current, ...dataToUpdate });
    await docRef.update({ ...dataToUpdate, hash: nextHash });
    return { success: true };
});
exports.deleteReceipt = (0, https_1.onCall)({ timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request, request.data?.userId);
    const receiptId = request.data?.receiptId;
    if (!receiptId) {
        throw new https_1.HttpsError("invalid-argument", "receiptId is required.");
    }
    const docRef = receiptsCollection.doc(receiptId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
        firebase_functions_1.logger.warn("Delete requested for missing receipt", { receiptId, userId });
        return { success: true }; // Idempotent delete: treat missing as success
    }
    if (snapshot.data().userId !== userId) {
        throw new https_1.HttpsError("permission-denied", "You can only delete your own receipts.");
    }
    await docRef.delete();
    return { success: true };
});
exports.checkDuplicate = (0, https_1.onCall)({ timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request, request.data?.userId);
    const receipt = request.data?.receipt;
    if (!receipt) {
        throw new https_1.HttpsError("invalid-argument", "receipt payload is required.");
    }
    const hashToCheck = generateReceiptHash(receipt);
    if (!hashToCheck) {
        return { receipt: null };
    }
    const snapshot = await receiptsCollection
        .where("userId", "==", userId)
        .where("hash", "==", hashToCheck)
        .where("status", "==", "processed")
        .limit(1)
        .get();
    if (snapshot.empty) {
        return { receipt: null };
    }
    return { receipt: toReceipt(snapshot.docs[0]) };
});
exports.findAndFlagDuplicates = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "512MiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request, request.data?.userId);
    const action = request.data?.action ?? "flag";
    const snapshot = await receiptsCollection
        .where("userId", "==", userId)
        .where("status", "==", "processed")
        .get();
    const receiptsByHash = new Map();
    snapshot.docs.forEach((doc) => {
        const receipt = toReceipt(doc);
        if (receipt.hash) {
            receiptsByHash.set(receipt.hash, [...(receiptsByHash.get(receipt.hash) ?? []), receipt]);
        }
    });
    let found = 0;
    let batch = firestore.batch();
    let batchSize = 0;
    for (const receipts of receiptsByHash.values()) {
        if (receipts.length <= 1)
            continue;
        receipts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const originalReceipt = receipts[0];
        for (let i = 1; i < receipts.length; i++) {
            const duplicateReceipt = receipts[i];
            const docRef = receiptsCollection.doc(duplicateReceipt.id);
            if (action === "flag") {
                batch.update(docRef, {
                    status: "pending_review",
                    originalReceiptId: originalReceipt.id,
                });
            }
            else {
                batch.delete(docRef);
            }
            found++;
            batchSize++;
            if (batchSize >= 400) {
                await batch.commit();
                batch = firestore.batch();
                batchSize = 0;
            }
        }
    }
    if (batchSize > 0) {
        await batch.commit();
    }
    firebase_functions_1.logger.info(`Duplicate scan complete`, { action, found, userId });
    return { found };
});
exports.backfillHashes = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "512MiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request, request.data?.userId);
    const snapshot = await receiptsCollection.where("userId", "==", userId).get();
    let scanned = 0;
    let updated = 0;
    let batch = firestore.batch();
    let batchSize = 0;
    for (const doc of snapshot.docs) {
        scanned++;
        const receipt = toReceipt(doc);
        const newHash = generateReceiptHash(receipt);
        if (receipt.hash !== newHash) {
            batch.update(receiptsCollection.doc(receipt.id), { hash: newHash });
            updated++;
            batchSize++;
        }
        if (batchSize >= 400) {
            await batch.commit();
            batch = firestore.batch();
            batchSize = 0;
        }
    }
    if (batchSize > 0) {
        await batch.commit();
    }
    firebase_functions_1.logger.info("Backfill complete", { scanned, updated, userId });
    return { scanned, updated };
});
exports.processReceiptImage = (0, https_1.onCall)({ timeoutSeconds: 60, memory: "1GiB", cors: corsAllowlist }, async (request) => {
    if (!request.data?.base64Image) {
        throw new https_1.HttpsError("invalid-argument", "base64Image is required.");
    }
    const client = getGeminiClient();
    const prompt = `You are a world-class financial auditor. Extract data from this receipt with surgical precision.

FIELD INSTRUCTIONS:
1. type: 'purchase' or 'refund'.
2. storeName: The trade name of the merchant.
3. items: Array of objects. For each item:
   - name: Descriptive product name.
   - quantity: Number of units.
   - price: THE UNIT PRICE (Price for exactly ONE unit).
   - lineTotal: The total cost for that line (qty * unit price).
   - category: High-level group (e.g., Groceries, Dining, Electronics, Health, Apparel, Home, fee).
   - subcategory: Specific type (e.g., Dairy, Produce, Fast Food, Pharmacy, tax 1, tax 2).
4. source: scan
5. date: The date of the purchase format YYYY-MM-DD.
6. time: The time of the purchase HH:MM:SS.

TAX EXTRACTION RULES:
- Identify all Taxes (Sales Tax, VAT, GST, etc.) as separate items in the 'items' array.
- For Tax items:
  - category: Must be 'fee'.
  - subcategory: Use 'tax 1' for standard rates (e.g., ~6-8% general tax). Use 'tax 2' for reduced rates (e.g., ~1-2% grocery/essential tax).
  - quantity: 1.
  - price: The total tax amount for that rate.

CRITICAL MATH LOGIC:
- If a receipt shows "2 @ 5.00 ... 10.00", the 'price' is 5.00 and 'quantity' is 2.
- If it ONLY shows "2 x MILK ... 12.00", you MUST divide 12 by 2 and set 'price' to 6.00.
- DO NOT put the total line cost in the 'price' field if quantity is > 1.

INTELLIGENT CATEGORIZATION:
- Use the Store Name and Item Name to determine the most logical Category and Subcategory. 
- Be specific. "Grocery > Produce" is better than just "Food".

Return strictly valid JSON.`;
    const result = await client.models.generateContent({
        model: "models/gemini-2.0-flash-exp",
        contents: [
            {
                role: "user",
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: request.data.base64Image } },
                    { text: prompt },
                ],
            },
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: receiptSchema,
        },
    });
    const text = result.text || "{}";
    const parsed = JSON.parse(text);
    return { receipt: parsed };
});
exports.processCsv = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "1GiB", cors: corsAllowlist }, async (request) => {
    if (!request.data?.csvText) {
        throw new https_1.HttpsError("invalid-argument", "csvText is required.");
    }
    const client = getGeminiClient();
    const promptTemplate = `
Please process the following CSV data and convert it into a JSON array of receipt objects.
The CSV format uses 'RH' for a receipt header and 'RI' for a receipt item.

The final JSON must follow this structure:
[
  {
    "id": "string",
    "storeName": "string",
    "date": "string",
    "total": "number",
    "items": [
      {
        "name": "string",
        "quantity": "number",
        "price": "number"
      }
    ],
    "currency": "string",
    "createdAt": "number",
    "source": "csv"
  }
]

- Each 'RH' line marks the beginning of a new receipt.
- The lines immediately following an 'RH' line are the 'RI' (items) for that receipt.
- Generate a unique ID for each receipt.
- Set the 'createdAt' field to the current Unix timestamp in milliseconds.
- The 'source' field must always be set to 'csv'.
`;
    const result = await client.models.generateContent({
        model: "models/gemini-2.0-flash-exp",
        contents: [{ role: "user", parts: [{ text: promptTemplate }, { text: request.data.csvText }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: csvReceiptArraySchema,
        },
    });
    const text = result.text || "[]";
    const parsed = JSON.parse(text);
    return { receipts: parsed };
});
exports.chatWithReceipts = (0, https_1.onCall)({ timeoutSeconds: 60, memory: "512MiB", cors: corsAllowlist }, async (request) => {
    if (!request.data?.question) {
        throw new https_1.HttpsError("invalid-argument", "question is required.");
    }
    const history = request.data.history ?? [];
    const client = getGeminiClient();
    const context = JSON.stringify(history.map((r) => ({
        store: r.storeName,
        date: r.date,
        total: r.total,
        items: r.items,
        source: r.source,
    })));
    const systemPrompt = `You are a professional financial assistant. 
You have access to the user's receipt history: ${context}.
Each receipt has a 'source' field ('scan', 'csv', or 'manual').
Answer the user's questions accurately based ONLY on this history. 
If they ask about trends, summarize them. If they ask about specific items, find them.
Be concise and helpful. Use markdown formatting.`;
    const result = await client.models.generateContent({
        model: "models/gemini-2.0-flash-exp",
        contents: [
            { role: "user", parts: [{ text: systemPrompt }, { text: request.data.question }] },
        ],
        config: {
            temperature: 0.7,
        },
    });
    const text = result.text || "I couldn't process that question. Please try again.";
    return { answer: text };
});
