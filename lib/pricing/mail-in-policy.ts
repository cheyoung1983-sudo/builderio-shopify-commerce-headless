/**
 * Mail-in repair: $40 diagnostic fee and shipping policy (single source of truth).
 *
 * Every customer-facing mention of the mail-in fee, cancellation terms or shipping
 * responsibility must import from here so the wording stays word-for-word identical
 * across the estimator, request form, FAQ, voice knowledge base, etc.
 *
 * Decided by Ryan on Oct 24, 2026. Deliberately NOT here (still undecided): the price of
 * the customer-paid inbound label, handling fees, rush fees, chargeback/dispute policy,
 * tax treatment of the fee, battery-only mail-in pricing. Washington cancellation-fee rules
 * still need a lawyer's review before launch.
 *
 * This module is self-contained (no imports) so it can be loaded by node and by tests.
 */

export const MAIL_IN_DIAGNOSTIC_FEE_USD = 40
export const MAIL_IN_OVERNIGHT_UPGRADE_USD = 45

/** Exact terms text. Use word for word everywhere. */
export const MAIL_IN_TERMS =
  'The $40 diagnostic fee is credited toward an approved repair. If you cancel before your kit ships, you get a full refund. Once your kit ships, we keep the full $40. We pay return shipping.'

/** Appears ONLY on the mail-in request form, appended to the terms above the final submit button. */
export const MAIL_IN_FORM_ONLY_SENTENCE = 'You must check the box to agree before paying.'

/** Label of the required checkbox on the request form. */
export const MAIL_IN_ACCEPT_LABEL = 'I agree to the diagnostic fee and cancellation terms above.'

/** Who pays which leg. The inbound label price is intentionally not stated. */
export const MAIL_IN_SHIPPING_POLICY =
  'We pay to send your kit and to return your device, by two-day USPS Priority. You pay the label for sending your device to us.'

/** State $45 only where overnight is mentioned. */
export const MAIL_IN_OVERNIGHT_NOTE =
  'Overnight upgrade: flat $45, paid by you, non-refundable once your kit ships.'

export const MAIL_IN_KIT_SENTENCE = 'We send you a shipping kit with custom ESD foam packaging.'

export const MAIL_IN_CTA = 'Request Mail-In Kit'

/** Identifier stored with each recorded acceptance so we know which wording was accepted. */
export const MAIL_IN_TERMS_VERSION = '2026-10-24'

export interface MailInTermsAcceptance {
  accepted: true
  /** ISO 8601 timestamp, set by the server. */
  acceptedAt: string
  termsVersion: string
}

/**
 * Validates the acceptance sent by the form. Only a literal boolean `true` counts.
 * Returns the record to store (boolean + ISO timestamp + terms version, no PII), or
 * null when the customer has not accepted. The timestamp is always set by the server.
 */
export function buildTermsAcceptance(input: unknown, now: Date = new Date()): MailInTermsAcceptance | null {
  const accepted = (input as { accepted?: unknown } | null | undefined)?.accepted
  if (accepted !== true) return null
  return { accepted: true, acceptedAt: now.toISOString(), termsVersion: MAIL_IN_TERMS_VERSION }
}
