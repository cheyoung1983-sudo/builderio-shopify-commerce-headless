# ElevenLabs × Shopify Headless Checkout Integration (Phase 1)

Architectural blueprint and implementation plan for Phase 1 of the ElevenLabs Conversational Voice Agent integration with DisplayCellPros' Shopify headless storefront, enabling real-time inventory checks, variant pricing, programmatic cart creation with custom repair attributes, and seamless handoff to hosted checkout.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions and user amendments are confirmed:
> - **1. Pinned Storefront API Versioning**: Uses `getShopifyApiVersion()` from `config/shopify.ts` (`process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07'`) ensuring 100% parity with Headless sales channel credentials.
> - **2. Tax Exemption & Shopify Flow Boundary**: Custom attribute `_tribal_exemption_requested: "true"` is explicitly scoped for downstream **Shopify Flow** tagging and Avalara customer/order processing. It does not assume immediate tax exemption at Shopify checkout, and the agent explicitly informs the customer of the post-order verification step.
> - **3. Refreshable QR Code Handoff**: Implements `/api/agent/refresh-checkout` (and `/api/agent/cart?action=refresh_checkout`) which accepts `cartId` and queries the latest `cart(id: $cartId) { checkoutUrl }` from Shopify Storefront API on demand, eliminating stale token issues on mobile QR scans.
> - **4. Unified Middleware Endpoint**: `/api/agent/cart` supporting actions: `check_inventory`, `get_pricing`, `create_cart`, `add_lines`, and `refresh_checkout`.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges spoken voice conversations from the ElevenLabs customer service agent directly into Shopify's Storefront API. When a customer confirms a screen repair, battery replacement, or mail-in kit, the agent checks live inventory, calculates pricing, creates a Shopify Cart with custom repair notes, and returns a verified, refreshable `checkoutUrl`.
- **Target Audience**: Retail customers in Spokane, WA requiring fast mobile device repairs, as well as nationwide mail-in repair kit customers.
- **Key Value**: Drastically reduces checkout friction (0 to checkout in under 30 seconds of spoken interaction), guarantees inventory availability before cart creation, and tags repair orders with complete metadata for downstream Shopify Flow automations.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Diagnosis & Voice Quoting**:
   - Customer: *"I have a cracked iPhone 13 Pro screen. How much for Spokane on-site repair today?"*
   - Agent executes `check_inventory` and `get_pricing`, responding: *"We have iPhone 13 Pro OLED displays in stock with 1-year warranty for $199.99, including on-site labor in Spokane."*
2. **Instant Cart Creation**:
   - Customer: *"Great, let's book that for this afternoon. My name is Alex, phone is 509-555-0199, and I have a tribal exemption ID."*
   - Agent executes `create_cart` tool with `variantId`, `quantity`, and custom repair attributes (`_service_type: "Spokane On-Site"`, `_tribal_exemption_requested: "true"`).
3. **Checkout Handoff & Refreshable QR Code**:
   - Agent responds: *"I've created your repair cart and reserved your screen. Click the checkout button or scan the QR code to finalize your appointment."*
   - Interactive Checkout Card appears in the drawer transcript with:
     - Item & Variant Summary (`iPhone 13 Pro Screen Replacement - On-Site Labor Included`)
     - Subtotal, Tax note, and Exemption verification badge
     - Large Primary Button: `Proceed to Secure Checkout →`
     - Dynamic Refreshable QR code linking to a freshly verified `checkoutUrl` for mobile payment.

