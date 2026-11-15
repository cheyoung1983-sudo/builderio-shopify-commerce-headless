/**
 * Single gate for adding the `tribal-member-verified` customer tag in Shopify.
 *
 * EVERY code path that can add the tribal tag must go through
 * `tagTribalCustomerIfAllowed()` (tests enforce that nothing else imports
 * Flow's `updateShopifyCustomerTribalStatus`).
 *
 * TRIBAL_SHOPIFY_TAG_MODE (default `off`):
 *   - `off`        never tag. The reviewer's decision is still recorded.
 *   - `allowlist`  tag only customers listed in TRIBAL_TAG_ALLOWLIST
 *                  (comma-separated Shopify customer GIDs or numeric IDs).
 *   - `on`         tag every customer a human reviewer approved.
 * Any other value is treated as `off` (fails closed).
 *
 * The gate never decides eligibility by itself: callers must only call it
 * after a human reviewer approved an existing pending review record, and they
 * must pass that reviewer's identity (an empty reviewer is refused).
 */
import { updateShopifyCustomerTribalStatus } from './shopify-admin.ts'

type Env = Record<string, string | undefined>

export type TribalTagMode = 'off' | 'allowlist' | 'on'

export const TRIBAL_MEMBER_TAG = 'tribal-member-verified'

export function getTribalShopifyTagMode(env: Env = process.env): TribalTagMode {
  const v = (env.TRIBAL_SHOPIFY_TAG_MODE || '').trim().toLowerCase()
  return v === 'on' || v === 'allowlist' ? v : 'off'
}

const NUMERIC_ID_RE = /^\d+$/
const GID_RE = /^gid:\/\/shopify\/Customer\/\d+$/

/** Normalizes a numeric customer ID or customer GID to a GID; anything else returns null. */
export function normalizeCustomerGid(id: unknown): string | null {
  if (typeof id !== 'string') return null
  const v = id.trim()
  if (GID_RE.test(v)) return v
  if (NUMERIC_ID_RE.test(v)) return `gid://shopify/Customer/${v}`
  return null
}

export function getTribalTagAllowlist(env: Env = process.env): Set<string> {
  const out = new Set<string>()
  for (const part of (env.TRIBAL_TAG_ALLOWLIST || '').split(',')) {
    const gid = normalizeCustomerGid(part)
    if (gid) out.add(gid)
  }
  return out
}

export type TagGateDecision =
  | { allowed: true; mode: TribalTagMode; customerGid: string }
  | { allowed: false; mode: TribalTagMode; reason: 'mode_off' | 'not_allowlisted' | 'invalid_customer' | 'no_reviewer' }

/** Pure check: may this customer be tagged right now? */
export function checkTribalTagGate(customerId: unknown, reviewer: unknown, env: Env = process.env): TagGateDecision {
  const mode = getTribalShopifyTagMode(env)
  if (mode === 'off') return { allowed: false, mode, reason: 'mode_off' }
  if (typeof reviewer !== 'string' || !reviewer.trim()) return { allowed: false, mode, reason: 'no_reviewer' }
  const customerGid = normalizeCustomerGid(customerId)
  if (!customerGid) return { allowed: false, mode, reason: 'invalid_customer' }
  if (mode === 'allowlist' && !getTribalTagAllowlist(env).has(customerGid)) {
    return { allowed: false, mode, reason: 'not_allowlisted' }
  }
  return { allowed: true, mode, customerGid }
}

export function describeTagGateBlock(reason: string): string {
  switch (reason) {
    case 'mode_off':
      return 'Not tagged in Shopify: TRIBAL_SHOPIFY_TAG_MODE is off.'
    case 'not_allowlisted':
      return 'Not tagged in Shopify: customer is not in TRIBAL_TAG_ALLOWLIST.'
    case 'invalid_customer':
      return 'Not tagged in Shopify: no valid Shopify customer on the record.'
    case 'no_reviewer':
      return 'Not tagged in Shopify: no reviewer identity.'
    default:
      return 'Not tagged in Shopify.'
  }
}

export interface GatedTagParams {
  customerId: string | null | undefined
  /** Identity of the human reviewer who approved (Slack user or authenticated admin). */
  reviewer: string
  decidedAt: string
  tribalNation: string
  /** Review record id (stored as the verification reference, never an enrollment number). */
  recordId: string
  maskedEnrollmentId?: string | null
  taxExempt?: boolean
}

export type GatedTagResult =
  | { tagged: true; mode: TribalTagMode; success: boolean; error?: string }
  | { tagged: false; mode: TribalTagMode; success: false; reason: string; note: string }

/**
 * Adds the tribal tag through Flow's helper only when the gate allows it.
 * `tagged: true` means a Shopify write was attempted; check `success` for the outcome.
 */
export async function tagTribalCustomerIfAllowed(params: GatedTagParams, env: Env = process.env): Promise<GatedTagResult> {
  const gate = checkTribalTagGate(params.customerId, params.reviewer, env)
  if (!gate.allowed) {
    return { tagged: false, mode: gate.mode, success: false, reason: gate.reason, note: describeTagGateBlock(gate.reason) }
  }
  try {
    const result = await updateShopifyCustomerTribalStatus({
      customerId: gate.customerGid,
      tagsToAdd: [TRIBAL_MEMBER_TAG],
      taxExempt: Boolean(params.taxExempt),
      audit: {
        verificationHash: params.recordId,
        verifiedAt: params.decidedAt,
        tribalNation: params.tribalNation,
        maskedEnrollmentId: params.maskedEnrollmentId || 'n/a',
      },
    })
    const ok = Boolean(result?.success)
    return { tagged: true, mode: gate.mode, success: ok, error: ok ? undefined : result?.userErrors?.[0]?.message || 'Shopify update failed.' }
  } catch (err: any) {
    return { tagged: true, mode: gate.mode, success: false, error: err?.message || 'Shopify update error.' }
  }
}
