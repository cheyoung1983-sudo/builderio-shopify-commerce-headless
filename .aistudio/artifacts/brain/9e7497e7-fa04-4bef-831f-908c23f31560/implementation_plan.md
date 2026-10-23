# Storefront Recommendations: Parts Compatibility Checker & Unified Repair Hub

An architectural recommendation and implementation blueprint introducing an Interactive Device Compatibility Checker in the catalog header, paired with high-converting Repair Toolkit Bundles, a Free Shipping Progress Bar, and a seamless 1-click bridge to the Mail-In Repair workflow.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following directions were selected during Phase 1 clarification:
> - **Primary Feature**: Interactive Parts Compatibility Checker with dynamic Brand $\to$ Model $\to$ Part Category selection.
> - **Visual & UX Placement**: Pinned prominently in the Catalog Header above the product grid with an active device filter badge and quick-clear capability.
> - **Holistic Scope**: Delivers both e-commerce conversion boosters (Repair Toolkit Bundling, Free Shipping Progress Bar) and direct integration with the store's Mail-In Repair booking workflow.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Dynamic Compatibility Checker**: Shoppers select their device make (Apple, Samsung, Google) and model (e.g. *Galaxy S23 Ultra*, *iPhone 14 Pro*) to instantly filter catalog parts with guaranteed compatibility badges, eliminating fitment anxiety.
  2. **Active Device Context**: Pinned header ribbon displays the current device context across catalog browsing, maintaining active filters even through search and sorting.
  3. **Bundle & Save Toolkits**: Suggests matching repair essentials (precision prying tools, waterproof frame adhesive, magnetic screw mats) alongside replacement screens.
  4. **Mail-In Repair Bridge**: If a customer prefers not to DIY, a "Need us to install it?" card pre-fills their selected device into the Mail-in Repair booking form with 1 click.
- **Target Audience**: DIY repair technicians, phone owners with cracked screens, and mail-in repair clients seeking verified replacement parts without guesswork.
- **Key Value**: Lowers return rates caused by ordering incorrect model variants, boosts conversion confidence, and expands Average Order Value (AOV).

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Device Selection**:
     - User lands on `/products` or clicks "Select Your Phone" in the navbar.
     - A sleek 3-step selector appears in the catalog hero/header:
       `[1. Select Brand] → [2. Select Model] → [3. Select Part Type]`
     - Upon selection, the catalog immediately updates with verified compatible items, decorated with a green `"Guaranteed Fit"` badge.
  2. **Active Filter Ribbon**:
     - A sticky pill/banner appears: *"Showing compatible parts for: Samsung Galaxy S23 Ultra"*, with a *"Change Device"* button and *"Clear"* button.
  3. **Product Detail & Tool Bundling**:
     - Compatible replacement screens show a *"Frequently Paired Repair Kit"* checkbox module (+Waterproof Frame Sealant & +8-piece Magnetic Driver Kit).
  4. **Service Escort (Mail-In Repair)**:
     - A discreet banner below the compatibility results offers: *"Not comfortable repairing this yourself? We can do it for $49 labor with 24h turnaround"*, with a pre-filled link to `/services`.

- **Visual Identity & Styling** *(E-Commerce & Retail)*:
  - Adheres to the storefront's refined theme: clean borders (`border-neutral-200/80`), emerald trust accents (`#059669`), and zero-pill clutter.
  - Device cards feature subtle hover lifts and clean hardware typography (`font-mono` model codes like *SM-S918U* / *A2650*).
  - High-visibility status indicators for genuine OEM vs. premium aftermarket display tiers.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Catalog Indexing vs. Dedicated Backend Engine**
  - *Chosen Approach*: Leverage existing Shopify Storefront product tags (`brand:samsung`, `model:galaxy-s23`, `part:screen`) combined with an optimized local device taxonomy map (`lib/device-taxonomy.ts`).
  - *Why*: Delivers sub-millisecond instant filtering with zero API latency and zero additional database roundtrips.
  - *Alternatives Considered*: Storing compatibility matrices in external SQL tables (overkill for static catalog models, adds latency).

- **Decision 2: Persistent Device Context in Session / Local Storage**
  - *Chosen Approach*: Store the selected device in `localStorage` via a lightweight `DeviceCompatibilityContext`.
  - *Why*: Allows shoppers to navigate between PDPs, catalog pages, and repair booking without losing their device selection.

- **Decision 3: Dual Conversion Strategy (DIY Parts + Pro Service)**
  - *Chosen Approach*: Offer both "Add to Bag" for self-repair and "Book Repair for this Device" in the same view.
  - *Why*: Captures both customer personas without forcing them into separate website silos.

---

### 4. Technical Architecture & Data Strategy

#### Component Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│               DeviceCompatibilityProvider              │
│  (State: activeBrand, activeModel, activeCategory)     │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  DeviceCompatibilityChecker  │   │       ActiveDeviceBar        │
│  [Apple | Samsung | Google]  │   │  "Samsung Galaxy S23 Ultra"  │
│  [Select Model Dropdown    ] │   │  [Change] [Reset Filter]     │
│  [Part: Screen, Battery... ] │   └──────────────┬───────────────┘
└──────────────┬───────────────┘                  │
               │                                  │
               ▼                                  ▼
┌────────────────────────────────────────────────────────┐
│                      ProductGrid                       │
│  Filters products matching device tags/keywords        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                   ProductCard                    │  │
│  │  [✓ Guaranteed Fit for S23 Ultra]                │  │
│  │  [Quick Add]  [Quick View]                       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │               MailInRepairPromoCard              │  │
│  │  "Want us to fix your S23 Ultra? Book Repair"    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### Step-by-Step Implementation Sequence

1. **Device Taxonomy & Data Structure (`lib/device-taxonomy.ts`)**:
   - Define structured lists of supported brands, popular phone series (iPhone 11–16, Galaxy S20–S24, Pixel 6–9), model numbers, and matching catalog search queries/tags.
2. **Context & State Management (`context/DeviceCompatibilityContext.tsx`)**:
   - Provide `useDeviceCompatibility()` hook storing `selectedDevice`, `setDevice()`, `clearDevice()`, and helper `isProductCompatible(product)`.
3. **Compatibility Header Component (`components/products/DeviceCompatibilityChecker.tsx`)**:
   - Visual device selector widget mounted above the catalog grid with search autocomplete and quick brand badges.
4. **Active Device Status Ribbon (`components/products/ActiveDeviceBanner.tsx`)**:
   - Responsive notification bar showing the active vehicle/device filter with 1-click removal.
5. **ProductCard Compatibility Badge**:
   - Shows "Guaranteed Fit" tag when active device matches product tags or title.
6. **Cart Drawer Free Shipping Bar (`components/cart/FreeShippingProgressBar.tsx`)**:
   - Dynamic progress tracker toward free shipping threshold ($75.00).
7. **Verification**:
   - Verify TypeScript compilation, ESLint compliance, and interactive end-to-end filtering across all catalog devices.
