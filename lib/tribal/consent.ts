/**
 * Consent text version for tribal ID verification. Client-safe (no secrets).
 *
 * Bump CONSENT_TEXT_VERSION whenever the wording shown in the UI changes; the
 * API only accepts a submission whose consentVersion equals the current value,
 * and stores it alongside the consent timestamp. Wording is pending attorney
 * review (see PR body).
 */
export const CONSENT_TEXT_VERSION = 'tribal-id-consent-2026-10-24-v1'

export const CONSENT_CHECKBOX_LABEL =
  'I have read the notice above and agree to verify my tribal membership by ID photos and a selfie through Stripe.'
