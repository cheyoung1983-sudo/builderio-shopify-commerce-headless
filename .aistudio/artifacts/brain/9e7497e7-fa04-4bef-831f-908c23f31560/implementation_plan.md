# Implementation Plan: SendGrid Cloud Functions Notification (`functions/src/index.ts`)

Implement a Firebase Cloud Function (`onRepairStatusChanged`) in `functions/src/index.ts` using the v2 Firestore `onDocumentUpdated` trigger on `repair_requests/{requestId}`. Whenever a repair request status changes, the function formats a responsive HTML email featuring the RMS tracking number, device model, new status badge, estimated completion date, and direct tracking link, transmitting it via `@sendgrid/mail`.

---

## 1. Architecture & Data Flow

```
+----------------------------------------------------------------------------------------------------+
|                                    Firestore: `repair_requests/{requestId}`                       |
|                                                                                                    |
|  1. Status field updated (e.g. `RECEIVED_AT_FACILITY` -> `IN_DIAGNOSTICS`)                         |
|  2. Triggers `onRepairStatusChanged` Cloud Function (`functions/src/index.ts`)                    |
|  3. Formats transactional HTML email with SendGrid Mail API                                        |
|  4. Sends email to customer (`email` or `customerEmail`) with RMS Tracking Link                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. File Deliverables

1. **`functions/src/index.ts`**:
   - Cloud Function `onRepairStatusChanged` listening to `repair_requests/{requestId}` updates, constructing transactional HTML notifications, and calling `@sendgrid/mail`.
2. **`functions/package.json`**:
   - Package configuration for Firebase Functions v2 and `@sendgrid/mail`.
3. **`tests/sendgrid-cloud-function.test.js`**:
   - Unit test suite verifying function export, trigger path, status comparison, and email payload construction.

---

## 3. Verification Plan

1. Run unit tests (`npx jest tests/sendgrid-cloud-function.test.js`).
2. Run TypeScript check (`npm run typecheck`).
3. Run full Jest test suite across all 20 test suites.
