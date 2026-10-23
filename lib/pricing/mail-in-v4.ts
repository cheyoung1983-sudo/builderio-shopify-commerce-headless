/**
 * Mail-in repair pricing, Pricing Sheet V4 (Finance).
 *
 *   retail = ceil(partCost x 1.8 + 75)         (PART_MULTIPLIER 1.8, LABOR_FEE 75)
 *   battery add-on (in a screen+battery bundle) = V4 battery retail - 25
 *
 * The formula helpers are for SERVER-SIDE use only (e.g. the triage/quote API,
 * which reads `dcp.part_cost`). Wholesale part cost must never be bundled into
 * client code; the storefront estimator imports only the retail constants below.
 */
export const V4_PART_MULTIPLIER = 1.8
export const V4_LABOR_FEE = 75
export const V4_BATTERY_ADDON_DISCOUNT = 25

export function v4RetailPrice(partCost: number): number {
  if (!Number.isFinite(partCost) || partCost < 0) throw new Error('partCost must be a non-negative number')
  return Math.ceil(partCost * V4_PART_MULTIPLIER + V4_LABOR_FEE)
}

export function v4BatteryAddonPrice(batteryPartCost: number): number {
  return Math.max(0, v4RetailPrice(batteryPartCost) - V4_BATTERY_ADDON_DISCOUNT)
}

export interface MailInDeviceRetail {
  id: string
  name: string
  /** Screen + battery bundle retail price (USD), V4 sheet. */
  bundleRetail: number
  estimatedTatHours: string
}

/** Retail-only constants from the V4 sheet. No wholesale cost here. */
export const MAIL_IN_V4_BUNDLES: MailInDeviceRetail[] = [
  { id: 'iphone-12', name: 'iPhone 12', bundleRetail: 215.0, estimatedTatHours: '24-48 hrs' },
  { id: 'iphone-13', name: 'iPhone 13', bundleRetail: 242.31, estimatedTatHours: '24-48 hrs' },
  { id: 'iphone-14', name: 'iPhone 14', bundleRetail: 281.6, estimatedTatHours: '24-48 hrs' },
  { id: 'galaxy-s21', name: 'Samsung Galaxy S21', bundleRetail: 252.8, estimatedTatHours: '24-48 hrs' },
  { id: 'galaxy-s22', name: 'Samsung Galaxy S22', bundleRetail: 288.8, estimatedTatHours: '24-48 hrs' },
]
