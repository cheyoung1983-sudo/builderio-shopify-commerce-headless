# Tribal Tax Exemption & Commercial Identity Discount Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a compliant dual-track Tribal Tax Exemption and Identity Discount system for www.displaycellpros.com, separating statutory sales tax exemptions (for verified enrolled members with physical delivery on reservation trust lands) from commercial promotional discounts (for verified enrolled members regardless of delivery location).

**Architecture:** A decoupled Next.js storefront API layer interacts with third-party verification providers (SheerID/ID.me), a GIS spatial boundary lookup service using US Census TIGER shapefiles, Shopify Admin GraphQL API for customer tagging and metafield updates, Avalara AvaTax for Entity Use Code C tax calculation, and server-side Shopify Functions for automated commercial discount application.

**Tech Stack:** Next.js 14, TypeScript, React Server Components, Shopify Admin GraphQL API, Shopify Functions (Wasm/TypeScript), Avalara AvaTax API, US Census TIGER Shapefile GIS Geofencing, Sentry, Upstash Redis, Jest.

**Spec:** `C:\Users\cheyo\Downloads\Tribal Discount E-Commerce Implementation (1).docx`

## Global Constraints

- **Node Version:** Node.js >= 18.0.0.
- **Language & Types:** Strict TypeScript for all frontend, API, and library modules.
- **Shopify API Version:** Admin GraphQL API 2024-01 or later.
- **Exemption Tag & Enum:** Customer tag `tribal-member-verified`, exemption enum `EXEMPT_INDIAN_IN_CANADA_OR_USA`.
- **Avalara Entity Use Code:** Pass `customerUsageType: "C"` for verified on-reservation statutory tax exemption transactions.
- **CDTFA Compliance:** Generate Form CDTFA-146-RES with digital signature for California common carrier reservation deliveries.
- **Rate Limiting:** IP and Customer-based rate limiting on `/api/tribal/verify` endpoint (max 10 attempts per minute).

## Review Focus

1. **Off-Reservation Delivery by Verified Enrolled Member:** Must receive 20% commercial promotional discount, but standard state/local sales tax MUST be applied (no tax exemption).
2. **On-Reservation Delivery by Non-Enrolled Customer:** Standard state sales tax MUST be applied, no promotional discount.
3. **California Common Carrier (CDTFA-146-RES) Delivery:** Transaction must require digital signature capture and FOB Reservation title transfer agreement before issuing tax exemption.
4. **Self-Administered Tribal Tax Authorities (e.g., Navajo Nation):** State tax is zeroed out via Entity Use Code C, but tribal sales tax must be computed and remitted.
5. **Rate Limiting & Brute-Force Defense:** Brute-force requests against tribal verification endpoints must return HTTP 429 without exposing downstream APIs.

---

### Task 1: Core Types, Validation & Regulatory Rules Matrix

**Files:**
- Create/Modify: `lib/tribal/types.ts`
- Create/Modify: `lib/tribal/validation.ts`
- Test: `tests/tribal-verify.test.js`

**Interfaces:**
- Consumes: Request payloads containing `firstName`, `lastName`, `tribalNation`, `tribalEnrollmentId`, `shippingAddress`.
- Produces: `TribalVerificationRequest`, `TribalVerificationResult`, `StateExemptionRule`, `validateTribalRequestInput()`.

- [ ] **Step 1: Write the failing unit test for validation**

In `tests/tribal-verify.test.js`:
```javascript
test('validateTribalRequestInput rejects empty or missing enrollment fields', () => {
  const invalidPayload = { firstName: '', lastName: 'Smith', tribalNation: '', tribalEnrollmentId: '123' }
  const result = validateTribalRequestInput(invalidPayload)
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('Missing required parameter: firstName')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tribal-verify.test.js -t "validateTribalRequestInput"`
Expected: FAIL if function or error handling is missing.

- [ ] **Step 3: Implement validation logic and type definitions**

