/**
 * Shared customer-facing copy for the tribal discount verification process.
 *
 * CLIENT-SAFE: no secrets, no env reads, no server imports. Every public surface
 * (/tribal-discount, /account, the FAQ) pulls its wording from here so the steps
 * can't drift apart.
 *
 * Wording rules (do not break these without Ryan's OK):
 *  - never promise that a tribal ID card is accepted (Stripe has no tribal type);
 *  - never say "instant" and never give a turnaround time;
 *  - never invent business hours or an address;
 *  - the discount is a fixed 20%, applied automatically, with no code.
 */

/** How the verification flow is currently configured (see lib/tribal/verification-mode.ts). */
export type TribalVerificationMode = 'manual' | 'review' | 'stripe'

export const TRIBAL_SUPPORT = {
  phoneDisplay: '(509) 255-3852',
  phoneHref: 'tel:+15092553852',
  email: 'support@displaycellpros.com',
  emailHref: `mailto:support@displaycellpros.com?subject=${encodeURIComponent('Tribal enrollment review request')}`,
} as const

export const TRIBAL_ELIGIBILITY_LINE = 'Enrolled members of any USA federally recognized tribe.'

export const TRIBAL_DISCOUNT_LINE = 'A fixed 20% off, applied automatically at checkout. There is no code to enter.'

export const TRIBAL_MANUAL_MESSAGE = `Online submission isn't open yet. Call ${TRIBAL_SUPPORT.phoneDisplay} or email ${TRIBAL_SUPPORT.email} and we'll review your enrollment.`

export interface TribalStepCopy {
  title: string
  detail: string
}

const STEP_SIGN_IN: TribalStepCopy = {
  title: 'Sign in and submit your details',
  detail: 'Sign in to your account, then send us your name and tribe.',
}

const STEP_STRIPE: TribalStepCopy = {
  title: "Verify your ID on Stripe's secure page",
  detail:
    "Take photos of an unexpired photo ID (front and back, where it has a back) and a quick selfie. The photos go to Stripe, not to us.",
}

const STEP_REVIEW_STRIPE: TribalStepCopy = {
  title: 'Our team reviews',
  detail: 'We get a pass or fail result plus your name and tribe, never your photos or ID number. A person makes the final call.',
}

const STEP_REVIEW_ONLY: TribalStepCopy = {
  title: 'Our team reviews',
  detail: 'A team member reviews the name and tribe you submitted. A person makes the final call.',
}

const STEP_TAGGED: TribalStepCopy = {
  title: 'Your account is tagged',
  detail: 'Once approved, your account is tagged as a verified tribal member.',
}

const STEP_DISCOUNT: TribalStepCopy = {
  title: '20% off applies automatically',
  detail: 'A fixed 20% off at checkout. There is no code to enter.',
}

/** The numbered steps for a mode. Manual mode has no online steps. */
export function getTribalSteps(mode: TribalVerificationMode): TribalStepCopy[] {
  if (mode === 'stripe') return [STEP_SIGN_IN, STEP_STRIPE, STEP_REVIEW_STRIPE, STEP_TAGGED, STEP_DISCOUNT]
  if (mode === 'review') return [STEP_SIGN_IN, STEP_REVIEW_ONLY, STEP_TAGGED, STEP_DISCOUNT]
  return []
}

export interface TribalPrivacyCopy {
  heading: string
  points: string[]
}

export const TRIBAL_PRIVACY_HEADING = 'Your privacy'

/** The full privacy block for a mode. */
export function getTribalPrivacyPoints(mode: TribalVerificationMode): string[] {
  const separate = 'This discount is separate from tax exemption.'
  if (mode === 'stripe') {
    return [
      'ID photos and your selfie are collected by Stripe, not by us.',
      "We don't store ID images or ID numbers.",
      "You'll see the full notice and be asked for your consent before anything is sent.",
      "If the selfie or ID check is declined or fails, your request goes to manual review. Contact us and we'll help.",
      separate,
    ]
  }
  if (mode === 'review') {
    return [
      "We don't collect ID images. We keep your first name, last initial, tribe and your consent record.",
      "You'll see the full notice and be asked for your consent before anything is sent.",
      separate,
    ]
  }
  return ['Please do not post your enrollment number publicly.', separate]
}

/** One line for tight spaces such as the account card. */
export function getTribalPrivacyOneLiner(mode: TribalVerificationMode): string {
  if (mode === 'stripe') return "ID photos go to Stripe, not us, and we don't store ID images or ID numbers."
  if (mode === 'review') return "We don't collect ID images. A team member reviews your request."
  return 'Do not post your enrollment number publicly.'
}

export const TRIBAL_TROUBLE_HEADING = 'If something goes wrong'

export const TRIBAL_TROUBLE_TEXT =
  "If the selfie or ID check is declined, or the page won't load, your request goes to manual review. Contact us and a team member will help."

export const TRIBAL_TAX_NOTE =
  'The 20% discount is separate from tax exemption. Tax exemption has its own paperwork and rules.'

export const TRIBAL_TAX_LINK = { href: '/services-faq#tribal-overview', label: 'Read about tax exemption' } as const

export const TRIBAL_PAGE_PATH = '/tribal-discount'

/** Sign-in link that returns the customer to the verify section. `#` must be encoded in a query string. */
export const TRIBAL_SIGN_IN_HREF = `/api/account/login?returnTo=${encodeURIComponent('/tribal-discount#verify')}`

export function getTribalCtaLabel(mode: TribalVerificationMode): string {
  return mode === 'stripe' ? 'Start verification' : 'Submit for review'
}
