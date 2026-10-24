/**
 * Which tribal verification experience the site is currently running.
 *
 * SERVER-ONLY. Call this from getServerSideProps and pass the result to
 * components as a prop; never import it from components/ (it pulls server
 * helpers). The copy for each mode lives in lib/tribal/verification-copy.ts,
 * which is client-safe.
 *
 *  - 'manual': TRIBAL_VERIFY_ENABLED is off. No online submission; call or email.
 *  - 'review': TRIBAL_VERIFY_ENABLED is on, STRIPE_IDENTITY_ENABLED is not 'true'.
 *              Name and tribe go to a person for review, no ID photos.
 *  - 'stripe': both flags on. Hosted Stripe Identity check, then a person decides.
 *
 * Reuses the same flag helpers as the verify API route so the page and the
 * route can never disagree about what is open.
 */
import { isTribalVerifyEnabled } from './manual-review.ts'
import { isStripeIdentityEnabled } from './stripe-identity.ts'
import type { TribalVerificationMode } from './verification-copy.ts'

export type { TribalVerificationMode } from './verification-copy.ts'

type Env = Record<string, string | undefined>

export function getTribalVerificationMode(env: Env = process.env): TribalVerificationMode {
  if (!isTribalVerifyEnabled(env)) return 'manual'
  return isStripeIdentityEnabled(env) ? 'stripe' : 'review'
}
