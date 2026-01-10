# SpendWiseAI

AI-powered receipt capture, cleaning, and insights. Turn messy receipts into trusted, audit-ready data with duplicate detection, item-level extraction, and premium dashboards.

## Features
- **AI extraction you can trust:** Store name, date/time, totals, currency, items (with category/subcategory), and refunds handled as negatives.
- **Image workflows:** Upload/scan, crop, rescan with AI, and standardized editing.
- **Data hygiene:** Duplicate detection/resolve, manual edits, bulk rescan, and secure storage.
- **Insights:** Trend, category/store breakdowns, refunds vs purchases, weekday mix, top items/stores, and mobile-friendly receipts/stores/history views.
- **Secure by design:** Firebase auth, Functions, Storage; bank-grade encryption and audit-ready exports.

## Quick Start
**Prerequisites:** Node.js, Firebase project, Gemini API key.

1) Install dependencies  
   ```bash
   npm install
   ```
2) Configure env (create `.env.local` or `.env.development.local`):
   ```
   GEMINI_API_KEY=your_gemini_key
   ```
   Ensure Firebase config in `services/firebaseConfig.ts` matches your project.
3) Run the web app  
   ```bash
   npm run dev
   ```
4) Functions (if working locally):  
   ```bash
   cd functions && npm install && npm run build
   ```

## Deploy (Firebase)
```bash
firebase deploy --only hosting,functions
```

If you expose callable functions publicly, apply invoker bindings (example):
```bash
gcloud functions add-iam-policy-binding <functionName> \
  --region us-central1 --project spendwise-ai-b7b1f \
  --member=allUsers --role=roles/run.invoker --gen2
```
Functions include: getReceipts, saveReceipt, updateReceipt, deleteReceipt, checkDuplicate, findAndFlagDuplicates, backfillHashes, processReceiptImage, processCsv, chatWithReceipts, migrateImagesToStorage.

## Stack
- React + Vite + TypeScript
- Tailwind-style utility classes for UI
- Recharts for dashboards
- Firebase Auth, Functions, Firestore, Storage
- Gemini for receipt parsing and chat

## Key Paths
- App shell & navigation: `App.tsx`
- Receipts: `components/ReceiptScanner.tsx`, `components/EditModal.tsx`, `components/PurchaseHistory.tsx`
- Stores/Items: `components/StoresView.tsx`, `components/AllItems.tsx`
- Insights dashboard: `components/Dashboard.tsx`
- Profile/tools: `components/ProfilePage.tsx`
- Backend callables: `functions/src/index.ts`

## Pricing (product stance)
- **Free:** 50 scans/month, smart categorization, duplicate alerts, email support.
- **Pro:** Unlimited scans, audit-ready exports, AI chat/anomaly checks, priority support & SLA.

## Security & Trust
- Firebase-backed auth + storage, long-lived signed URLs after migration.
- Refund-aware math and consistent two-decimal totals.
- Manual controls: edit, rescan, duplicate resolve, bulk rescan.
