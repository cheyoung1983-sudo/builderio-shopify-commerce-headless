/**
 * Stripe Identity (hosted document + selfie verification) for tribal review.
 *
 * SERVER-ONLY. Never import this module from components/, blocks/, hooks/,
 * context/ or any non-API page: it reads the Stripe key. (A test guards this.)
 *
 * Gating: everything here is off unless STRIPE_IDENTITY_ENABLED === 'true'
 * (exact string; default off). Images and ID numbers never touch our servers:
 * the customer is redirected to Stripe's hosted flow and we only ever see a
 * session ID, a status and a reason code.
 *
 * Test-key guard: while TRIBAL_STRIPE_TEST_MODE_ONLY is not 'false' (default
 * on), only sk_test_ / rk_test_ keys are accepted; anything else is refused.
 */
import Stripe from 'stripe'
import type { TribalReviewRecord } from './manual-review.ts'

type Env = Record<string, string | undefined>

export const STRIPE_ALLOWED_DOCUMENT_TYPES = ['driving_license', 'id_card', 'passport'] as const
export const WEBHOOK_TOLERANCE_SECONDS = 300
/** Allowed hosts for the Stripe return_url (plus localhost outside production). */
export const RETURN_URL_ALLOWED_HOSTS = ['www.displaycellpros.com', 'displaycellpros.com']
export const RETURN_PATH = '/tribal/verification-submitted'

export class StripeIdentityConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StripeIdentityConfigError'
  }
}

/** Exact-string gate: only the literal 'true' enables Stripe Identity. */
export function isStripeIdentityEnabled(env: Env = process.env): boolean {
  return env.STRIPE_IDENTITY_ENABLED === 'true'
}

/** Guard defaults ON: only the literal 'false' turns it off. */
export function isTestModeOnly(env: Env = process.env): boolean {
  return (env.TRIBAL_STRIPE_TEST_MODE_ONLY || '').trim().toLowerCase() !== 'false'
}

export function isTestKey(key: string): boolean {
  return /^(sk|rk)_test_[A-Za-z0-9]+$/.test(key)
}

/** Returns the configured key or throws. Never logs or echoes the key. */
export function getStripeKey(env: Env = process.env): string {
  const key = (env.STRIPE_IDENTITY_RESTRICTED_KEY || '').trim()
  if (!key) throw new StripeIdentityConfigError('STRIPE_IDENTITY_RESTRICTED_KEY is not configured')
  if (isTestModeOnly(env) && !isTestKey(key)) {
    throw new StripeIdentityConfigError('Refusing to use a non-test Stripe key while TRIBAL_STRIPE_TEST_MODE_ONLY is on')
  }
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(key)) {
    throw new StripeIdentityConfigError('STRIPE_IDENTITY_RESTRICTED_KEY is malformed')
  }
  return key
}

export function getStripeClient(env: Env = process.env): Stripe {
  return new Stripe(getStripeKey(env), {
    // fetch-based client: no node:http dependency, works the same in tests.
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 1,
    timeout: 15000,
    appInfo: { name: 'displaycellpros-tribal-verify' },
  })
}

/**
 * Builds the allowlisted return URL. Base comes from TRIBAL_STRIPE_RETURN_BASE_URL
 * (falling back to NEXT_PUBLIC_SITE_URL); the host must be allowlisted.
 * Never carries personal data and is never trusted as proof of verification.
 */
export function buildReturnUrl(env: Env = process.env): string {
  const base = (env.TRIBAL_STRIPE_RETURN_BASE_URL || env.NEXT_PUBLIC_SITE_URL || '').trim()
  let u: URL
  try {
    u = new URL(base)
  } catch {
    throw new StripeIdentityConfigError('TRIBAL_STRIPE_RETURN_BASE_URL is not a valid URL')
  }
  const isLocal = env.NODE_ENV !== 'production' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  const okHost = RETURN_URL_ALLOWED_HOSTS.includes(u.hostname)
  if (!(okHost && u.protocol === 'https:') && !(isLocal && (u.protocol === 'http:' || u.protocol === 'https:'))) {
    throw new StripeIdentityConfigError('Return URL host is not allowlisted')
  }
  return `${u.origin}${RETURN_PATH}`
}

/** Stripe session IDs are `vs_...`; validated before use in URLs. */
export function isValidSessionId(id: unknown): id is string {
  return typeof id === 'string' && /^vs_[A-Za-z0-9_]{6,200}$/.test(id)
}

export function dashboardSessionUrl(sessionId: string, livemode: boolean): string {
  return `https://dashboard.stripe.com/${livemode ? '' : 'test/'}identity/verification-sessions/${sessionId}`
}

/** Reason codes are short snake_case identifiers from Stripe; anything else is dropped. */
export function sanitizeReasonCode(code: unknown): string {
  return typeof code === 'string' && /^[a-z0-9_]{1,64}$/.test(code) ? code : 'unspecified'
}

export interface CreatedSession {
  id: string
  url: string
}

