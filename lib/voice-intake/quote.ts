/**
 * get_repair_quote tool logic (ported from rev5 app/api/pricing/quote).
 * Tier 3 (logic board / micro-soldering / liquid damage) is never priced:
 * the agent is told to escalate via escalate_tier3_ticket instead.
 */
import { z } from 'zod'
import { calculateQuote, taxRateForZip, ServiceTier } from './pricing.ts'

export const QUOTABLE_REPAIR_TYPES = [
  'screen_aftermarket',
  'screen_oem',
  'battery',
  'charging_port',
  'camera',
  'back_glass',
] as const

/** Repair types that are Tier 3 and must be escalated, never quoted. */
export const TIER3_REPAIR_TYPES = [
  'logic_board',
  'motherboard',
  'micro_soldering',
  'liquid_damage',
  'water_damage',
  'data_recovery',
  'no_power',
  'tier3',
  'tier_3',
] as const

export const RepairQuoteSchema = z.object({
  device_brand: z.enum(['Apple', 'Samsung', 'Google', 'Motorola', 'Other']).optional(),
  device_model: z.string().trim().min(1).max(120),
  repair_type: z.enum([...QUOTABLE_REPAIR_TYPES, ...TIER3_REPAIR_TYPES]),
  is_b2b: z.boolean().optional().default(false),
  zip_code: z.string().regex(/^\d{5}$/, 'zip_code must be 5 digits').optional().default('99201'),
})

const REPAIR_TYPE_TIER: Record<(typeof QUOTABLE_REPAIR_TYPES)[number], ServiceTier> = {
  battery: ServiceTier.TIER_1_POWER,
  charging_port: ServiceTier.TIER_1_POWER,
  screen_aftermarket: ServiceTier.TIER_2_DISPLAY,
  screen_oem: ServiceTier.TIER_2_DISPLAY,
  camera: ServiceTier.TIER_2_DISPLAY,
  back_glass: ServiceTier.TIER_2_DISPLAY,
}

const TIER_LABEL: Record<ServiceTier, string> = {
  [ServiceTier.TIER_1_POWER]: 'Tier 1',
  [ServiceTier.TIER_2_DISPLAY]: 'Tier 2',
  [ServiceTier.TIER_3_BOARD]: 'Tier 3',
}

const TIER_ESTIMATED_MINUTES: Record<ServiceTier, number> = {
  [ServiceTier.TIER_1_POWER]: 25,
  [ServiceTier.TIER_2_DISPLAY]: 45,
  [ServiceTier.TIER_3_BOARD]: 0,
}

// Genuine OEM parts cost more than the aftermarket baseline (rev5 route layer).
const OEM_PARTS_MULTIPLIER = 1.7
const B2B_LABOR_DISCOUNT = 0.15

export const TIER3_ESCALATION_MESSAGE =
  'This is a Tier 3 repair (logic board, micro-soldering, liquid damage or data recovery). ' +
  'Do not quote a price. Escalate it with the escalate_tier3_ticket tool so a lead technician can review it and call the customer back.'

const round2 = (n: number) => Math.round(n * 100) / 100

export type QuoteResult =
  | { status: 400; body: { success: false; error: string } }
  | { status: 200; body: Record<string, unknown> }

export function buildRepairQuote(input: unknown): QuoteResult {
  const parsed = RepairQuoteSchema.safeParse(input ?? {})
  if (!parsed.success) {
    return { status: 400, body: { success: false, error: parsed.error.issues[0]?.message || 'Invalid quote request' } }
  }

  const { device_model, repair_type, is_b2b, zip_code } = parsed.data

  if ((TIER3_REPAIR_TYPES as readonly string[]).includes(repair_type)) {
    return {
      status: 200,
      body: {
        success: false,
        quote_available: false,
        tier: TIER_LABEL[ServiceTier.TIER_3_BOARD],
        requires_escalation: true,
        escalation_tool: 'escalate_tier3_ticket',
        message: TIER3_ESCALATION_MESSAGE,
      },
    }
  }

  const tier = REPAIR_TYPE_TIER[repair_type as (typeof QUOTABLE_REPAIR_TYPES)[number]]
  const quote = calculateQuote(tier, zip_code, { model: device_model })

  let partsCost = quote.partsCost
  if (repair_type === 'screen_oem') partsCost = round2(partsCost * OEM_PARTS_MULTIPLIER)

  const laborCost = quote.laborCost
  const discountApplied = is_b2b ? round2(laborCost * B2B_LABOR_DISCOUNT) : 0
  const discountedLabor = round2(laborCost - discountApplied)
  const markupOverhead = round2(quote.overhead)
  const subtotal = round2(partsCost + discountedLabor + markupOverhead)
  const salesTax = round2(subtotal * taxRateForZip(zip_code))
  const totalOutTheDoor = round2(subtotal + salesTax)

  return {
    status: 200,
    body: {
      success: true,
      quote_available: true,
      tier: TIER_LABEL[tier],
      parts_cost: partsCost,
      labor_cost: discountedLabor,
      markup_overhead: markupOverhead,
      discount_applied: discountApplied,
      subtotal,
      wa_sales_tax_9_1: salesTax,
      sales_tax_rate: taxRateForZip(zip_code),
      total_out_the_door: totalOutTheDoor,
      estimated_duration_minutes: TIER_ESTIMATED_MINUTES[tier],
    },
  }
}
