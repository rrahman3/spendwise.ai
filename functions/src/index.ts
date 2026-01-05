import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenAI, Type } from "@google/genai";

admin.initializeApp();
const firestore = admin.firestore();
const receiptsCollection = firestore.collection("receipts");

setGlobalOptions({ region: "us-central1" });

type ReceiptSource = "scan" | "csv" | "manual";
type ReceiptStatus = "processed" | "pending_review";

interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
    category?: string;
    subcategory?: string;
}

interface Receipt {
    id?: string;
    storeName: string;
    date: string;
    total: number;
    items: ReceiptItem[];
    currency: string;
    rawText?: string;
    imageUrl?: string;
    createdAt: number;
    time?: string;
    hash?: string;
    source: ReceiptSource;
    status: ReceiptStatus;
    userId: string;
    originalReceiptId?: string;
}

const generateReceiptHash = (receipt: Partial<Receipt>): string | undefined => {
    if (!receipt.storeName || !receipt.date || typeof receipt.total !== "number") {
        logger.warn("Cannot generate hash for incomplete receipt", receipt);
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

const requireAuth = (request: CallableRequest<unknown>, userIdFromClient?: string): string => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be authenticated to call this function.");
    }
    const resolvedUserId = userIdFromClient ?? request.auth.uid;
    if (resolvedUserId !== request.auth.uid) {
        throw new HttpsError("permission-denied", "User ID mismatch.");
    }
    return resolvedUserId;
};

const toReceipt = (doc: FirebaseFirestore.QueryDocumentSnapshot): Receipt => {
    const data = doc.data() as Receipt;
    return { ...data, id: doc.id };
};

// --- Gemini helpers ---
const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set for Cloud Functions");
    }
    return new GoogleGenAI({ apiKey });
};

const receiptSchema = {
    type: Type.OBJECT,
    properties: {
        storeName: { type: Type.STRING },
        date: { type: Type.STRING },
        time: { type: Type.STRING },
        total: { type: Type.NUMBER },
        currency: { type: Type.STRING },
        source: { type: Type.STRING },
        items: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    price: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    subcategory: { type: Type.STRING },
                },
                required: ["name", "quantity", "price"],
            },
        },
    },
    required: ["storeName", "date", "time", "total", "items", "source"],
} as const;

const csvReceiptArraySchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            storeName: { type: Type.STRING },
            date: { type: Type.STRING },
            total: { type: Type.NUMBER },
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        price: { type: Type.NUMBER },
                    },
                    required: ["name", "quantity", "price"],
                },
            },
            currency: { type: Type.STRING },
            createdAt: { type: Type.NUMBER },
            source: { type: Type.STRING },
        },
        required: ["id", "storeName", "date", "total", "items", "currency", "createdAt", "source"],
    },
} as const;

const corsAllowlist = true;

export const getReceipts = onCall<{ userId?: string }, Promise<{ receipts: Receipt[] }>>(
    { timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist },
    async (request) => {
        const userId = requireAuth(request, request.data?.userId);
        const snapshot = await receiptsCollection.where("userId", "==", userId).get();
        const receipts = snapshot.docs.map(toReceipt).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        return { receipts };
    }
);

export const saveReceipt = onCall<{ userId?: string; receipt?: Omit<Receipt, "id" | "userId"> }, Promise<{ id: string }>>(
    { timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist },
    async (request) => {
        const userId = requireAuth(request, request.data?.userId);
        const receipt = request.data?.receipt;

        if (!receipt?.storeName || !receipt?.date || typeof receipt?.total !== "number") {
            throw new HttpsError("invalid-argument", "Receipt payload is missing required fields.");
        }

        const payload: Omit<Receipt, "id"> = {
            ...receipt,
            userId,
            createdAt: receipt.createdAt ?? Date.now(),
            hash: generateReceiptHash(receipt),
        };

        const docRef = await receiptsCollection.add(payload);
        return { id: docRef.id };
    }
);

export const updateReceipt = onCall<{ userId?: string; receipt?: Partial<Receipt> }, Promise<{ success: true }>>(
    { timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist },
    async (request) => {
        const userId = requireAuth(request, request.data?.userId);
        const receipt = request.data?.receipt;
        if (!receipt?.id) {
            throw new HttpsError("invalid-argument", "Receipt ID is required.");
        }

        const docRef = receiptsCollection.doc(receipt.id);
        const snapshot = await docRef.get();
        if (!snapshot.exists) {
            throw new HttpsError("not-found", "Receipt not found.");
        }
        const current = snapshot.data() as Receipt;
        if (current.userId !== userId) {
            throw new HttpsError("permission-denied", "You can only update your own receipts.");
        }

        const { id, ...dataToUpdate } = receipt;
        const nextHash = generateReceiptHash({ ...current, ...dataToUpdate });
        await docRef.update({ ...dataToUpdate, hash: nextHash });
        return { success: true };
    }
);