/**
 * Creates a hosted VerificationSession. Only the internal request ID is sent as
 * metadata; no name, email, tribe or ID data goes to Stripe from us.
 */
export async function createVerificationSession(
  requestId: string,
  env: Env = process.env,
  client?: Stripe
): Promise<CreatedSession> {
  const returnUrl = buildReturnUrl(env)
  const stripe = client || getStripeClient(env)
  const session = await stripe.identity.verificationSessions.create(
    {
      type: 'document',
      options: {
        document: {
          require_live_capture: true,
          require_matching_selfie: true,
          allowed_types: [...STRIPE_ALLOWED_DOCUMENT_TYPES],
        },
      },
      return_url: returnUrl,
      metadata: { request_id: requestId },
    },
    { idempotencyKey: `tribal-vs-${requestId}` }
  )
  if (!isValidSessionId(session?.id) || typeof session?.url !== 'string' || !session.url.startsWith('https://verify.stripe.com/')) {
    throw new Error('Stripe returned an unexpected VerificationSession')
  }
  return { id: session.id, url: session.url }
}

/**
 * Verifies the Stripe-Signature header against the RAW body with
 * stripe.webhooks.constructEvent (HMAC + 5 minute timestamp tolerance).
 * Throws on missing/invalid/stale signatures.
 */
export function verifyStripeWebhook(rawBody: Uint8Array | string, signatureHeader: string | undefined, secret: string | undefined): Stripe.Event {
  if (!secret) throw new StripeIdentityConfigError('STRIPE_IDENTITY_WEBHOOK_SECRET is not configured')
  if (!signatureHeader) throw new Error('Missing Stripe-Signature header')
  // Stripe's SDK only rejects OLD timestamps; also reject ones from the future (replay-window symmetry).
  const t = Number(/(?:^|,)t=(\d+)/.exec(signatureHeader)?.[1])
  if (Number.isFinite(t) && t - Math.floor(Date.now() / 1000) > WEBHOOK_TOLERANCE_SECONDS) throw new Error('Stripe-Signature timestamp is too far in the future')
  return Stripe.webhooks.constructEvent(typeof rawBody === 'string' ? rawBody : new Uint8Array(rawBody), signatureHeader, secret, WEBHOOK_TOLERANCE_SECONDS)
}

// ---------------------------------------------------------------------------
// Retention: redact the Stripe session after a human decision
// ---------------------------------------------------------------------------

export type RedactionOutcome =
  | { status: 'requested' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; code: string }

function isRetryable(err: any): boolean {
  const type = String(err?.type || err?.rawType || '')
  const status = Number(err?.statusCode || 0)
  return type === 'StripeConnectionError' || type === 'StripeRateLimitError' || type === 'StripeAPIError' || status === 429 || status >= 500
}

function looksAlreadyRedacted(err: any): boolean {
  const msg = String(err?.message || '')
  return /redact/i.test(msg) && /(already|in progress|processing|redacted)/i.test(msg)
}

/**
 * Calls stripe.identity.verificationSessions.redact for a decided session.
 * Never throws and never logs more than the session ID and an error code.
 * Retry-safe: transient errors are retried, and "already redacted/in progress"
 * counts as success, so calling it again after a failure is harmless.
 */
export async function redactVerificationSession(
  sessionId: string,
  opts: { env?: Env; client?: Stripe; maxAttempts?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<RedactionOutcome> {
  const env = opts.env || process.env
  if (!isValidSessionId(sessionId)) return { status: 'skipped', reason: 'no valid session id' }
  let stripe: Stripe
  try {
    stripe = opts.client || getStripeClient(env)
  } catch (err: any) {
    console.error(`Tribal Stripe redaction: not attempted for ${sessionId}: ${err?.name || 'config error'}`)
    return { status: 'failed', code: 'not_configured' }
  }
  const attempts = Math.max(1, opts.maxAttempts ?? 3)
  const sleep = opts.sleep || ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  let lastCode = 'unknown'
  for (let i = 1; i <= attempts; i++) {
    try {
      await stripe.identity.verificationSessions.redact(sessionId)
      return { status: 'requested' }
    } catch (err: any) {
      if (looksAlreadyRedacted(err)) return { status: 'requested' }
      lastCode = sanitizeReasonCode(err?.code || err?.rawType || err?.type?.toLowerCase?.())
      if (!isRetryable(err) || i === attempts) break
      await sleep(250 * i)
    }
  }
  console.error(`Tribal Stripe redaction failed for ${sessionId} (${lastCode})`)
  return { status: 'failed', code: lastCode }
}

/** Redacts the Stripe session tied to a decided review record, if any. */
export async function redactAfterDecision(
  record: Pick<TribalReviewRecord, 'stripeSessionId'>,
  opts: Parameters<typeof redactVerificationSession>[1] = {}
): Promise<RedactionOutcome> {
  if (!record.stripeSessionId) return { status: 'skipped', reason: 'no stripe session' }
  return redactVerificationSession(record.stripeSessionId, opts)
}