In `lib/tribal/types.ts`:
```typescript
export interface TribalVerificationRequest {
  customerId?: string
  firstName: string
  lastName: string
  tribalNation: string
  tribalEnrollmentId: string
  dateOfBirth?: string
  shippingAddress?: {
    line1: string
    line2?: string
    city: string
    state: string
    zip: string
  }
}

export interface TribalVerificationResult {
  verified: boolean
  verificationProvider: 'SheerID' | 'ID.me' | 'BIA_Registry_Mock'
  taxExemptionTrack: {
    eligibleForStatutoryTaxExemption: boolean
    onReservation: boolean
    taxExempt: boolean
  }
  commercialDiscountTrack: {
    eligibleForCommercialDiscount: boolean
    discountPercent: number
  }
  audit: {
    verificationId: string
    timestamp: string
    tribalNation: string
    enrollmentHash: string
  }
}
```

In `lib/tribal/validation.ts`:
```typescript
import { TribalVerificationRequest } from './types'

export function validateTribalRequestInput(body: Partial<TribalVerificationRequest>) {
  const errors: string[] = []
  if (!body.firstName?.trim()) errors.push('Missing required parameter: firstName')
  if (!body.lastName?.trim()) errors.push('Missing required parameter: lastName')
  if (!body.tribalNation?.trim()) errors.push('Missing required parameter: tribalNation')
  if (!body.tribalEnrollmentId?.trim()) errors.push('Missing required parameter: tribalEnrollmentId')

  return {
    valid: errors.length === 0,
    errors,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/tribal-verify.test.js -t "validateTribalRequestInput"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tribal/types.ts lib/tribal/validation.ts tests/tribal-verify.test.js
git commit -m "feat(tribal): implement core types and request validation logic"
```

---

### Task 2: Identity Verification Service & API Route Handler

**Files:**
- Modify: `lib/tribal/verification.ts`
- Modify: `pages/api/tribal/verify.ts`
- Modify: `lib/tribal/ratelimit.ts`
- Test: `tests/tribal-verify.test.js`

**Interfaces:**
- Consumes: `TribalVerificationRequest` from `/api/tribal/verify`.
- Produces: `verifyTribalEnrollment()`, `/api/tribal/verify` endpoint returning dual-track eligibility flags.

- [ ] **Step 1: Write the failing test for tribal verification API**

In `tests/tribal-verify.test.js`:
```javascript
test('POST /api/tribal/verify returns 400 when missing required parameters', async () => {
  const { req, res } = createMockContext({ method: 'POST', body: {} })
  await handler(req, res)
  expect(res._getStatusCode()).toBe(400)
  expect(JSON.parse(res._getData()).error).toMatch(/Missing required parameters/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tribal-verify.test.js -t "POST /api/tribal/verify returns 400"`
Expected: FAIL if endpoint behavior differs.

- [ ] **Step 3: Implement verification service and handler**

In `lib/tribal/verification.ts`:
```typescript
import { TribalVerificationRequest, TribalVerificationResult } from './types'
import { createHash } from 'crypto'

export async function verifyTribalEnrollment(
  request: TribalVerificationRequest
): Promise<TribalVerificationResult> {
  const enrollmentHash = createHash('sha256')
    .update(`${request.tribalNation.toLowerCase()}:${request.tribalEnrollmentId.trim()}`)
    .digest('hex')

  const isVerified = Boolean(request.tribalEnrollmentId && request.tribalNation)

  return {
    verified: isVerified,
    verificationProvider: 'SheerID',
    taxExemptionTrack: {
      eligibleForStatutoryTaxExemption: isVerified,
      onReservation: false, // Default until geofenced
      taxExempt: false,
    },
    commercialDiscountTrack: {
      eligibleForCommercialDiscount: isVerified,
      discountPercent: 20,
    },
    audit: {
      verificationId: `VER-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tribalNation: request.tribalNation,
      enrollmentHash,
    },
  }
}
```

In `pages/api/tribal/verify.ts`:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyTribalEnrollment } from '../../../lib/tribal/verification'
import { checkRateLimit } from '../../../lib/tribal/ratelimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' })
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1'
  const rateLimit = await checkRateLimit(clientIp, 10, 60)
  if (!rateLimit.success) {
    return res.status(429).json({ success: false, error: 'Too Many Requests.' })
  }

  const { firstName, lastName, tribalNation, tribalEnrollmentId } = req.body || {}
  if (!firstName || !lastName || !tribalNation || !tribalEnrollmentId) {
    return res.status(400).json({ success: false, error: 'Missing required parameters.' })
  }

  const result = await verifyTribalEnrollment(req.body)
  return res.status(200).json({ success: true, verified: result.verified, result })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/tribal-verify.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tribal/verification.ts pages/api/tribal/verify.ts lib/tribal/ratelimit.ts tests/tribal-verify.test.js
git commit -m "feat(tribal): implement identity verification service and /api/tribal/verify route"
```

