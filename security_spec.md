# Security Specification - Admin Dashboard RBAC

## Data Invariants
1. A user document ID must exactly match the `request.auth.uid`.
2. The `role` field is immutable for non-admin users.
3. The `email` field must match the `request.auth.token.email`.
4. The `owner` role is reserved and can only be set via system bootstrap or by another owner.
5. All writes require a verified email (`request.auth.token.email_verified == true`).

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create `/users/another_uid` while signed in as `my_uid`.
2. **Role Escalation**: Attempt to create a user with `role: "owner"`.
3. **Ghost Field Injection**: Attempt to add `isAdmin: true` to a user document.
4. **Email Spoofing**: Attempt to set `email: "admin@example.com"` when signed in as `user@example.com`.
5. **Timestamp Manipulation**: Attempt to set a manual `createdAt` in the future.
6. **ID Poisoning**: Attempt to create a user with a 2MB string as UID.
7. **Unverified Access**: Attempt to write data with `email_verified: false`.
8. **Shadow Update**: Attempt to update `role` without being an admin/owner.
9. **PII Leak**: Attempt to `get` another user's profile as a technician.
10. **State Shortcutting**: Attempt to change role from `technician` to `admin` via self-update.
11. **Total System Failure**: Attempt to delete the `owner` document as a technician.
12. **Malicious ID**: Attempt to use `../system/config` as a UID.

## The Test Runner (Plan)
- `firestore.rules.test.ts` will verify these 12 cases return `PERMISSION_DENIED`.
- It will also verify that `cheyoung1983@gmail.com` is granted `owner` access during first-time registration.
