/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repair pricing engine ported from www.displaycellpros.comrev5
 * (src/lib/pricing.ts). Pure function, no Shopify/DB dependencies.
 * `ServiceTier` is a const object instead of a TS enum so the module also
 * runs under Node's --experimental-strip-types (used by the tests).
 */

export const ServiceTier = {
  TIER_1_POWER: 'TIER_1_POWER',
  TIER_2_DISPLAY: 'TIER_2_DISPLAY',
  TIER_3_BOARD: 'TIER_3_BOARD',
} as const

export type ServiceTier = (typeof ServiceTier)[keyof typeof ServiceTier]

export const TAX_RATES = {
  SPOKANE_CITY: { code: '3202', rate: 0.091, zips: ['99201', '99202', '99203', '99204', '99205', '99207', '99208'] },
  SPOKANE_VALLEY: { code: '3213', rate: 0.09, zips: ['99206', '99212', '99216'] },
  DEFAULT: { code: 'WA-GEN', rate: 0.085, zips: [] as string[] },
}

export interface PricingBreakdown {
  partsCost: number
  laborCost: number
  modelAdjustment: number
  rushFee: number
  dataRecoveryFee: number
  overhead: number
  subtotal: number
  tax: number
  total: number
}

export const PRICING_TIERS: Record<ServiceTier, {
  label: string
  category: string
  baseParts: number
  laborHours: number
  complexity: string
  description: string
}> = {
  [ServiceTier.TIER_1_POWER]: {
    label: 'Battery & Power Systems',
    category: 'Power',
    baseParts: 45,
    laborHours: 0.5,
    complexity: 'Tier 1',
    description: 'Standard battery renewal or charging port FPC refresh. Includes thermal cycling.',
  },
  [ServiceTier.TIER_2_DISPLAY]: {
    label: 'Display & Visual Systems',
    category: 'Screen',
    baseParts: 145,
    laborHours: 1.0,
    complexity: 'Tier 2',
    description: 'Full assembly renewal for OLED or Liquid Retina displays. TrueTone calibration included.',
  },
  [ServiceTier.TIER_3_BOARD]: {
    label: 'Logic Board & Micro-Soldering',
    category: 'Logic Board',
    baseParts: 65,
    laborHours: 3.5,
    complexity: 'Tier 3',
    description: 'Advanced trace restoration, BGA reballing, and data recovery triage.',
  },
}

export function taxRateForZip(zip: string): number {
  if (TAX_RATES.SPOKANE_CITY.zips.includes(zip)) return TAX_RATES.SPOKANE_CITY.rate
  if (TAX_RATES.SPOKANE_VALLEY.zips.includes(zip)) return TAX_RATES.SPOKANE_VALLEY.rate
  return TAX_RATES.DEFAULT.rate
}

/**
 * P_retail = C_parts + (H_labor * $55.00) + (C_parts * 0.95) + Addons
 */
export function calculateQuote(
  tier: ServiceTier,
  zip: string,
  options?: {
    model?: string
    isRush?: boolean
    isDataRecovery?: boolean
  }
): PricingBreakdown {
  const data = PRICING_TIERS[tier]
  const laborRate = 55.0 // Engineering labor rate
  const markupRate = 0.95 // Lab overhead & consumables

  let modelAdjustment = 0
  if (options?.model) {
    const m = options.model.toLowerCase()
    if (m.includes('pro max') || m.includes('ultra') || m.includes('fold') || m.includes('m2')) {
      modelAdjustment = 35.0
    } else if (m.includes('pro') || m.includes('s24') || m.includes('s23') || m.includes('pixel 8')) {
      modelAdjustment = 20.0
    }
  }

  const partsCost = data.baseParts + modelAdjustment
  const laborCost = data.laborHours * laborRate
  const overhead = partsCost * markupRate

  const rushFee = options?.isRush ? 49.0 : 0
  const dataRecoveryFee = options?.isDataRecovery ? 75.0 : 0

  const subtotal = partsCost + laborCost + overhead + rushFee + dataRecoveryFee
  const tax = subtotal * taxRateForZip(zip)
  const total = subtotal + tax

  return { partsCost, laborCost, modelAdjustment, rushFee, dataRecoveryFee, overhead, subtotal, tax, total }
}