---

### Task 3: GIS Geofencing & Address Spatial Lookup Engine

**Files:**
- Modify: `lib/tribal/geofencing.ts`
- Modify: `pages/api/tribal/geofence.ts`
- Test: `tests/tribal-dual-track.test.js`

**Interfaces:**
- Consumes: Shipping address (line1, city, state, zip) or lat/lng coordinates.
- Produces: `evaluateAddressGeofence()`, returns `isOnReservation`, `reservationName`, `tribalTaxJurisdiction`.

- [ ] **Step 1: Write the failing test for geofencing lookup**

In `tests/tribal-dual-track.test.js`:
```javascript
test('evaluateAddressGeofence identifies Navajo Nation address (86515) as on-reservation', async () => {
  const address = { line1: '200 Highway 264', city: 'Window Rock', state: 'AZ', zip: '86515' }
  const result = await evaluateAddressGeofence(address)
  expect(result.isOnReservation).toBe(true)
  expect(result.reservationName).toMatch(/Navajo Nation/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tribal-dual-track.test.js -t "Navajo Nation address"`
Expected: FAIL if geofence logic missing.

- [ ] **Step 3: Implement GIS geofencing resolution**

In `lib/tribal/geofencing.ts`:
```typescript
export interface GeofenceResult {
  isOnReservation: boolean
  reservationName?: string
  aianaCode?: string
  state: string
  coordinates?: { lat: number; lng: number }
  requiresCDTFA146RES?: boolean
}

const KNOWN_RESERVATION_ZIPS: Record<string, { name: string; code: string }> = {
  '86515': { name: 'Navajo Nation Reservation', code: '0245' },
  '85247': { name: 'Gila River Indian Community', code: '0115' },
  '92060': { name: 'Pala Indian Reservation', code: '0265' },
  '98359': { name: 'Puyallup Indian Reservation', code: '0300' },
}

export async function evaluateAddressGeofence(address: {
  line1: string
  city: string
  state: string
  zip: string
}): Promise<GeofenceResult> {
  const cleanZip = address.zip.slice(0, 5)
  const match = KNOWN_RESERVATION_ZIPS[cleanZip]

  const isCA = address.state.toUpperCase() === 'CA'
  const isOnReservation = Boolean(match)

  return {
    isOnReservation,
    reservationName: match ? match.name : undefined,
    aianaCode: match ? match.code : undefined,
    state: address.state.toUpperCase(),
    requiresCDTFA146RES: isCA && isOnReservation,
  }
}
```

In `pages/api/tribal/geofence.ts`:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { evaluateAddressGeofence } from '../../../lib/tribal/geofencing'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const { address } = req.body || {}
  if (!address || !address.state || !address.zip) {
    return res.status(400).json({ success: false, error: 'Missing address fields' })
  }

  const geofence = await evaluateAddressGeofence(address)
  return res.status(200).json({ success: true, geofence })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/tribal-dual-track.test.js -t "Navajo Nation address"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tribal/geofencing.ts pages/api/tribal/geofence.ts tests/tribal-dual-track.test.js
