/**
 * Shopify Discount Function (Discount Function API, product discount class):
 * Native American Tribal Member Commercial Discount, 20% off.
 *
 * Rules (documented in ../README.md):
 *  - Customer must carry the tag `tribal-member-verified` (or legacy `Tribal_Verified`).
 *  - Only product lines tagged `tribal-eligible` (screen / repair = parts + labor) qualify.
 *  - Never discounted: products tagged `trip-fee` ($25 mobile trip fee), `battery-addon`,
 *    or `tribal-excluded`, even if also tagged `tribal-eligible`.
 *  - Bundles (tag `bundle`): only the non-battery component is discounted. The product
 *    metafield `dcp.tribal_eligible_amount` holds that component's retail price per unit;
 *    the discount is 20% of it, per item. A bundle without the metafield gets no discount.
 *  - Mail-in products (tag `mail-in`): when `mailInBundlesOnly` is on, only mail-in
 *    bundles qualify. PENDING RYAN; default follows Finance's recommendation (on).
 *  - No stacking: the discount is created with combinesWith all false (see README);
 *    a Function cannot enforce that itself.
 *
 * Kept dependency-free (no generated types) so it can be unit tested with plain Node.
 */

export const TRIBAL_DISCOUNT_PERCENT = 20
export const TRIBAL_DISCOUNT_MESSAGE = 'Native American Tribal Member Commercial Discount (20% Off)'

export interface FunctionConfiguration {
  /** PENDING RYAN: tribal discount on mail-in repairs only for screen + battery bundles. */
  mailInBundlesOnly?: boolean
}

/** Finance recommendation. PENDING RYAN: flip via the discount metafield, no deploy needed. */
export const DEFAULT_CONFIGURATION: Required<FunctionConfiguration> = {
  mailInBundlesOnly: true,
}

export interface RunInput {
  cart: {
    buyerIdentity?: { customer?: { isTribalMember?: boolean } | null } | null
    lines: Array<{
      id: string
      quantity: number
      cost: { amountPerQuantity: { amount: string } }
      merchandise: {
        __typename: string
        id?: string
        product?: {
          tribalEligible?: boolean
          excluded?: boolean
          isBundle?: boolean
          isMailIn?: boolean
          bundleEligibleAmount?: { value: string } | null
        }
      }
    }>
  }
  discount: {
    discountClasses: string[]
    metafield?: { jsonValue?: unknown } | null
  }
}

type Value = { percentage: { value: number } } | { fixedAmount: { amount: string; appliesToEachItem: boolean } }

export interface RunResult {
  operations: Array<{
    productDiscountsAdd: {
      candidates: Array<{
        message: string
        targets: Array<{ cartLine: { id: string } }>
        value: Value
      }>
      selectionStrategy: 'FIRST' | 'ALL' | 'MAXIMUM'
    }
  }>
}

const EMPTY: RunResult = { operations: [] }

export function readConfiguration(input: RunInput): Required<FunctionConfiguration> {
  const raw = input.discount.metafield?.jsonValue
  const cfg = raw && typeof raw === 'object' ? (raw as FunctionConfiguration) : {}
  return {
    mailInBundlesOnly:
      typeof cfg.mailInBundlesOnly === 'boolean' ? cfg.mailInBundlesOnly : DEFAULT_CONFIGURATION.mailInBundlesOnly,
  }
}

export function cartLinesDiscountsGenerateRun(input: RunInput): RunResult {
  if (!input.discount.discountClasses.includes('PRODUCT')) return EMPTY
  if (!input.cart.buyerIdentity?.customer?.isTribalMember) return EMPTY

  const config = readConfiguration(input)
  const percentTargets: Array<{ cartLine: { id: string } }> = []
  const bundleCandidates: RunResult['operations'][number]['productDiscountsAdd']['candidates'] = []

  for (const line of input.cart.lines) {
    const product = line.merchandise.__typename === 'ProductVariant' ? line.merchandise.product : undefined
    if (!product || !product.tribalEligible || product.excluded) continue
    if (product.isMailIn && config.mailInBundlesOnly && !product.isBundle) continue

    if (product.isBundle) {
      const eligible = Number(product.bundleEligibleAmount?.value)
      if (!Number.isFinite(eligible) || eligible <= 0) continue
      const unitPrice = Number(line.cost.amountPerQuantity.amount)
      const base = Number.isFinite(unitPrice) ? Math.min(eligible, unitPrice) : eligible
      const amount = Math.round(base * TRIBAL_DISCOUNT_PERCENT) / 100
      if (amount <= 0) continue
      bundleCandidates.push({
        message: TRIBAL_DISCOUNT_MESSAGE,
        targets: [{ cartLine: { id: line.id } }],
        value: { fixedAmount: { amount: amount.toFixed(2), appliesToEachItem: true } },
      })
      continue
    }

    percentTargets.push({ cartLine: { id: line.id } })
  }

  const candidates = [...bundleCandidates]
  if (percentTargets.length) {
    candidates.push({
      message: TRIBAL_DISCOUNT_MESSAGE,
      targets: percentTargets,
      value: { percentage: { value: TRIBAL_DISCOUNT_PERCENT } },
    })
  }
  if (!candidates.length) return EMPTY

  // ALL: each candidate targets different lines, so every eligible line gets its discount.
  return { operations: [{ productDiscountsAdd: { candidates, selectionStrategy: 'ALL' } }] }
}
