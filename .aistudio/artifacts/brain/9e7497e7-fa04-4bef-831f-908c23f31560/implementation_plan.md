# Implementation Plan: Secure Tribal Verification Admin Dashboard

A dedicated, secure administration panel for Display & Cell Pros allowing authorized shop administrators (`ryan@displaycellpros.com` and `cheyoung1983@gmail.com`) to inspect pending tribal member verification requests, examine Stripe/Persona diagnostic telemetry, and execute single-click approvals or denials with automated Shopify customer tagging and Slack status synchronization.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Dashboard Location**: Dedicated admin route at `/admin/tribal-audit` protected by email session authorization.
> - **Administrative Actions**: Single-click **Approve** and **Deny** buttons that automatically update Shopify customer tags (`tribal-member-verified`), write audit logs to Firestore (`tribal_verifications`), and sync approval decisions to Slack.
> - **Authorization & Security**: Enforce session email check restricting access exclusively to `ryan@displaycellpros.com` and `cheyoung1983@gmail.com`. Non-administrators or unauthenticated users are redirected or served an access-denied state.

---

## Technical Architecture & Component Mapping

### 1. New & Modified Components

| File / Component | Role & Functionality |
| :--- | :--- |
| `pages/admin/tribal-audit.tsx` | Dedicated Admin Dashboard route with breadcrumbs, stats overview, filtering, and authorization guard. |
| `components/tribal/AdminAuditDashboard.tsx` | Core interactive table displaying pending, approved, and denied verification requests with expandable details. |
| `pages/api/tribal/admin/requests.ts` | Authenticated API endpoint querying pending/historical verification records from Redis/Firestore for admins. |
| `pages/api/tribal/admin/decision.ts` | Authenticated API endpoint executing Approve/Deny decisions, updating Shopify customer tags, Firestore audit logs, and Slack thread status. |
| `lib/tribal/admin-auth.ts` | Utility helper validating session email against the admin allowlist (`ryan@displaycellpros.com`, `cheyoung1983@gmail.com`). |

### 2. Data Flow Architecture

```
┌────────────────────────────────────────────────────────┐
│             Admin User (Auth0 / Session)               │
│   (ryan@displaycellpros.com / cheyoung1983@gmail.com)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           /admin/tribal-audit Route Guard              │
│    Validate Email Allowlist via lib/tribal/admin-auth  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│         Admin Audit Dashboard (/api/tribal/admin)      │
│  - Fetch Pending Requests (Redis/Firestore/Persona)    │
│  - Display Masked Enrollment IDs, Geofence, Persona ID  │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       [Approve Decision]        [Deny Decision]
                │                        │
                ▼                        ▼
┌────────────────────────────────────────────────────────┐
│              Shopify & Slack Synchronization           │
│  1. Add 'tribal-member-verified' Tag to Shopify        │
│  2. Update Firestore 'tribal_verifications' Record     │
│  3. Broadcast Decision Notification to Slack Channel    │
└────────────────────────────────────────────────────────┘
```

---

## Phased Implementation Steps

### Phase 1: Security & Helper Utilities (`lib/tribal/admin-auth.ts`)
- Define `ADMIN_ALLOWLIST = ['ryan@displaycellpros.com', 'cheyoung1983@gmail.com']`.
- Implement `isAdminSession(req)` to extract session email from Auth0 or request context and compare against `ADMIN_ALLOWLIST`.

### Phase 2: Secure API Endpoints (`pages/api/tribal/admin/`)
- **`requests.ts`**: Returns pending and processed verification requests. Restricts responses to authorized admins.
- **`decision.ts`**: Processes `APPROVE` or `DENY` actions:
  - Validates admin authorization.
  - Updates Shopify customer tags (`tagsAdd` mutation).
  - Updates Firestore `tribal_verifications` collection.
  - Posts decision update to Slack `#tribal-approvals`.

### Phase 3: Admin Dashboard UI (`components/tribal/AdminAuditDashboard.tsx`)
- Render real-time metric cards (Pending Requests, Total Approved, On-Reservation Deliveries).
- Render searchable/filterable request table displaying:
  - Customer Name & Email
  - Tribal Nation & Masked Enrollment ID
  - Persona/Stripe Inquiry Session ID
  - GIS Geofence Status (On-Reservation / Off-Reservation)
  - Action Controls: **Approve** and **Deny** buttons with confirmation state.

### Phase 4: Route Integration (`pages/admin/tribal-audit.tsx`)
- Create the page view at `/admin/tribal-audit`.
- Wrap with session email authorization guard.
- Add navigation link in the top navigation or account dropdown for admin users.

### Phase 5: Verification & Quality Assurance
- Execute `npm run typecheck` (`tsc --noEmit`).
- Execute `npm run lint` (`eslint`).
- Run Jest test suite to ensure all security rules and routes pass without error.

---

## Risk Mitigation & Security Controls

- **Access Guard**: API routes return HTTP 403 Forbidden for any non-admin email or unauthenticated request.
- **PII Protection**: Raw enrollment IDs are never exposed; only masked IDs (`***1234`) and cryptographic hashes are rendered.
- **Audit Logging**: Every approval or denial records the admin email and timestamp in the immutable audit log.