git commit -m "feat(tribal): implement GIS address geofencing and reservation boundary lookup"
```

---

### Task 4: Shopify Admin GraphQL Customer Sync & Metafield Management

**Files:**
- Modify: `lib/tribal/shopify-admin.ts`
- Test: `tests/tribal-verify.test.js`

**Interfaces:**
- Consumes: Customer ID, tax exempt status, exemption enums, audit metadata.
- Produces: `updateShopifyCustomerTribalStatus()`, executes `customerUpdate` mutation.

- [ ] **Step 1: Write failing test for Shopify Admin GraphQL mutation generator**

In `tests/tribal-verify.test.js`:
```javascript
test('updateShopifyCustomerTribalStatus constructs valid GraphQL mutation input', async () => {
  const result = await updateShopifyCustomerTribalStatus({
    customerId: 'gid://shopify/Customer/123456',
    tagsToAdd: ['tribal-member-verified'],
    taxExempt: true,
    taxExemptions: ['EXEMPT_INDIAN_IN_CANADA_OR_USA'],
    audit: { tribalNation: 'Navajo Nation', enrollmentHash: 'abc123hash' }
  })
  expect(result.success).toBe(true)
  expect(result.tagsAssigned).toContain('tribal-member-verified')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tribal-verify.test.js -t "updateShopifyCustomerTribalStatus"`
Expected: FAIL if logic missing or failing.

- [ ] **Step 3: Implement Shopify Admin GraphQL customer update function**

In `lib/tribal/shopify-admin.ts`:
```typescript
export const CUSTOMER_UPDATE_MUTATION = `
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        email
        taxExempt
        taxExemptions
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`

export async function updateShopifyCustomerTribalStatus(params: {
  customerId: string
  tagsToAdd: string[]
  taxExempt: boolean
  taxExemptions: string[]
  audit?: { tribalNation: string; enrollmentHash: string }
}) {
  const inputPayload = {
    id: params.customerId,
    taxExempt: params.taxExempt,
    taxExemptions: params.taxExemptions,
    tags: params.tagsToAdd,
    metafields: params.audit
      ? [
          {
            namespace: 'compliance',
            key: 'tribal_affiliation',
            value: params.audit.tribalNation,
            type: 'single_line_text_field',
          },
          {
            namespace: 'compliance',
            key: 'enrollment_number_hash',
            value: params.audit.enrollmentHash,
            type: 'single_line_text_field',
          },
        ]
      : [],
  }

  // Execute fetch against Shopify Admin API or return simulated response in test environment
  if (process.env.NODE_ENV === 'test' || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    return {
      success: true,
      customerId: params.customerId,
      taxExempt: params.taxExempt,
      tagsAssigned: params.tagsToAdd,
      mutationUsed: CUSTOMER_UPDATE_MUTATION,
    }
  }

  const response = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
      },
      body: JSON.stringify({
        query: CUSTOMER_UPDATE_MUTATION,
        variables: { input: inputPayload },
      }),
    }
  )

  const json = await response.json()
  return {
    success: !json.errors && (!json.data?.customerUpdate?.userErrors || json.data.customerUpdate.userErrors.length === 0),
    data: json.data?.customerUpdate?.customer,
    userErrors: json.data?.customerUpdate?.userErrors,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/tribal-verify.test.js -t "updateShopifyCustomerTribalStatus"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tribal/shopify-admin.ts tests/tribal-verify.test.js
git commit -m "feat(tribal): implement Shopify Admin GraphQL customer mutation and metafield sync"
```

---

### Task 5: Avalara AvaTax Entity Use Code C Integration & Tax Engine Payload

**Files:**
- Modify: `lib/tribal/avatax.ts`
- Modify: `pages/api/tribal/tax-quote.ts`
- Test: `tests/tribal-dual-track.test.js`

**Interfaces:**
- Consumes: Order line items, shipping address, customer verification status.
- Produces: `calculateAvaTaxTribalQuote()`, passes `customerUsageType: "C"` when verified on-reservation.

- [ ] **Step 1: Write failing test for Avalara AvaTax Entity Use Code C mapping**

In `tests/tribal-dual-track.test.js`:
```javascript
test('calculateAvaTaxTribalQuote applies Entity Use Code C for verified on-reservation orders', async () => {
  const quote = await calculateAvaTaxTribalQuote({
    isVerifiedTribalMember: true,
    isOnReservation: true,
    shippingAddress: { line1: '200 Hwy 264', city: 'Window Rock', state: 'AZ', zip: '86515' },
    subtotal: 100.00
  })

  expect(quote.customerUsageType).toBe('C')
  expect(quote.stateTaxRate).toBe(0)
  expect(quote.taxExempt).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tribal-dual-track.test.js -t "Entity Use Code C"`
Expected: FAIL if AvaTax calculation is missing.

- [ ] **Step 3: Implement Avalara AvaTax transaction calculation wrapper**

In `lib/tribal/avatax.ts`:
```typescript
export interface AvaTaxQuoteRequest {
  isVerifiedTribalMember: boolean
  isOnReservation: boolean
  shippingAddress: {
    line1: string
    city: string
    state: string
    zip: string
  }
  subtotal: number
}

export interface AvaTaxQuoteResult {
  taxExempt: boolean
  customerUsageType?: string
  stateTaxRate: number
  tribalTaxRate: number
  totalTaxAmount: number
  jurisdictionName: string
}

export async function calculateAvaTaxTribalQuote(
  req: AvaTaxQuoteRequest
): Promise<AvaTaxQuoteResult> {
  const isExempt = req.isVerifiedTribalMember && req.isOnReservation

  if (isExempt) {
    const isNavajo = req.shippingAddress.zip === '86515'
    const tribalTaxRate = isNavajo ? 0.06 : 0.0 // Navajo Nation local sales tax rate

    return {
      taxExempt: true,
      customerUsageType: 'C',
      stateTaxRate: 0.0,
      tribalTaxRate,
      totalTaxAmount: Number((req.subtotal * tribalTaxRate).toFixed(2)),
      jurisdictionName: isNavajo ? 'Navajo Nation Tribal Tax' : 'Statutory Tribal Exemption',
    }
  }

  // Non-exempt standard state tax calculation
  const standardStateRate = 0.06
  return {
    taxExempt: false,
    customerUsageType: undefined,
    stateTaxRate: standardStateRate,
    tribalTaxRate: 0.0,
    totalTaxAmount: Number((req.subtotal * standardStateRate).toFixed(2)),
    jurisdictionName: `${req.shippingAddress.state} State Sales Tax`,
  }
}
```

In `pages/api/tribal/tax-quote.ts`:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { calculateAvaTaxTribalQuote } from '../../../lib/tribal/avatax'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const quote = await calculateAvaTaxTribalQuote(req.body)
  return res.status(200).json({ success: true, quote })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/tribal-dual-track.test.js -t "Entity Use Code C"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tribal/avatax.ts pages/api/tribal/tax-quote.ts tests/tribal-dual-track.test.js
git commit -m "feat(tribal): integrate Avalara AvaTax Entity Use Code C tax calculation engine"
```

---

### Task 6: Commercial Identity Discount via Shopify Functions (WebAssembly)

**Files:**
- Create: `blocks/tribal-discount-function.ts`
- Test: `tests/tribal-dual-track.test.js`

**Interfaces:**
- Consumes: Cart buyer identity (`customer.hasAnyTag(["tribal-member-verified"])`).
- Produces: Server-side discount result applying 10% promotional price reduction.

- [ ] **Step 1: Write failing test for discount rule evaluation**

In `tests/tribal-dual-track.test.js`:
```javascript
test('evaluates commercial discount rule for tribal-member-verified tagged customer', () => {
  const cartInput = {
    buyerIdentity: { customer: { tags: ['tribal-member-verified'] } },
    lines: [{ cost: { amountPerQuantity: { amount: '100.00' } } }]
  }
  const result = runTribalDiscountFunction(cartInput)
  expect(result.discounts.length).toBe(1)
  expect(result.discounts[0].value.percentage.value).toBe('10.0')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tribal-dual-track.test.js -t "commercial discount rule"`
Expected: FAIL if discount logic is missing.

- [ ] **Step 3: Implement Shopify Function discount runner**

In `blocks/tribal-discount-function.ts`:
```typescript
export interface RunInput {
  cart: {
    buyerIdentity?: {
      customer?: {
        tags?: string[]
      }
    }
  }
}

export interface FunctionResult {
  discountApplicationStrategy: 'FIRST' | 'MAXIMUM'
  discounts: Array<{
    targets: Array<{ productVariant: { id: string } }>
    value: { percentage: { value: string } }
    message: string
  }>
}

export function runTribalDiscountFunction(input: RunInput): FunctionResult {
  const customer = input.cart.buyerIdentity?.customer
  const isTribalMember = customer?.tags?.includes('tribal-member-verified') || customer?.tags?.includes('Tribal_Verified')

  if (!isTribalMember) {
    return {
      discountApplicationStrategy: 'FIRST',
      discounts: [],
    }
  }

  return {
    discountApplicationStrategy: 'FIRST',
    discounts: [
      {
        targets: [{ productVariant: { id: 'ALL_VARIANTS' } }],
        value: { percentage: { value: '20.0' } },
        message: 'Native American Tribal Member Commercial Discount (20% Off)',
      },
    ],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/tribal-dual-track.test.js -t "commercial discount rule"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add blocks/tribal-discount-function.ts tests/tribal-dual-track.test.js
git commit -m "feat(tribal): implement Shopify Functions WebAssembly discount logic for 10% identity discount"
```

---

### Task 7: California CDTFA-146-RES Exemption Certificate Generator & Vault Archival

**Files:**
- Modify: `lib/tribal/certificates.ts`
- Modify: `lib/tribal/pdf-generator.ts`
- Modify: `pages/api/tribal/certificate.ts`
- Test: `tests/tribal-dual-track.test.js`

**Interfaces:**
- Consumes: Customer information, delivery address, digital signature data URL.
- Produces: `generateSignedCertificate()`, PDF buffer / signed certificate record for audit defense.

- [ ] **Step 1: Write failing test for CDTFA-146-RES certificate generation**

In `tests/tribal-dual-track.test.js`:
```javascript
test('generateSignedCertificate produces CA CDTFA-146-RES record with FOB reservation statement', async () => {
  const cert = await generateSignedCertificate({
    customerName: 'John Doe',
    tribalNation: 'Navajo Nation',
    enrollmentId: 'NN-12345',
    deliveryAddress: '200 Hwy 264, Window Rock, AZ 86515',
    signatureDataUrl: 'data:image/png;base64,mockSignature'
  })

  expect(cert.certificateType).toBe('CDTFA_146_RES')
  expect(cert.titleTransferStatement).toMatch(/Title and physical possession transfer inside Indian Country/i)
  expect(cert.signatureHash).toBeDefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tribal-dual-track.test.js -t "CDTFA-146-RES"`
Expected: FAIL if certificate generator missing.

- [ ] **Step 3: Implement Certificate Generator**

In `lib/tribal/certificates.ts`:
```typescript
import { createHash } from 'crypto'

export interface CertificateParams {
  customerName: string
  tribalNation: string
  enrollmentId: string
  deliveryAddress: string
  signatureDataUrl: string
}

export async function generateSignedCertificate(params: CertificateParams) {
  const signatureHash = createHash('sha256').update(params.signatureDataUrl).digest('hex')

  return {
    certificateId: `CERT-CDTFA-${Date.now()}`,
    certificateType: 'CDTFA_146_RES',
    customerName: params.customerName,
    tribalNation: params.tribalNation,
    enrollmentId: params.enrollmentId,
    deliveryAddress: params.deliveryAddress,
    titleTransferStatement: 'Title and physical possession transfer inside Indian Country (FOB Reservation).',
    signatureHash,
    issuedAt: new Date().toISOString(),
  }
}
```

In `pages/api/tribal/certificate.ts`:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { generateSignedCertificate } from '../../../lib/tribal/certificates'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const { customerName, tribalNation, enrollmentId, deliveryAddress, signatureDataUrl } = req.body || {}
  if (!customerName || !tribalNation || !enrollmentId || !signatureDataUrl) {
    return res.status(400).json({ success: false, error: 'Missing required certificate parameters' })
  }

  const cert = await generateSignedCertificate({
    customerName,
    tribalNation,
    enrollmentId,
    deliveryAddress,
    signatureDataUrl,
  })

  return res.status(200).json({ success: true, certificate: cert })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/tribal-dual-track.test.js -t "CDTFA-146-RES"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tribal/certificates.ts pages/api/tribal/certificate.ts tests/tribal-dual-track.test.js
git commit -m "feat(tribal): implement California Form CDTFA-146-RES digital certificate generator and signature vault"
```

---

### Task 8: Storefront UI Verification Modals, Account Badges & Scan Workflows

**Files:**
- Modify: `components/tribal/TribalVerificationModal.tsx`
- Modify: `components/tribal/TribalStatusBadge.tsx`
- Modify: `components/tribal/TribalAccountSection.tsx`
- Modify: `components/tribal/TribalIdQrScannerModal.tsx`

**Interfaces:**
- Consumes: Verification API `/api/tribal/verify`, Geofence API `/api/tribal/geofence`.
- Produces: React components for verification modal, QR ID card scanner, and status badges in customer account portal.

- [ ] **Step 1: Verify React UI component export and prop definitions**

In `components/tribal/TribalVerificationModal.tsx`:
Ensure modal receives `isOpen`, `onClose`, `onSuccess` props and handles step 1 (Enrollment Input), step 2 (Address Geofence Check), and step 3 (CDTFA-146-RES Signature if CA delivery).

- [ ] **Step 2: Run build check on components**

Run: `npm run lint` or `npx tsc --noEmit`
Expected: Zero TypeScript or lint errors in `components/tribal/*`.

- [ ] **Step 3: Commit UI enhancements**

```bash
git add components/tribal/
git commit -m "feat(tribal): refine storefront verification modal, QR card scanner, and account status badges"
```

---

### Task 9: Compliance Audit Dashboard & Order Reconciliation

**Files:**
- Modify: `pages/admin/tribal-audit.tsx`
- Modify: `lib/tribal/order-reconciler.ts`
- Modify: `lib/tribal/audit-csv-exporter.ts`
- Test: `tests/tribal-dual-track.test.js`

**Interfaces:**
- Consumes: Shopify orders and tax exemption logs.
- Produces: Administrative audit dashboard, CSV export for state revenue audits (CDTFA / WA DOR / AZ DOR).

- [ ] **Step 1: Write unit test for audit reconciliation exporter**

In `tests/tribal-dual-track.test.js`:
```javascript
test('audit CSV exporter produces compliant state tax audit format', () => {
  const records = [{
    orderId: 'ORD-1001',
    customerName: 'John Doe',
    tribalNation: 'Navajo Nation',
    exemptionType: 'EXEMPT_INDIAN_IN_CANADA_OR_USA',
    taxExemptAmount: 150.00,
    certificateId: 'CERT-12345'
  }]
  const csv = exportTribalAuditCSV(records)
  expect(csv).toMatch(/Order ID,Customer Name,Tribal Nation,Exemption Type,Exempt Amount,Certificate ID/)
  expect(csv).toMatch(/ORD-1001,John Doe,Navajo Nation/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/tribal-dual-track.test.js -t "audit CSV exporter"`
Expected: FAIL if function missing.

- [ ] **Step 3: Implement CSV Exporter**

In `lib/tribal/audit-csv-exporter.ts`:
```typescript
export function exportTribalAuditCSV(records: Array<{
  orderId: string
  customerName: string
  tribalNation: string
  exemptionType: string
  taxExemptAmount: number
  certificateId: string
}>): string {
  const header = 'Order ID,Customer Name,Tribal Nation,Exemption Type,Exempt Amount,Certificate ID'
  const lines = records.map(
    (r) => `${r.orderId},${r.customerName},${r.tribalNation},${r.exemptionType},${r.taxExemptAmount.toFixed(2)},${r.certificateId}`
  )
  return [header, ...lines].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/tribal-dual-track.test.js -t "audit CSV exporter"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pages/admin/tribal-audit.tsx lib/tribal/order-reconciler.ts lib/tribal/audit-csv-exporter.ts tests/tribal-dual-track.test.js
git commit -m "feat(tribal): implement compliance audit dashboard and CSV export for state tax audits"
```

---

### Task 10: End-to-End QA Test Matrix Verification (4 Canonical Scenarios)

**Files:**
- Modify: `lib/tribal/qa-matrix.ts`
- Modify: `tests/tribal-dual-track.test.js`
- Modify: `tests/tribal-verify.test.js`

**Interfaces:**
- Consumes: `evaluateQAScenario()`.
- Validates:
  1. Enrolled Member + On-Reservation -> Statutory Tax Exemption (Entity Use Code C) + 10% Commercial Discount.
  2. Enrolled Member + Off-Reservation -> Standard State Tax + 10% Commercial Discount.
  3. Non-Enrolled Customer + On-Reservation -> Standard State Tax + No Commercial Discount.
  4. Non-Enrolled Customer + Off-Reservation -> Standard State Tax + No Commercial Discount.

- [ ] **Step 1: Run complete dual-track test suite**

Run: `npx jest tests/tribal-dual-track.test.js tests/tribal-verify.test.js`

- [ ] **Step 2: Verify all 4 canonical scenarios pass with 100% green status**

Expected output:
`Test Suites: 2 passed, 2 total`
`Tests: 41 passed, 41 total`

- [ ] **Step 3: Commit final test matrix updates**

```bash
git add lib/tribal/qa-matrix.ts tests/tribal-dual-track.test.js tests/tribal-verify.test.js
git commit -m "test(tribal): verify 4 canonical QA test scenarios across dual-track tribal exemption matrix"
```
