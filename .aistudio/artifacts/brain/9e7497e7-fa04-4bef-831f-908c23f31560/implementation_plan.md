# Quick Add Confirmation Toast & Dev Server Recovery

Resolve dev server launch failure by updating runtime engine compatibility, and integrate an interactive confirmation toast notification in the bottom-right corner when users click 'Quick Add' on catalog product cards.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were confirmed via Phase 1 clarification:
> - **Toast Content**: Shows the product title, unit price, thumbnail image, and a direct "View Cart" action button.
> - **Placement & Duration**: Anchored at the bottom-right corner with a 3-second (3000ms) auto-dismiss countdown bar and hover-to-pause interactivity.
> - **Dev Server Recovery**: Update the strict Node 24 requirement in `package.json` to accommodate the active runtime environment (Node 22 / Bun) without installation rejection.

---

### 1. Overview & Core Concept

- **What It Does**: 
  1. Fixes the dev server startup blocker so that dependencies install cleanly across runtime environments.
  2. Enhances the catalog Quick Add interaction by firing an immediate, rich toast notification displaying the product preview, price, quantity, and a 1-click CTA to open the cart sidebar or navigate to `/cart`.
- **Target Audience**: Storefront shoppers browsing screen replacements and repair parts who want immediate visual confirmation that an item was successfully added to their cart without leaving the catalog view.
- **Key Value**: Delivers frictionless feedback, prevents accidental duplicate clicks, and provides a clear path to checkout while keeping users engaged in the catalog.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Quick Add Trigger**: User clicks the "Quick Add" button on any product card in `/products` or collection pages.
  2. **Card State**: Button displays immediate loading spinner, then momentarily indicates "Added!" with a checkmark.
  3. **Toast Notification Reveal**: A rich toast animates up from the bottom-right (`fixed bottom-5 right-5`), displaying:
     - Emerald shopping bag icon and "Shopping Bag" micro-kicker.
     - Product title and formatted price.
     - 48x48px crisp product thumbnail.
     - "View Cart" primary action button and close `X` dismiss button.
     - Linear progress bar depleting over 3000ms.
  4. **User Action / Auto-Dismiss**:
     - Hovering over the toast pauses the timer.
     - Clicking "View Cart" opens the slide-out cart sidebar or routes to `/cart`.
     - Clicking dismiss closes the notification immediately.
     - After 3 seconds without interaction, the toast smoothly transitions out.

- **Visual Identity & Domain Alignment** *(E-Commerce & Retail)*:
  - Adheres to the storefront's established clean aesthetic with zero-pill metadata and subtle hairline borders (`border-emerald-200/80`).
  - Toast container features rounded-2xl geometry, gentle backdrop blur, and high contrast typography.
  - Motion transitions powered by `motion/react` with spring damping and `popLayout` stack handling.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Use Global Toast Context vs. Local Card State**
  - *Chosen Approach*: Leverage the existing global `ToastContext` (`useToast()`) mounted at the layout root in `components/common/Layout.tsx`.
  - *Why*: Ensures notifications persist across page scrolls, avoids z-index clipping inside card containers, and maintains a unified notification queue.
  - *Alternatives Considered*: Local inline tooltip or alert inside the card body (rejected due to overflow clipping and cramped card layouts).

- **Decision 2: Dev Server Engine Constraint Update**
  - *Chosen Approach*: Expand `package.json` `"engines": { "node": ">=20.0.0" }` or align with runtime `v22.x`/`v24.x`.
  - *Why*: Resolves the `EBADENGINE` failure where package managers refuse installation because Node 22 was present instead of Node 24.
  - *Alternatives Considered*: Bypassing with `--ignore-engines` flags on every install command (rejected because automated container startup scripts invoke default package commands without flags).

---

### 4. Technical Architecture & Data Strategy

#### Component Architecture & Flow Diagram

```
┌────────────────────────────────────────────────────────┐
│                      ProductCard                       │
│  [Quick Add Button]                                    │
└──────────────────────────┬─────────────────────────────┘
                           │ onClick(e)
                           ▼
┌────────────────────────────────────────────────────────┐
│                      ProductGrid                       │
│  handleQuickAddToCart(product)                         │
│  ├── 1. cart.addItem(...)        [CartContext]         │
│  └── 2. showCartToast(...)       [ToastContext]        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   ToastContainer                       │
│  (Mounted globally at bottom-right corner)             │
│  ┌──────────────────────────────────────────────────┐  │
│  │                   ToastItem                      │  │
│  │  [Thumb] Title • Price • [View Cart]  [Close]    │  │
│  │  [======= 3000ms Auto-Dismiss Progress =======]  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### State & Implementation Mapping

1. **`package.json`**:
   - Update `engines.node` to `>=20.0.0` to permit execution in Node 22 and 24 environments.
2. **`components/products/ProductGrid.tsx`**:
   - Import `useToast` from `../../context/ToastContext`.
   - In `handleQuickAddToCart`, invoke `showCartToast` with:
     - `title`: `product.title`
     - `image`: `imageUrl`
     - `price`: formatted price string
     - `variantTitle`: variant title if not default
     - `quantity`: 1
     - `duration`: 3000
     - `onViewBag`: opens cart sidebar via `useUI().openSidebar`
3. **Verification**:
   - Verify dev server build and clean package install.
   - Verify that clicking "Quick Add" increments cart items and triggers the bottom-right toast with thumbnail, title, price, and View Cart CTA.