### Visual Identity & Theme
- **Theme**: Dark obsidian glass modal (`bg-slate-950/95 backdrop-blur-2xl border border-white/10`) with vibrant emerald accents (`#10B981`) and crisp contrast.
- **Card Hierarchy**: High-contrast summary card with tabular pricing figures (`tabular-nums`) and verified security badge (`100% Secure 256-Bit SSL Checkout`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Storefront API GraphQL Mutations with Dynamic Versioning**
  - *Chosen Approach*: Execute GraphQL `cartCreate` and `cartLinesAdd` with `customAttributes` and `buyerIdentity` on the server route `/api/agent/cart` using the configured API version from `config/shopify.ts`.
  - *Why*: Fast execution ($\le 120\text{ms}$), handles multi-item repair kits, and attaches arbitrary metadata without requiring Shopify Plus.
- **Decision 2: Dedicated Refresh Endpoint for QR Code Handoff**
  - *Chosen Approach*: Expose `/api/agent/refresh-checkout` accepting `{ cartId }` to return the newest active `checkoutUrl` directly before rendering the desktop-to-mobile QR code.
  - *Why*: Prevents expired single-session token errors when shoppers scan with their phones.
- **Decision 3: ElevenLabs Tool Definitions Schema Export**
  - *Chosen Approach*: Expose `/api/agent/tools-manifest` returning compliant OpenAPI / ElevenLabs JSON Tool Calling schemas (`check_inventory`, `get_pricing`, `create_repair_cart`, `refresh_checkout`).
  - *Why*: Enables instant copy-paste or webhook synchronization in the ElevenLabs Agent Developer Dashboard.

---

## 4. Technical Architecture & Data Strategy

### ASCII System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ELEVENLABS AGENT                                │
│       (Voice WebSocket / Text Agent Conversation: Spokane Specialist)       │
│                                                                             │
│   Tool Calls:                                                               │
│   - check_inventory(query, deviceModel)                                     │
│   - get_pricing(variantId / handle)                                         │
│   - create_repair_cart(variantId, serviceType, repairNotes, customerInfo)  │
│   - refresh_checkout(cartId)                                                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP POST / Client Dispatch
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 NEXT.JS MIDDLEWARE / API ROUTE (/api/agent/cart)             │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │  Inventory Resolver   │  │   Pricing Engine      │  │  Cart Creator    │ │
│  │  (GraphQL: products)  │  │  (GraphQL: variants)  │  │  (cartCreate)    │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬─────────┘ │
└──────────────┼──────────────────────────┼───────────────────────┼───────────┘
               │                          │                       │
               ▼                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SHOPIFY STOREFRONT API (GraphQL)                      │
│                                                                             │
│  - mutation cartCreate($input: CartInput!) {                                │
│      cart { id, checkoutUrl, totalQuantity, lines, cost }                  │
│    }                                                                        │
│  - query getCart($id: ID!) { cart(id: $id) { id, checkoutUrl } }            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Returns checkoutUrl + Cart ID
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 STOREFRONT CLIENT (ElevenLabsAgent Drawer)                  │
│  - Renders Interactive Checkout Card (CheckoutHandoffCard.tsx)              │
│  - Generates Refreshable QR Code for Desktop Shoppers                       │
│  - Direct Navigation to Shopify Hosted Checkout                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components & Endpoints to Implement

1. **`pages/api/agent/cart.ts`**:
   - `action: "check_inventory"`: Fetches real-time quantity available and inventory status for given SKU or handle.
   - `action: "get_pricing"`: Retrieves current price, compare-at price, and repair warranty info.
   - `action: "create_cart"`: Executes `cartCreate` with line items, buyer email, and custom attributes (`_service_type`, `_device_model`, `_repair_issue`, `_imei_serial`, `_tribal_exemption_requested`).
   - `action: "add_lines"`: Appends additional parts/accessories to an existing cart.
   - `action: "refresh_checkout"`: Queries latest `cart(id: $cartId) { checkoutUrl }`.
2. **`pages/api/agent/refresh-checkout.ts`**:
   - Standalone helper endpoint to retrieve fresh `checkoutUrl` by `cartId`.
3. **`pages/api/agent/tools-manifest.ts`**:
   - Returns ElevenLabs-ready JSON tool schemas with parameter descriptions for the ElevenLabs developer console.
4. **`components/voice/CheckoutHandoffCard.tsx`**:
   - Polished cart handoff card with item thumbnails, price breakdown, repair details, direct checkout CTA, and dynamic QR Code generation with auto-refresh capability.
5. **`components/ElevenLabsAgent.jsx`**:
   - Registers the `create_repair_cart` and `refresh_checkout` client tools to seamlessly render the `CheckoutHandoffCard` in the live conversation transcript.
