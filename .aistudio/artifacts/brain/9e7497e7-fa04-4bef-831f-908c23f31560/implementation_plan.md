# Implementation Plan: RepairRequestBridge Component & Prepaid Shipping Integration

An architectural blueprint to implement the `RepairRequestBridge` component, linking the catalog's phone model selector to the Mail-In Repair workflow with automated brand, model, and symptom pre-filling, coupled with certified 2.0 lb prepaid postage packaging specifications.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following directions were confirmed during Phase 1 clarification:
> - **Bridge Presentation**: Prominent, high-converting banner directly beneath the `DeviceCompatibilityChecker` in the `/products` catalog header with 1-click action.
> - **Pre-Filled Attributes**: Automatically populates device brand, exact hardware model name, and symptom classification derived from the active part category (e.g. Screen & OLED $\to$ `screen_cracked`, Battery $\to$ `battery_degraded`, Charging Port $\to$ `port_audio`).
> - **Shipping Weight & Postage Specification**:
>   - **Maximum Device Shipping Weight**: Modern flagship smartphones (e.g., iPhone 16 Pro Max at 227g / 8.0 oz; Galaxy Z Fold 5 at 253g / 8.9 oz) packaged with anti-static foam inserts and rigid corrugated box weigh between **12 oz and 24 oz (0.75 lb to 1.5 lbs)**.
>   - **Prepaid Postage Rating**: Standardized at **2.0 lbs (32 oz)** via USPS Ground Advantage / UPS Ground with UN3481 lithium-ion battery compliance marking. Customers receive a **100% prepaid return mailer box with zero postage due**.

---

### 1. Overview & Core Concept

- **The Problem**: Customers browsing replacement screens and parts often realize DIY repair requires specialized tools, heating mats, or technical confidence they may not possess. Without an immediate, zero-friction path to professional mail-in service, they abandon the session.
- **The Solution**: The `RepairRequestBridge` detects the user's active device selection (`selectedBrand`, `selectedModel`, `selectedCategory`) and surfaces an intelligent callout:
  - *"Prefer our certified Spokane technicians to install this for your [Device]? We'll send an Electrostatic Mailer with Prepaid Postage (rated up to 2 lbs). Typical turnaround: 24–48 hours."*
- **1-Click Conversion**: Clicking "Book Mail-In Repair" navigates directly to `/services` (or opens the repair intake modal) with pre-populated fields:
  - Brand: `Samsung` / `Apple` / `Google`
  - Model: `Galaxy S23 Ultra` / `iPhone 15 Pro`
  - Problem / Symptom: Automatically mapped from the active part category (e.g. Screen replacement $\to$ *Cracked Glass / Broken OLED / Touch Dead*).
  - Shipping Method: Pre-selected to *Prepaid Electrostatic Foam Mailer Box (0–2 lbs)*.

---

### 2. User Experience & Visual Design

- **Visual Appearance**:
  - Located directly beneath `DeviceCompatibilityChecker` and `ActiveDeviceBanner`.
  - Styled with refined emerald accents (`border-emerald-200/80`, `bg-emerald-50/60`, `text-emerald-900`) and subtle micro-shadows adhering to zero-pill discipline.
  - Displays hardware badge: `[Prepaid Mailer Included: Rated up to 2.0 lbs]` with carrier safety indicators (`UN3481 Ground Transport Certified`).
- **Interactive State Behaviors**:
  - **No Device Selected**: Renders a compact prompt: *"Looking for professional repair? Select your phone model above to generate a customized mail-in repair quote."*
  - **Device Selected**: Dynamically expands to highlight the exact phone model, estimated labor turnaround (24–48h), free return shipping, and the primary CTA: `Book Mail-In Repair for [Model] →`.
  - **Customizable Intake**: Includes an option to toggle between full-page navigation (`/services?brand=...&model=...&symptom=...`) and instant drawer modal launch.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Cell Phone Shipping Weight & Carrier Compliance**
  - *Research Analysis*: Consumer smartphones range from 140g (iPhone SE) to 253g (Galaxy Z Fold 5). Adding a high-density electrostatic foam cavity (4 oz) and a 200 lb test corrugated box (6 oz) results in a maximum package weight under 19 oz (~1.2 lbs).
  - *Implementation Choice*: Standardize shipping label and box specs to **2.0 lbs (32 oz)**. This covers every smartphone on the market with a 33% safety headroom while keeping carrier prepaid tier pricing predictable.
  - *Battery Regulation*: Automatically tags the shipment with UN3481 lithium-ion battery road-transport labels per DOT 49 CFR § 173.185 regulations.

- **Decision 2: Seamless Form Synchronization via URL Parameters & State**
  - *Chosen Approach*: Pass query parameters (`brand`, `model`, `symptom`, `category`) to `/services`, while also updating `MailInRepairRequestForm` to accept `initialDeviceBrand`, `initialDeviceModel`, and `initialSymptoms` props.
  - *Why*: Ensures the pre-fill works reliably regardless of whether the customer clicks a direct link, refreshes the page, or shares the URL.

---

### 4. Technical Architecture & Component Tree

#### Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│              DeviceCompatibilityProvider               │
│  (Holds: selectedBrand, selectedModel, selectedCategory)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   ProductGrid.tsx                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │       DeviceCompatibilityChecker.tsx             │  │
│  │  [Brand: Apple] → [Model: iPhone 15 Pro]         │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │            RepairRequestBridge.tsx               │  │
│  │  "Need us to install it for your iPhone 15 Pro?" │  │
│  │  ✓ Prepaid Return Mailer (rated up to 2.0 lbs)   │  │
│  │  [Book 1-Click Mail-In Repair] →                 │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
└───────────────────────────┼────────────────────────────┘
                            │ (Pre-filled Navigation)
                            ▼
┌────────────────────────────────────────────────────────┐
│        pages/services.tsx & MailInRepairRequestForm    │
│  - Step 1 Device Brand: "Apple"                        │
│  - Step 1 Device Model: "iPhone 15 Pro"                │
│  - Step 1 Symptom: "Cracked Glass / Broken OLED"       │
│  - Step 2 Shipping: "Electrostatic Mailer (Prepaid)"   │
│  - Max Package Weight: "2.0 lbs / 32 oz"               │
└────────────────────────────────────────────────────────┘
```

#### Step-by-Step Implementation Sequence

1. **Category-to-Symptom Mapping Utility (`lib/repair-bridge.ts`)**:
   - Translate active part category IDs (`screen`, `battery`, `port`, `camera`, `backglass`, `all`) into corresponding repair symptom codes (`screen_cracked`, `battery_degraded`, `port_audio`, `camera_sensors`, etc.).
   - Define the certified 2.0 lb prepaid mailer box metadata and carrier specifications.
2. **Build `RepairRequestBridge.tsx` Component**:
   - Create `components/services/RepairRequestBridge.tsx` with responsive layout, device model badges, prepaid shipping trust pills, and 1-click CTA button.
3. **Enhance `MailInRepairRequestForm.tsx` Intake**:
   - Update `MailInRepairRequestFormProps` to accept `initialDeviceBrand`, `initialDeviceModel`, and `initialSymptoms`.
   - Add `useEffect` to parse incoming URL search parameters (`?brand=...&model=...&symptom=...`) so direct links immediately pre-fill step 1.
4. **Integrate Bridge into `ProductGrid.tsx`**:
   - Mount `RepairRequestBridge` directly below `ActiveDeviceBanner` and above the catalog filters.
5. **Verification**:
   - Verify TypeScript compilation (`npm run typecheck`), ESLint compliance (`npm run lint`), and dev server responsiveness on port 3000.
