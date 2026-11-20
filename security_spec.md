# Security Specification — Zero-Trust Two-Email Owner RBAC & Storefront Firestore Rules

## Data Invariants
1. **Strict Two-Email Owner Allowlist (`isOwnerEmail()`)**: Administrative, Wholesale Gadget Parts (WGP), Audit, Security, Compliance, and System configuration access is restricted **exclusively** to `request.auth.token.email_verified == true` AND `request.auth.token.email in ['cheyoung1983@gmail.com', 'ryan@displaycellpros.com']`.
2. **User Document Ownership & No Self-Escalation**: A `/users/{uid}` document ID must exactly match `request.auth.uid`. Non-allowlisted users may only self-register with `role == 'User'` (never `'owner'`, `'admin'`, or `'technician'`). Immutable fields (`uid`, `email`, `createdAt`) cannot change on update.
3. **Verified Email Mandate**: Every Firestore read/write requires `request.auth != null` and `request.auth.token.email_verified == true` (except explicitly scoped mail-in repair intake where `createdAt == request.time`).
4. **PII Isolation (No Blanket Reads)**: `/users/{uid}`, `/admins/{uid}`, `/tribal_registry/{enrollmentHash}`, `/tribal_enrollments/{enrollmentHash}`, `/auth0_users/{userId}`, `/audit_logs/{logId}`, `/security_events/{eventId}`, and `/repair_requests/{rmsNumber}` strictly forbid blanket `isSignedIn()` or `isVerified()` reads.
5. **WGP & Operational Lockdown**: `/wholesale_catalog/{sku}`, `/wholesale_orders/{poId}`, `/admin_settings/{settingId}`, `/webhook_events/{eventId}`, `/audit_logs/{logId}`, `/security_events/{eventId}`, and `/system/{docId}` are accessible **only** to `isOwnerEmail()`.
6. **Temporal Integrity & String/Array Bounds**: All `createdAt` / `updatedAt` timestamps must match `request.time`; every string and array field has explicit `.size()` bounds; all document IDs pass `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars).

## The "Dirty Dozen" Payloads (Adversarial Denial Tests)
1. **Identity Spoofing**: Signed-in user `uid_a` attempts `create` on `/users/uid_b` with `uid: "uid_b"`. -> `PERMISSION_DENIED`
2. **Owner Role Escalation**: Non-allowlisted verified user (`hacker@example.com`) attempts `create` on `/users/{uid}` with `role: "owner"` or `role: "technician"`. -> `PERMISSION_DENIED`
3. **Ghost / Shadow Field Injection**: Verified user attempts `create` or `update` on `/users/{uid}` adding `isAdmin: true` or `bypassGate: true`. -> `PERMISSION_DENIED`
4. **Unverified Owner Email Spoof**: User with `email: "cheyoung1983@gmail.com"` or `"ryan@displaycellpros.com"` and `email_verified: false` attempts to read `/admins/{uid}` or `/wholesale_catalog/{sku}`. -> `PERMISSION_DENIED`
5. **Timestamp Backdating / Manipulation**: Verified user attempts to `create` `/users/{uid}` or `/repair_requests/{rms}` with client-supplied `createdAt: "2099-01-01T00:00:00Z"`. -> `PERMISSION_DENIED`
6. **ID Poisoning**: Attacker attempts `create` on `/repair_requests/{1500_char_junk_id}` or `../admins/evil`. -> `PERMISSION_DENIED`
7. **Admin Index Tampering**: Non-allowlisted verified user attempts to read or write `/admins/{uid}` to grant themselves `isAdminLevel()`. -> `PERMISSION_DENIED`
8. **Self-Profile Role Mutation (Shadow Update)**: Existing `'User'` attempts `update` on `/users/{uid}` modifying `role: "owner"` alongside `updatedAt`. -> `PERMISSION_DENIED`
9. **Cross-User PII Enumeration**: Non-owner user attempts `get` or `list` on `/users`, `/tribal_enrollments`, `/tribal_registry`, `/auth0_users`, or `/repair_requests` belonging to another email. -> `PERMISSION_DENIED`
10. **WGP Unauthorized Catalog Read/Write**: Signed-in verified customer (`customer@example.com`) attempts to `get` or `list` `/wholesale_catalog` or `/wholesale_orders`. -> `PERMISSION_DENIED`
11. **Terminal Repair State Tampering**: Customer attempts to `update` a `/repair_requests/{rms}` document whose `existing().status == 'completed'`. -> `PERMISSION_DENIED`
12. **Audit Log Tampering**: Any user (or even non-owner staff) attempts to `update` or `delete` `/audit_logs/{logId}` or write to `/security_events/{eventId}`. -> `PERMISSION_DENIED`
