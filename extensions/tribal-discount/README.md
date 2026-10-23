# Tribal Member 20% Discount (Shopify Discount Function)

Replaces the old storefront-only `blocks/tribal-discount-function.ts`, which never ran at checkout.

## What it does

Target `cart.lines.discounts.generate.run`, discount class **PRODUCT**.

| Rule | How it's decided |
| --- | --- |
| Customer qualifies | Customer tag `tribal-member-verified` (legacy `Tribal_Verified` also accepted) |
| Line qualifies | Product tag `tribal-eligible` (screen / repair products: parts + labor) |
| Never discounted | Product tags `trip-fee` ($25 mobile trip fee), `battery-addon`, `tribal-excluded` (these win over `tribal-eligible`) |
| Bundles | Product tag `bundle` + metafield `dcp.tribal_eligible_amount` (number, retail $ of the **non-battery** component per unit). Discount = 20% of that amount per item. No metafield = no discount on the bundle ("pending price"). **Flow fills `dcp.tribal_eligible_amount` from the live Shopify variant price of the non-battery component** (e.g. iPhone 16 OLED + battery $227 bundle: `147`, 20% = $29.40 off). |
| Battery-only repairs | Product tag `battery-repair` (not `bundle`). Excluded unless config `batteryOnlyInShop` is `true` (**PENDING RYAN**, default `false`); then 20% in-shop only. Mail-in battery-only (`battery-repair` + `mail-in`) is always excluded. |
| Mail-in | Product tag `mail-in`. With `mailInBundlesOnly` on, only mail-in products also tagged `bundle` qualify. |
| No stacking | Create the discount with `combinesWith` all `false` (below). A Function can't enforce this itself. |

### PENDING RYAN: mail-in rule

`mailInBundlesOnly` defaults to `true` (Finance's recommendation: tribal discount on mail-in only for screen + battery bundles).
Override without a deploy by setting the discount metafield `$app:tribal-discount.function-configuration` (type `json`):

```json
{ "mailInBundlesOnly": true, "batteryOnlyInShop": false }
```

Mail-in screen-only and battery-only are priced "Quoted at intake" in the storefront estimator (no hardcoded prices).

API version: `2026-10` (latest stable Functions API, verified on shopify.dev 2026-10-23). After bumping, run `npm run typegen` / `shopify app function schema`; target `cart.lines.discounts.generate.run` is unchanged.

## Go-live (Flow)

1. `shopify app config link` and put the real `client_id` in `/shopify.app.toml`.
2. `cd extensions/tribal-discount && npm install && npm run typegen` (generates `generated/api.ts`), then from the repo root `shopify app deploy`.
3. Install the app on the store with scopes `write_discounts,read_customers,write_customers,read_products,read_orders`.
4. Find the function ID (`shopify app function info` or Admin GraphQL `shopifyFunctions`), then create the discount:

```graphql
mutation {
  discountAutomaticAppCreate(automaticAppDiscount: {
    title: "Native American Tribal Member 20%"
    functionId: "<FUNCTION_ID>"
    discountClasses: [PRODUCT]
    startsAt: "2026-11-01T00:00:00Z"
    combinesWith: { productDiscounts: false, orderDiscounts: false, shippingDiscounts: false }
    metafields: [{ namespace: "$app:tribal-discount", key: "function-configuration", type: "json", value: "{\"mailInBundlesOnly\":true,\"batteryOnlyInShop\":false}" }]
  }) { automaticAppDiscount { discountId } userErrors { field message } }
}
```

5. Tag products: `tribal-eligible` on screen/repair products; `trip-fee` on the trip fee; `battery-addon` on battery add-ons; `bundle` + `dcp.tribal_eligible_amount` on bundles; `mail-in` on mail-in products; `battery-repair` on battery-only repair products.

Tests: `tests/tribal-discount-extension.test.js`.
