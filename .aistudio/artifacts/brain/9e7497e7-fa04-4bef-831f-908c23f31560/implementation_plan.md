# Implementation Plan: Repair Status Tracker & Auth0 Authentication

A unified implementation plan to create a dedicated **Repair Status Tracker** page component with dual-factor lookup (Repair Request ID + Email verification) and integrate **Auth0 authentication** (`@auth0/nextjs-auth0`) with Login, Logout, Profile components, and resilient fallback handling for the Next.js storefront.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Repair Status Tracker Scope**: Dedicated page at `/track-repair` (and reusable component `components/services/RepairStatusLookup.tsx`) allowing customers to lookup repairs using their **Repair Request ID (RMS#)** and **Email Address**. Verifies email ownership before rendering private diagnostic and shipping data.
> - **Auth0 Integration Architecture**:
>   - Implements `@auth0/nextjs-auth0` for user authentication.
>   - Provides `LoginButton.tsx`, `LogoutButton.tsx`, and `Profile.tsx` styled to match the storefront's design language.
>   - Mounts the Next.js Auth0 dynamic route handler (`pages/api/auth/[...auth0].ts`).
>   - Built with resilient runtime guards: If live Auth0 tenant environment variables (`AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`) are not yet populated in production, graceful fallback and demo mode prevent build and dev server crashes while displaying clear setup instructions.
>   - Authenticated users automatically have their email pre-filled into the Repair Status Tracker and can view their linked repair history.

---

### 1. Overview & Core Concept

1. **Repair Status Tracker (`/track-repair`)**:
   - Customers enter their **Repair Request ID** (e.g., `DCP-RMS-100001`) and the **Email Address** used during intake.
   - The system queries Firestore (`repair_requests` collection) or the secure API route (`/api/repair-requests/lookup`), verifying that the normalized email matches the record's contact email.
   - Renders interactive timeline stages (*Kit Dispatched $\to$ Inbound Transit $\to$ Bench Diagnostic $\to$ Microsoldering/Repair $\to$ Outbound Priority Delivery*), real-time courier tracking numbers, diagnostic technician notes, and a printable PDF/packing slip viewer.
2. **Auth0 Authentication Setup**:
   - Configures the Auth0 client in `lib/auth0.ts`.
   - Adds the Auth0 handler at `pages/api/auth/[...auth0].ts`.
   - Creates reusable client components: `LoginButton`, `LogoutButton`, and `Profile`.
   - Provides account overview on the repair tracking page, allowing authenticated customers to view their open repairs with zero typing.

---

### 2. User Experience & Visual Design

- **Page Layout (`/track-repair`)**:
  - **Header & Hero**: Clean, branded title with trust badges (`256-Bit SSL Encrypted Verification`, `Real-Time Lab Telemetry`).
  - **Lookup Form**: Dual input fields:
    - `Repair Request ID` (e.g. `DCP-RMS-100001` with format helper)
    - `Customer Email Address` (validates against the record for privacy protection)
  - **Auth0 Account Panel**: If signed in via Auth0, displays the customer profile card with 1-click "View My Active Repairs".
  - **Status Progress View**:
    - Interactive 5-stage progress ribbon with animated emerald pulses.
    - Courier tracking links (USPS, FedEx, UPS) with live estimated delivery.
    - Technician bench diagnosis report & device photos.
    - Printable packing slip and customer service hotline (`(509) 255-3852`).

---

### 3. Key Technical Decisions & Fallback Strategy

- **Decision 1: Email Ownership Verification Gate**
  - *Context*: Exposing repair records by RMS ID alone creates an enumeration/privacy risk where unauthorized parties could view names, addresses, or phone serial numbers.
  - *Chosen Approach*: The lookup API and client hook require matching the record's email. If the RMS ID exists but the email does not match, return a generic "No matching repair record found for this ID and email combination" to avoid user enumeration.

- **Decision 2: Next.js Pages Router Auth0 Integration & Resilience**
  - *Context*: This repository uses the Next.js Pages Router with custom proxy security rules.
  - *Chosen Approach*: Implement standard Pages Router Auth0 handling at `pages/api/auth/[...auth0].ts` and `lib/auth0.ts`. Wrap Auth0 initialization with an environment check so development and CI builds succeed without requiring immediate cloud tenant provisioning.
  - *Environment Variables*: Declare `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, and `AUTH0_CLIENT_ID` in `.env.example`.

---

### 4. Technical Architecture & Component Tree

#### Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│                   /track-repair Page                   │
│                                                        │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │   Auth0 Profile Bar    │  │  Repair Lookup Card  │  │
│  │  [User Avatar & Email] │  │  [RMS ID] + [Email]  │  │
│  │  [Sign In / Sign Out]  │  │  [Track Progress →]  │  │
│  └───────────┬────────────┘  └──────────┬───────────┘  │
│              │                          │              │
│              ▼                          ▼              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         /api/repair-requests/lookup API          │  │
│  │   - Validates RMS ID exists                      │  │
│  │   - Verifies customer email matches record       │  │
│  │   - Sanitizes and returns status milestones      │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│                             ▼                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           RepairStatusDisplay Component          │  │
│  │  - 5-Stage Live Timeline (Kit -> Bench -> Return)│  │
│  │  - Courier Tracking & Inbound/Outbound Status    │  │
│  │  - Diagnostic Photos & Packing Slip Modal        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### Step-by-Step Implementation Sequence

1. **Package Installation**:
   - Install `@auth0/nextjs-auth0` dependency via `install_applet_package`.
2. **Auth0 Client & Environment Setup**:
   - Create `lib/auth0.ts` with safe initialization and client helpers.
   - Update `.env.example` with standard Auth0 configuration variables.
   - Create `pages/api/auth/[...auth0].ts` handler.
3. **Auth UI Components**:
   - Create `components/auth/LoginButton.tsx`.
   - Create `components/auth/LogoutButton.tsx`.
   - Create `components/auth/Profile.tsx`.
4. **Secure Lookup API Route**:
   - Create `pages/api/repair-requests/lookup.ts` taking `rms` and `email`, verifying ownership against Firestore `repair_requests` (or seeded demo records).
5. **Repair Status Tracker Component & Page**:
   - Create `components/services/RepairStatusLookup.tsx` with dual-field verification.
   - Create `pages/track-repair.tsx` assembling the lookup, Auth0 user session, status display, and breadcrumbs.
6. **Navigation & Navbar Integration**:
   - Add "Track Repair" link in the site header/footer for immediate customer discovery.
7. **Verification**:
   - Verify TypeScript compilation (`npm run typecheck`), ESLint (`npm run lint`), and test endpoint responses.