export const deleteReceipt = onCall<{ userId?: string; receiptId?: string }, Promise<{ success: true }>>(
    { timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist },
    async (request) => {
        const userId = requireAuth(request, request.data?.userId);
        const receiptId = request.data?.receiptId;
        if (!receiptId) {
            throw new HttpsError("invalid-argument", "receiptId is required.");
        }

        const docRef = receiptsCollection.doc(receiptId);
        const snapshot = await docRef.get();
        if (!snapshot.exists) {
            logger.warn("Delete requested for missing receipt", { receiptId, userId });
            return { success: true }; // Idempotent delete: treat missing as success
        }
        if ((snapshot.data() as Receipt).userId !== userId) {
            throw new HttpsError("permission-denied", "You can only delete your own receipts.");
        }

        await docRef.delete();
        return { success: true };
    }
);

export const checkDuplicate = onCall<{ userId?: string; receipt?: Omit<Receipt, "id" | "userId"> }, Promise<{ receipt: Receipt | null }>>(
    { timeoutSeconds: 30, memory: "256MiB", cors: corsAllowlist },
    async (request) => {
        const userId = requireAuth(request, request.data?.userId);
        const receipt = request.data?.receipt;
        if (!receipt) {
            throw new HttpsError("invalid-argument", "receipt payload is required.");
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
    }
);

export const findAndFlagDuplicates = onCall<{ userId?: string; action?: "flag" | "delete" }, Promise<{ found: number }>>(
    { timeoutSeconds: 120, memory: "512MiB", cors: corsAllowlist },
    async (request) => {
        const userId = requireAuth(request, request.data?.userId);
        const action = (request.data?.action as "flag" | "delete") ?? "flag";

        const snapshot = await receiptsCollection
            .where("userId", "==", userId)
            .where("status", "==", "processed")
            .get();

        const receiptsByHash = new Map<string, Receipt[]>();
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
            if (receipts.length <= 1) continue;
            receipts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            const originalReceipt = receipts[0];

            for (let i = 1; i < receipts.length; i++) {
                const duplicateReceipt = receipts[i];
                const docRef = receiptsCollection.doc(duplicateReceipt.id!);

                if (action === "flag") {
                    batch.update(docRef, {
                        status: "pending_review",
                        originalReceiptId: originalReceipt.id,
                    });
                } else {
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

        logger.info(`Duplicate scan complete`, { action, found, userId });
        return { found };
    }
);

export const backfillHashes = onCall<{ userId?: string }, Promise<{ scanned: number; updated: number }>>(
    { timeoutSeconds: 120, memory: "512MiB", cors: corsAllowlist },
    async (request) => {
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
                batch.update(receiptsCollection.doc(receipt.id!), { hash: newHash });
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

        logger.info("Backfill complete", { scanned, updated, userId });
        return { scanned, updated };
    }
);

export const processReceiptImage = onCall<{ base64Image?: string }, Promise<{ receipt: Partial<Receipt> }>>(
    { timeoutSeconds: 60, memory: "1GiB", cors: corsAllowlist },
    async (request) => {
        if (!request.data?.base64Image) {
            throw new HttpsError("invalid-argument", "base64Image is required.");
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
        const parsed = JSON.parse(text) as Partial<Receipt>;
        return { receipt: parsed };
    }
);

export const processCsv = onCall<{ csvText?: string }, Promise<{ receipts: Receipt[] }>>(
    { timeoutSeconds: 120, memory: "1GiB", cors: corsAllowlist },
    async (request) => {
        if (!request.data?.csvText) {
            throw new HttpsError("invalid-argument", "csvText is required.");
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
        const parsed = JSON.parse(text) as Receipt[];
        return { receipts: parsed };
    }
);

export const chatWithReceipts = onCall<
    { history?: Array<Pick<Receipt, "storeName" | "date" | "total" | "items" | "source">>; question?: string },
    Promise<{ answer: string }>
>(
    { timeoutSeconds: 60, memory: "512MiB", cors: corsAllowlist },
    async (request) => {
        if (!request.data?.question) {
            throw new HttpsError("invalid-argument", "question is required.");
        }
        const history = request.data.history ?? [];
        const client = getGeminiClient();

        const context = JSON.stringify(
            history.map((r) => ({
                store: r.storeName,
                date: r.date,
                total: r.total,
                items: r.items,
                source: r.source,
            }))
        );

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
    }
);
