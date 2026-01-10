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
exports.chatWithReceipts = exports.processCsv = exports.processReceiptImage = exports.migrateAllImagesToStorageHttp = exports.migrateAllImagesToStorage = exports.migrateImagesToStorage = exports.backfillHashes = exports.findAndFlagDuplicates = exports.checkDuplicate = exports.deleteReceipt = exports.updateReceipt = exports.saveReceipt = exports.getReceipts = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const genai_1 = require("@google/genai");
admin.initializeApp();
const firestore = admin.firestore();
const receiptsCollection = firestore.collection("receipts");
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
const activeStatuses = ["processed", "pending_review"];
const bucket = admin.storage().bucket();
const getFileUrl = async (file) => {
    try {
        const [signedUrl] = await file.getSignedUrl({
            action: "read",
            expires: "2500-01-01",
        });
        return signedUrl;
    }
    catch (err) {
        // In emulator or missing client_email, fall back to public URL
        firebase_functions_1.logger.warn("Falling back to publicUrl for file", { err, path: file.name });
        return file.publicUrl();
    }
};
const getLimitsForPlan = (plan) => {
    const freeDaily = Number(process.env.FREE_DAILY_LIMIT ?? 20);
    const freeMonthly = Number(process.env.FREE_MONTHLY_LIMIT ?? 500);
    const proDailyRaw = process.env.PRO_DAILY_LIMIT;
    const proMonthlyRaw = process.env.PRO_MONTHLY_LIMIT;
    const proDaily = proDailyRaw ? Number(proDailyRaw) : Infinity;
    const proMonthly = proMonthlyRaw ? Number(proMonthlyRaw) : Infinity;
    return plan === "pro"
        ? { daily: proDaily, monthly: proMonthly }
        : { daily: freeDaily, monthly: freeMonthly };
};
const incrementUsage = async (userId, planHint) => {
    const nowDate = new Date();
    const now = nowDate.getTime();
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
    const usageRef = firestore.collection("users").doc(userId).collection("usage").doc("current");
    await firestore.runTransaction(async (tx) => {
        const usageSnap = await tx.get(usageRef);
        const usage = (usageSnap.exists ? usageSnap.data() : {});
        const plan = (usage.plan ?? planHint) === "pro" ? "pro" : "free";
        const limits = getLimitsForPlan(plan);
        let dailyCount = usage.dailyCount ?? 0;
        let monthlyCount = usage.monthlyCount ?? 0;
        const dailyResetAt = usage.dailyResetAt ?? 0;
        const monthlyResetAt = usage.monthlyResetAt ?? 0;
        if (dailyResetAt < todayStart) {
            dailyCount = 0;
        }
        if (monthlyResetAt < monthStart) {
            monthlyCount = 0;
        }
        if (limits.daily !== Infinity && dailyCount >= limits.daily) {
            throw new https_1.HttpsError("resource-exhausted", "Daily scan limit reached for your plan. Please upgrade to continue.");
        }
        if (limits.monthly !== Infinity && monthlyCount >= limits.monthly) {
            throw new https_1.HttpsError("resource-exhausted", "Monthly scan limit reached for your plan. Please upgrade to continue.");
        }
        const nextUsage = {
            plan,
            dailyCount: dailyCount + 1,
            monthlyCount: monthlyCount + 1,
            dailyResetAt: todayStart,
            monthlyResetAt: monthStart,
            updatedAt: now,
        };
        tx.set(usageRef, nextUsage, { merge: true });
    });
};
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
const decodeBase64Image = (input) => {
    const cleaned = input.includes(",") ? input.split(",").pop() : input;
    return Buffer.from(cleaned, "base64");
};
const resizeImageBuffer = async (buffer, maxWidth = 1200, maxHeight = 1200) => {
    const sharpLib = await Promise.resolve().then(() => __importStar(require("sharp")));
    const sharp = sharpLib.default ?? sharpLib;
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    // If we don't know dimensions or already small enough, return original buffer
    if (!width || !height || (width <= maxWidth && height <= maxHeight)) {
        return buffer;
    }
    const resized = await image
        .resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
    })
        .jpeg({ quality: 80 })
        .toBuffer();
    return resized;
};
const receiptSchema = {
    type: genai_1.Type.OBJECT,
    properties: {
        storeName: { type: genai_1.Type.STRING },
        storeLocation: { type: genai_1.Type.STRING },
        date: { type: genai_1.Type.STRING },
        type: { type: genai_1.Type.STRING },
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
                    details: { type: genai_1.Type.STRING },
                },
                required: ["name", "quantity", "price"],
            },
        },
    },
    required: ["storeName", "storeLocation", "date", "time", "total", "items", "source"],
};
const parseDataUrl = (dataUrl) => {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match)
        return null;
    return { contentType: match[1], base64: match[2] };
};
const csvReceiptArraySchema = {
    type: genai_1.Type.ARRAY,
    items: {
        type: genai_1.Type.OBJECT,
        properties: {
            id: { type: genai_1.Type.STRING },
            storeName: { type: genai_1.Type.STRING },
            storeLocation: { type: genai_1.Type.STRING },
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
    try {
        const snapshot = await receiptsCollection.where("userId", "==", userId).get();
        const receipts = snapshot.docs
            .map(toReceipt)
            .filter((r) => r.status !== "deleted")
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return { receipts, nextPageToken: null };
    }
    catch (err) {
        firebase_functions_1.logger.error("getReceipts failed", { err, userId });
        throw new https_1.HttpsError("internal", "Failed to fetch receipts");
    }
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
        type: receipt.type ?? "purchase",
        status: receipt.status ?? "processed",
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
    const mergedReceipt = { ...current, ...dataToUpdate };
    const nextHash = generateReceiptHash(mergedReceipt);
    const updatePayload = { ...dataToUpdate };
    if (nextHash) {
        updatePayload.hash = nextHash;
    }
    await docRef.update(updatePayload);
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
    const receiptData = snapshot.data();
    if (receiptData.userId !== userId) {
        throw new https_1.HttpsError("permission-denied", "You can only delete your own receipts.");
    }
    if (receiptData.status === "deleted") {
        return { success: true };
    }
    await docRef.update({
        status: "deleted",
        deletedAt: Date.now(),
    });
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
exports.migrateImagesToStorage = (0, https_1.onCall)({ timeoutSeconds: 540, memory: "1GiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request, request.data?.userId);
    const snapshot = await receiptsCollection.where("userId", "==", userId).get();
    let scanned = 0;
    let migrated = 0;
    let skipped = 0;
    for (const doc of snapshot.docs) {
        scanned++;
        const receipt = toReceipt(doc);
        const imageUrl = receipt.imageUrl;
        if (!imageUrl) {
            skipped++;
            continue;
        }
        const parsed = parseDataUrl(imageUrl);
        if (!parsed) {
            // Already a link/URL; leave untouched
            skipped++;
            continue;
        }
        const { contentType, base64 } = parsed;
        const buffer = Buffer.from(base64, "base64");
        const extension = contentType.split("/")[1] || "jpg";
        const path = `receipts/${userId}/${doc.id}.${extension}`;
        const file = bucket.file(path);
        await file.save(buffer, {
            contentType,
            resumable: false,
            metadata: { cacheControl: "public, max-age=31536000" },
        });
        const url = await getFileUrl(file);
        await doc.ref.update({ imageUrl: url });
        migrated++;
    }
    firebase_functions_1.logger.info("Image migration complete", { userId, scanned, migrated, skipped });
    return { scanned, migrated, skipped };
});
// Admin-only: migrate all users' receipts by uploading any base64 imageUrl to Storage and saving the URL.
exports.migrateAllImagesToStorage = (0, https_1.onCall)({ timeoutSeconds: 540, memory: "1GiB", cors: corsAllowlist }, async (request) => {
    const secret = process.env.MIGRATION_SECRET;
    if (!secret || request.data?.token !== secret) {
        throw new https_1.HttpsError("permission-denied", "Invalid or missing migration token.");
    }
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const snapshot = await receiptsCollection.get();
    let scanned = 0;
    let migrated = 0;
    let skipped = 0;
    for (const doc of snapshot.docs) {
        scanned++;
        const receipt = toReceipt(doc);
        const imageUrl = receipt.imageUrl;
        if (!imageUrl) {
            skipped++;
            continue;
        }
        const parsed = parseDataUrl(imageUrl);
        if (!parsed) {
            skipped++;
            continue;
        }
        const { contentType, base64 } = parsed;
        const buffer = Buffer.from(base64, "base64");
        const extension = contentType.split("/")[1] || "jpg";
        const path = `receipts/${receipt.userId || "unknown"}/${doc.id}.${extension}`;
        const file = bucket.file(path);
        await file.save(buffer, {
            contentType,
            resumable: false,
            metadata: { cacheControl: "public, max-age=31536000" },
        });
        const [signedUrl] = await file.getSignedUrl({
            action: "read",
            expires: "2500-01-01",
        });
        await doc.ref.update({ imageUrl: signedUrl });
        migrated++;
    }
    firebase_functions_1.logger.info("Global image migration complete", { scanned, migrated, skipped, triggeredBy: request.auth.uid });
    return { scanned, migrated, skipped };
});
// HTTP admin trigger (no auth) gated by MIGRATION_SECRET: POST with token in body/query/header
exports.migrateAllImagesToStorageHttp = (0, https_1.onRequest)({ timeoutSeconds: 540, memory: "1GiB" }, async (req, res) => {
    const secret = process.env.MIGRATION_SECRET;
    const token = (req.body && (req.body.token || req.body.data?.token)) ||
        (req.query && req.query.token) ||
        req.headers["x-migration-token"];
    if (!secret || token !== secret) {
        res.status(403).json({ error: "Invalid or missing migration token." });
        return;
    }
    try {
        const snapshot = await receiptsCollection.get();
        let scanned = 0;
        let migrated = 0;
        let skipped = 0;
        for (const doc of snapshot.docs) {
            scanned++;
            const receipt = toReceipt(doc);
            const imageUrl = receipt.imageUrl;
            if (!imageUrl) {
                skipped++;
                continue;
            }
            const parsed = parseDataUrl(imageUrl);
            if (!parsed) {
                skipped++;
                continue;
            }
            const { contentType, base64 } = parsed;
            const buffer = Buffer.from(base64, "base64");
            const extension = contentType.split("/")[1] || "jpg";
            const path = `receipts/${receipt.userId || "unknown"}/${doc.id}.${extension}`;
            const file = bucket.file(path);
            await file.save(buffer, {
                contentType,
                resumable: false,
                metadata: { cacheControl: "public, max-age=31536000" },
            });
            const url = await getFileUrl(file);
            await doc.ref.update({ imageUrl: url });
            migrated++;
        }
        firebase_functions_1.logger.info("Global image migration (HTTP) complete", { scanned, migrated, skipped });
        res.json({ scanned, migrated, skipped });
    }
    catch (err) {
        firebase_functions_1.logger.error("Global image migration (HTTP) failed", { err });
        res.status(500).json({ error: "Migration failed", details: String(err) });
    }
});
exports.processReceiptImage = (0, https_1.onCall)({ timeoutSeconds: 60, memory: "1GiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request);
    const planHint = request.auth?.token?.plan === "pro" ? "pro" : "free";
    if (!request.data?.base64Image) {
        throw new https_1.HttpsError("invalid-argument", "base64Image is required.");
    }
    // Enforce usage limits and increment before incurring model costs
    await incrementUsage(userId, planHint);
    // Server-side resize: protect Gemini and normalize input even if client skipped resizing
    const originalBuffer = decodeBase64Image(request.data.base64Image);
    const resizedBuffer = await resizeImageBuffer(originalBuffer);
    const base64ForModel = resizedBuffer.toString("base64");
    const client = getGeminiClient();
    const prompt = `You are a world-class financial auditor. Extract data from this receipt with maximum accuracy and strict consistency.

OUTPUT REQUIREMENTS (NON-NEGOTIABLE):
- Return STRICTLY valid JSON only (no markdown, no commentary).
- Use exactly this top-level schema and keys: { type, storeName, storeLocation, items, source, date, time }.
- Do NOT add extra keys. Do NOT omit required keys.
- String fields must be strings ("" if unknown when allowed). Numeric fields must be numbers (never quoted).
- Money rules:
  - lineTotal must always be rounded to 2 decimals.
  - price (unit price) should be 2 decimals if printed. If you must compute unit price via division, you may use up to 4 decimals to preserve accuracy (e.g., 10/3 = 3.3333).
  - Never include currency symbols in numbers.

FIELD INSTRUCTIONS:
1) type:
- Must be exactly: "purchase" or "refund".
- If the receipt is a return/refund, set type="refund". Otherwise type="purchase".

2) storeName:
- The merchant trade name (not payment processor).
- Normalize to Title Case (e.g., "whole foods market" -> "Whole Foods Market").
- Remove obvious noise like store numbers, terminal IDs, lane numbers when they are not part of the trade name.

3) storeLocation:
- Prefer the most specific human location that is printed (usually City + State, or City + Country).
- Output format rules:
  - If US location: "City, State" (State must be FULL state name in Title Case, not an abbreviation).
  - If non-US and country is known: "City, Country" or "City, Region, Country" if clearly printed.
  - Title Case every word (e.g., "LOS ANGELES" -> "Los Angeles").
  - For two-word (or multi-word) names, capitalize each word: "New York", "Rhode Island", "District Of Columbia".
  - Leave as "" only if location is truly not present anywhere on the receipt.

US STATE NORMALIZATION (EXPAND ABBREVIATIONS):
- If a US state is printed as an abbreviation, expand it to the full official name:
AL=Alabama, AK=Alaska, AZ=Arizona, AR=Arkansas, CA=California, CO=Colorado, CT=Connecticut, DE=Delaware,
FL=Florida, GA=Georgia, HI=Hawaii, ID=Idaho, IL=Illinois, IN=Indiana, IA=Iowa, KS=Kansas, KY=Kentucky,
LA=Louisiana, ME=Maine, MD=Maryland, MA=Massachusetts, MI=Michigan, MN=Minnesota, MS=Mississippi, MO=Missouri,
MT=Montana, NE=Nebraska, NV=Nevada, NH=New Hampshire, NJ=New Jersey, NM=New Mexico, NY=New York,
NC=North Carolina, ND=North Dakota, OH=Ohio, OK=Oklahoma, OR=Oregon, PA=Pennsylvania, RI=Rhode Island,
SC=South Carolina, SD=South Dakota, TN=Tennessee, TX=Texas, UT=Utah, VT=Vermont, VA=Virginia, WA=Washington,
WV=West Virginia, WI=Wisconsin, WY=Wyoming, DC=District Of Columbia

4) items:
- An array of line items in the order they appear.
- Each item object MUST have these keys:
  - name (string)
  - quantity (number)
  - price (number)  // UNIT price for exactly one unit (or per weight unit if sold by weight)
  - lineTotal (number) // total for that line = quantity * price (rounded to 2 decimals)
  - category (string)  // MUST be one of the canonical set below
  - subcategory (string) // MUST be one of the canonical set below
  - details (string) // "" if none

Name normalization:
- Title Case/Camel Case. Remove meaningless tokens (e.g., long item codes) from name and place them into details when appropriate.
- Keep the name descriptive (e.g., "Bananas", "Organic Milk", "Chicken Breast").

Quantity and unit price logic (CRITICAL):
- If receipt shows "2 @ 5.00 ... 10.00": quantity=2, price=5.00, lineTotal=10.00.
- If receipt shows only "2 x MILK ... 12.00": quantity=2, compute price=12.00/2=6.00, lineTotal=12.00.
- If receipt shows weight-based items (e.g., "1.25 lb @ 3.99/lb 4.99"):
  - quantity can be decimal (1.25), price is per lb (3.99), lineTotal is the printed line total (4.99).
- If receipt shows bundle pricing (e.g., "3 for 10.00"):
  - quantity=3, lineTotal=10.00, price=10.00/3 (up to 2 decimals), do NOT force price to 2 decimals if that breaks math.

CANONICAL CATEGORY (USE ONLY ONE OF THESE):
Groceries, Dining, Alcohol, Personal Care, Health, Baby, Pets, Apparel, Home, Electronics, Office, Automotive,
Transportation, Travel, Entertainment, Education, Gifts, Charity, Utilities, Housing, Insurance, Finance, Fees, Services, Other
CANONICAL SUBCATEGORY (USE ONLY ONE OF THESE):
# Groceries
Produce, Dairy, Bakery, Meat, Seafood, Deli, Pantry, Snacks, Beverages, Frozen, Household Supplies
# Dining
Fast Food, Restaurant, Cafe, Bar
# Alcohol
Beer, Wine, Spirits
# Personal Care
Toiletries, Cosmetics, Hair Care
# Health
Pharmacy, Medical Supplies, Doctor, Dental, Vision
# Baby
Diapers, Formula, Baby Food
# Pets
Pet Food, Pet Supplies, Vet
# Apparel
Clothing, Shoes, Accessories
# Home
Furniture, Home Decor, Kitchenware, Appliances, Bedding, Cleaning Supplies, Home Improvement, Garden
# Electronics
Computers, Phones, Accessories, Gaming
# Office
Office Supplies, Printing
# Automotive
Fuel, Maintenance, Repairs, Parking, Tolls
# Transportation
Public Transit, Rideshare, Taxi, Car Rental
# Travel
Lodging, Flights, Train, Bus, Baggage Fee
# Entertainment
Movies, Music, Events, Streaming
# Education
Books, Courses, Tuition
# Gifts and Charity
Gifts, Donation
# Utilities and Housing
Electricity, Gas Utility, Water, Internet, Mobile Plan, Rent, HOA
# Insurance and Finance
Auto Insurance, Health Insurance, Home Insurance, Interest, Bank Fee
# Fees (non-item charges)
Sales Tax, VAT, GST, Tip, Gratuity, Service Fee, Delivery Fee, Shipping, Convenience Fee, Processing Fee, Late Fee, Surcharge, Discount, Coupon, Refund, Store Credit
# Services
Subscription, Professional Service, Repair Service, Installation, Cleaning Service
# Fallbacks
General, Other

SUBCATEGORY RULES (MUST FOLLOW):
- Subcategory must be one of the canonical values above. Never invent new labels.
- Use "General" only when the item is truly unclear after using storeName + item name.
- Use "Other" only when none of the canonical subcategories plausibly fit.
- Tax and fee lines:
  - category must be "Fees"
  - subcategory must be one of: Sales Tax, VAT, GST, Tip, Gratuity, Service Fee, Delivery Fee, Shipping, Convenience Fee, Processing Fee, Late Fee, Surcharge, Discount, Coupon, Bank Fee
- Refund lines:
  - If the receipt is a refund transaction: type="refund"
  - If a refund appears as a line item on a purchase receipt: category="Fees", subcategory="Refund"
- Tips:
  - Tip and Gratuity are distinct. If receipt says "Tip", use Tip. If it says "Gratuity", use Gratuity.
- Discounts/coupons must be negative amounts (price and lineTotal negative).


Tax and fee extraction rules (MUST FOLLOW):
- Identify ALL taxes (Sales Tax, VAT, GST, etc.) as separate items in items[].
- For ALL tax items:
  - name must be exactly "Sales Tax" OR "Sales Tax (X%)" only if an exact rate is printed.
  - quantity must be 1
  - category must be "Fee"
  - subcategory must be "Tax 1" for standard rates and "Tax 2" for reduced/secondary rates
  - price must equal the tax amount for that tax line
  - lineTotal must equal price
- For non-tax fees (delivery, service, shipping):
  - category must be "Fee"
  - subcategory must match: "Delivery Fee" / "Service Fee" / "Shipping" when applicable
  - quantity=1, price=lineTotal=fee amount

Discounts/coupons:
- If a discount/coupon is present as a separate line, include it as its own item:
  - name: a clear label like "Discount" or the printed coupon name (Title Case)
  - category: "Fee"
  - subcategory: "Other" (or "General" if it is unclear)
  - quantity=1
  - price and lineTotal should be NEGATIVE numbers if the receipt shows it subtracts from total.

Refund receipts:
- If type="refund", keep extracted monetary magnitudes consistent with the receipt.
- If the receipt prints negatives, preserve the negative sign in lineTotal and price where applicable.

5) source:
- Must be exactly "scan".

6) date:
- Format must be YYYY-MM-DD.
- If multiple dates appear, choose the transaction date (not a return policy date).
- If date is not present on the receipt, set date = NOW_LOCAL_DATE.

DATE DISAMBIGUATION RULES (MUST FOLLOW):
- First, identify the exact printed date substring on the receipt.
- Prefer unambiguous dates (month names like "Jan", or ISO "YYYY-MM-DD").
- If numeric and ambiguous (e.g., 01/02/2026):
  1) Use storeLocation country/state to choose format:
     - If a US state is present, interpret as MM/DD/YYYY.
     - If a non-US country is present, interpret as DD/MM/YYYY (unless that country commonly uses MM/DD).
  2) If still unclear, use the user's locale preference provided in RUNTIME CONTEXT.
- Normalize final output to YYYY-MM-DD.
- If the receipt date is missing OR still ambiguous after applying the rules, set date = NOW_LOCAL_DATE.

7) time:
- Format must be HH:MM:SS in 24-hour time.
- If only HH:MM is present, set seconds to "00".
- If time is not present on the receipt, set time = NOW_LOCAL_TIME.

RUNTIME CONTEXT (TRUSTED):
- NOW_LOCAL_DATE: {{YYYY-MM-DD in user's timezone}}
- NOW_LOCAL_TIME: {{HH:MM:SS in user's timezone}}
- Use these only when the receipt does not explicitly provide date/time.

FINAL CONSISTENCY CHECKS (DO BEFORE OUTPUT):
- Ensure every item has all required keys with correct types.
- Ensure category and subcategory are from the allowed canonical sets only.
- Ensure price is unit price, not the line total, when quantity > 1.
- Ensure lineTotal is consistent with quantity * price (except where the receipt clearly prints a rounded/overridden total; in that case, trust the printed lineTotal and keep price as the best computed unit price).

Return strictly valid JSON only.`;
    const result = await client.models.generateContent({
        model: "models/gemini-2.5-flash-lite",
        contents: [
            {
                role: "user",
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64ForModel } },
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
    const toTitle = (val) => {
        if (!val)
            return "";
        return val
            .toLowerCase()
            .split(/[\s_-]+/)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    };
    parsed.storeName = toTitle(parsed.storeName || "");
    parsed.storeLocation = toTitle(parsed.storeLocation || "");
    if (typeof parsed.total === "number") {
        parsed.total = Number(parsed.total.toFixed(2));
    }
    // Normalize tax items for consistency
    if (Array.isArray(parsed.items)) {
        parsed.items = parsed.items.map((item) => {
            const nameLower = (item.name || "").toLowerCase();
            const isTax = nameLower.includes("tax") ||
                (item.category?.toLowerCase() === "fee" && (item.subcategory?.toLowerCase().startsWith("tax") ?? false));
            const normalized = {
                ...item,
                name: item.name ? toTitle(item.name) : item.name,
                category: toTitle(item.category || "General"),
                subcategory: toTitle(item.subcategory || "General"),
                price: typeof item.price === "number" ? Number(item.price.toFixed(2)) : item.price,
            };
            if (!isTax)
                return normalized;
            return {
                ...normalized,
                name: normalized.name?.includes("Tax") ? normalized.name : "Sales Tax",
                quantity: 1,
                category: "Fee",
                subcategory: normalized.subcategory?.toLowerCase() === "tax 2" ? "Tax 2" : "Tax 1",
                price: normalized.price,
            };
        });
    }
    return { receipt: parsed };
});
exports.processCsv = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "1GiB", cors: corsAllowlist }, async (request) => {
    const userId = requireAuth(request);
    const planHint = request.auth?.token?.plan === "pro" ? "pro" : "free";
    if (!request.data?.csvText) {
        throw new https_1.HttpsError("invalid-argument", "csvText is required.");
    }
    // Meter CSV ingestion as a scan use
    await incrementUsage(userId, planHint);
    const client = getGeminiClient();
    const promptTemplate = `
Please process the following CSV data and convert it into a JSON array of receipt objects.
The CSV format uses 'RH' for a receipt header and 'RI' for a receipt item.

The final JSON must follow this structure:
[
  {
    "id": "string",
    "storeName": "string",
    "storeLocation": "string",
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
- If the store location is present in the header, populate "storeLocation" in Title/Camel Case; otherwise use an empty string.
`;
    const result = await client.models.generateContent({
        model: "models/gemini-2.5-flash-lite",
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
        model: "models/gemini-2.5-flash-lite",
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
