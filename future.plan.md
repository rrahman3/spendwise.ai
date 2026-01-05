Fastest path with minimal code changes: wrap the existing Vite/React web app in Capacitor to run it as Android/iOS.

- Why: reuse UI/business logic; native plugins available; avoids a React Native/Flutter rewrite.
- Steps:
  1) Install Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios`; `npx cap init` with `webDir` = Vite `dist`.
  2) Build web assets: `npm run build` then `npx cap copy` to sync.
  3) Add platforms: `npx cap add android`, `npx cap add ios`.
  4) Native config: set app name/id; icons/splash; network/ATS settings for your domains.
  5) Firebase: keep web SDK; add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) if you want device analytics; callable/auth URLs unchanged.
  6) Auth: web Google login should work; if issues, use popup/redirect or Capacitor Browser for OAuth.
  7) Camera/files later: add Capacitor Camera/Filesystem plugins and feed into the existing receipt flow.
  8) App Check: consider DeviceCheck/SafetyNet providers for mobile builds.
  9) Dev/test: `npx cap open android` / `npx cap open ios`; after UI changes: `npm run build && npx cap copy`.
 10) Ship: sign APK/AAB for Play Store; Xcode archive for TestFlight/App Store.

If stores aren’t required, a PWA install is the lowest effort, but Capacitor is best for store distribution with minimal code changes.


Key bottlenecks / risks I see in this stack

Client-only data fetching: Receipts are pulled on auth change and refreshed ad hoc; no pagination or streaming. With large histories you’ll hit slow loads and high read costs. Add pagination/virtualization, and query limits with cursor-based pagination.

Functions latency + coupling: Every save/update/delete is a callable function hit; no batching on the client except for duplicates. Consider Firestore direct writes with security rules, or batched functions for bulk ops (CSV, batch scan) to reduce chattiness.

No offline/optimistic UX: Edits/saves block on network. Add optimistic UI for receipts and failover queuing; cache with IndexedDB (e.g., idb) for offline read.
Image handling: Cropping/resizing happens client-side; images are stored as data URLs in DB payloads. That’s heavy and slow. Push images to Cloud Storage, store URLs, and keep only metadata in Firestore. Add server-side validation and compression.

AI dependency: Extraction and CSV processing depend on Gemini calls inline. Add retry/backoff, user-facing status, and fallbacks/manual capture paths; consider queueing long jobs and polling.
Duplicate detection: Hash is simple (store/date/total). Real-world duplicates need normalization (time, rounded totals, vendor aliases). Improve hashing (normalize store names, round totals, maybe item signatures) and add fuzzy matching for near-duplicates.

Security/runtime config: Functions assume env vars exist; client throws alert if keys missing. Move to build-time checks and robust error boundaries; add security rules for Firestore and Storage (read/write limits per user, allowlisting file types).

Testing: No automated tests. Add unit tests for helpers (hash, CSV parsing), integration tests for functions (using the emulator), and UI smoke tests for critical flows (scan/save/edit/delete).
Quick wins to improve

Store images in Cloud Storage, keep URLs + metadata in Firestore; strip data URLs from receipts.
Add pagination/virtualized lists for receipts/items/stores.
Add optimistic updates with rollback for edits/deletes; cache receipts locally.
Harden functions with retries/backoff around AI calls and validation of payloads.
Expand duplicate detection normalization and add a review UI hinting at confidence scores.
Add emulator-backed tests in CI for functions and a couple of Playwright/RTL smoke tests.