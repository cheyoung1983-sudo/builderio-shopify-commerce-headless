# Security Specification: repair_requests collection

## Data Invariants
1. A repair request must have a valid RMS tracking number.
2. The RMS tracking number in the path must match the document field.
3. Access is restricted to the owner of the email provided in the request or an admin.
4. Terminal states (status == 'completed') must be locked.

## The "Dirty Dozen" Payloads (examples of invalid writes)
1. Missing `rmsNumber`
2. `rmsNumber` in path does not match `rmsNumber` in data
3. Updating an immutable field (`createdAt`)
4. Accessing as unauthenticated user
5. Accessing as non-owner
6. Updating a 'completed' status record
7. Providing a 2KB string for `deviceModel`
8. Injecting a ghost field `isVerified: true`
9. Providing an invalid timestamp
10. Spoofing `shippingKit.email`
11. Orphaned write (creating without parent reference, if applicable)
12. Attempting to list all requests without admin rights

## Test Runner (firestore.rules.test.ts)
(To be implemented in test suite based on these invariants)
