# Implementation Plan: Federally Enrolled Tribal Member Verification & Tax Compliance

This plan outlines the integration of an enterprise-grade identity verification and compliance framework for Display & Cell Pros LLC, enabling secure tribal member verification, accurate sales tax exemptions, and automated commercial discounting.

## Context & Objectives

Based on the "Tribal ID Verification Testing Plan" and the "Architectural Implementation Framework for Withpersona.com," we need to automate a dual-track process:
1. **Tribal Identity Verification**: Securely verify tribal enrollment using third-party identity infrastructure (Persona).
2. **Statutory Tax Exemption**: Validate delivery addresses using GIS spatial geofencing to ensure tax exemptions are applied only for on-reservation deliveries.
3. **Automated Discounting**: Apply fixed 20% commercial discounts to verified members, decoupled from tax logic.

---

## 1. Research Summary & Requirements

- **Identity Verification**: Persona API will orchestrate document verification (Tribal ID/CDIB). We must implement server-side pre-creation of inquiries to lock prefill attributes and prevent tampering.
- **Tax Compliance**:
    - **Sales Tax Exemption**: Only applies when verified members receive delivery *within* reservation boundaries (FOB Reservation).
    - **Geofencing**: Relying on ZIP codes is insufficient. We must implement GIS spatial geofencing against Census TIGER AIANNH shapefiles to determine if the `shippingAddress` falls within tax-exempt reservation boundaries.
- **Discounting**: Verified tribal members receive a flat 20% commercial discount on screen-only repair parts, restricted to bundles (Screen + Battery) for mail-in to preserve margins, as standalone mail-in screen repairs fail the mandatory $38 margin floor.

---

## 2. Technical Architecture

### Component Diagram

```
┌────────────────────────────────────────────────────────┐
│               Verification Workflow Engine             │
│  (Next.js API routes / Persona Webhook Handler)        │
└──────────┬──────────────────────────┬──────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Identity: Persona   │    │  Location: GIS       │
│  - Inquire (ID/CDIB) │    - Geocode Address      │
│  - Webhook (Verify)  │    - Intersect Boundary   │
└──────────┬───────────┘    └──────────┬───────────┘
           │                          │
           └────────────┬─────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│              Shopify Admin API Integration             │
│  - Set `taxExempt: true` (if on-res)                   │
│  - Apply `tribal-member-verified` Tag                  │
│  - Update Metafields (enrollment_hash, affiliation)    │
└────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Implementation Plan

### Step 1: Persona Integration (Identity Verification)
- **Setup**: Create an `InquiryTemplate` in Persona for "Tribal ID Verification".
- **Backend**: Implement server-side inquiry pre-creation (`POST /api/v1/inquiries`) in our Next.js API route to lock prefill data for the session.
- **Webhook**: Create `pages/api/webhooks/persona.ts` to consume `inquiry.completed` and `verification.passed` events.
- **Security**: Implement HMAC signature verification on all incoming webhooks (as detailed in the Persona architecture document).

### Step 2: GIS Spatial Geofencing
- **Data**: Utilize Census TIGER AIANNH shapefiles for reservation boundaries.
- **Middleware**: Implement `validateReservationBoundary(shippingAddress)` using Turf.js to determine if the normalized shipping address coordinates lie within AIANA polygons.
- **Logic**: If `onReservation` is `true` AND identity is verified, set `taxExempt: true` in Shopify.

### Step 3: Shopify Automation
- **Mutation**: Configure the `UpdateCustomerTaxProfile` GraphQL mutation to manage `taxExempt` status, apply customer tags (`tribal-member-verified`), and store `compliance` metafields.
- **Pricing**: Implement Shopify Functions to apply the 20% discount only to eligible repair bundles (Screen + Battery) for tagged customers.

### Step 4: Verification & Rollout (Testing Plan)
Follow the "Tribal ID Verification: Testing Plan (Oct 24, 2026)" strictly:
- **Phase A**: Run tests offline/test-mode only. 
- **Tests**: 
    - 1.1: Verify tag state.
    - 1.3: Bundle metafield validation.
    - 4.11: HMAC signature verification.
    - 6.C1: Verify tax flag defaults to OFF.
- **Rollout**: Do not activate `TRIBAL_VERIFY_ENABLED` or `TRIBAL_TAX_EXEMPT_ENABLED` in production until all pass criteria are met.
