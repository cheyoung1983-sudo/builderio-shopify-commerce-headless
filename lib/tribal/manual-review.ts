/**
 * Manual tribal verification review via Slack (approve / deny).
 *
 * Gated by TRIBAL_VERIFY_ENABLED (default OFF). Requests are stored in Upstash
 * Redis (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN). An in-memory
 * fallback exists for local dev/tests only; in production Redis is required.
 * Slack posting uses either SLACK_TRIBAL_WEBHOOK_URL or SLACK_BOT_TOKEN +
 * SLACK_TRIBAL_CHANNEL_ID. Interactions are authenticated with
 * SLACK_SIGNING_SECRET and authorized against SLACK_TRIBAL_APPROVER_IDS
 * (plus SLACK_TEAM_ID / SLACK_TRIBAL_CHANNEL_ID / SLACK_APP_ID when set).
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { Redis } from '@upstash/redis'
import { customerAccountFetch } from '../../services/shopify-customer-account.ts'
import { CONSENT_TEXT_VERSION } from './consent.ts'

type Env = Record<string, string | undefined>

export function isTribalVerifyEnabled(env: Env = process.env): boolean {
  return (env.TRIBAL_VERIFY_ENABLED || '').trim().toLowerCase() === 'true'
}

export type ReviewStatus = 'pending' | 'approved' | 'denied'

export type StripeSessionStatus = 'created' | 'processing' | 'requires_input' | 'verified' | 'canceled'
export type ReviewSource = 'manual' | 'stripe_identity'

/**
 * Stored in Redis (tribal:review:<id>, 30-day TTL). Deliberately holds NO raw
 * enrollment ID, NO ID images and NO ID-document data: only first name + last
 * initial, tribe, the Stripe session ID/status, a keyed duplicate hash and the
 * consent timestamp/version. The manual path keeps only the masked last 4 of a
 * self-entered enrollment number (for display).
 */
export interface TribalReviewRecord {
  id: string
  status: ReviewStatus
  createdAt: string
  customerId: string | null
  email: string | null
  firstName: string
  lastInitial: string
  tribalNation: string
  source: ReviewSource
  maskedEnrollmentId?: string | null
  /** HMAC keys claimed in Redis for duplicate detection (never raw values). */
  duplicateKeys?: string[]
  consentAt: string
  consentVersion: string
  stripeSessionId?: string
  stripeStatus?: StripeSessionStatus
  stripeReasonCode?: string
  stripeLivemode?: boolean
  redaction?: 'requested' | 'failed' | 'skipped'
  decidedBy?: string
  decidedAt?: string
  shopifySynced?: boolean
}

const KEY_PREFIX = 'tribal:review:'
const LOCK_PREFIX = 'tribal:review-lock:'
const TTL_SECONDS = 60 * 60 * 24 * 30
const memoryStore = new Map<string, TribalReviewRecord>()
const memoryLocks = new Set<string>()

/** Thrown when durable storage is required (production) but not configured. */
export class ReviewStoreUnavailableError extends Error {
  constructor() {
    super('Tribal review store unavailable: Redis (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN) is required in production')
    this.name = 'ReviewStoreUnavailableError'
  }
}

function getRedis(env: Env = process.env): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  if (!url || !token) {
    if (env.NODE_ENV === 'production') throw new ReviewStoreUnavailableError()
    return null
  }
  return new Redis({ url, token })
}

/** True when a durable store is usable (always true outside production). */
export function isReviewStoreAvailable(env: Env = process.env): boolean {
  if (env.NODE_ENV !== 'production') return true
  return Boolean((env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) && (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN))
}

export async function saveReview(record: TribalReviewRecord): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.set(KEY_PREFIX + record.id, JSON.stringify(record), { ex: TTL_SECONDS })
    return
  }
  memoryStore.set(record.id, record)
}

export async function deleteReview(id: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.del(KEY_PREFIX + id)
    return
  }
  memoryStore.delete(id)
}

export async function getReview(id: string): Promise<TribalReviewRecord | null> {
  const redis = getRedis()
  if (redis) {
    const raw = await redis.get<string | TribalReviewRecord>(KEY_PREFIX + id)
    if (!raw) return null
    return typeof raw === 'string' ? (JSON.parse(raw) as TribalReviewRecord) : raw
  }
  return memoryStore.get(id) || null
}

/**
 * Atomically claims the right to decide a review (SET NX). Returns false if
 * another click already claimed it.
 */
export async function acquireDecisionLock(id: string): Promise<boolean> {
  const redis = getRedis()
  if (redis) {
    const result = await redis.set(LOCK_PREFIX + id, '1', { nx: true, ex: TTL_SECONDS })
    return result === 'OK'
  }
  if (memoryLocks.has(id)) return false
  memoryLocks.add(id)
  return true
}

const DUP_PREFIX = 'tribal:dup:'
const memoryClaims = new Map<string, string>()

/** Atomic claim (SET NX with TTL). Returns true if this caller got the claim. */
export async function claimKey(key: string, value = '1', ttlSeconds = TTL_SECONDS): Promise<boolean> {
  const redis = getRedis()
  if (redis) {
    const result = await redis.set(key, value, { nx: true, ex: ttlSeconds })
    return result === 'OK'
  }
  if (memoryClaims.has(key)) return false
  memoryClaims.set(key, value)
  return true
}

export async function readClaim(key: string): Promise<string | null> {
  const redis = getRedis()
  if (redis) {
    const v = await redis.get<string>(key)
    return v === null || v === undefined ? null : String(v)
  }
  return memoryClaims.get(key) ?? null
}

export async function releaseKey(key: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.del(key)
    return
  }
  memoryClaims.delete(key)
}

export type DuplicateClaim = { claimed: true } | { claimed: false; existingId: string | null }

/** Claims a duplicate-detection key for a request. Value is the request ID. */
export async function claimDuplicateKey(dupKey: string, requestId: string): Promise<DuplicateClaim> {
  if (await claimKey(DUP_PREFIX + dupKey, requestId)) return { claimed: true }
  return { claimed: false, existingId: await readClaim(DUP_PREFIX + dupKey) }
}

/** Releases a duplicate key only if this request still owns it. */
export async function releaseDuplicateKey(dupKey: string, requestId: string): Promise<void> {
  if ((await readClaim(DUP_PREFIX + dupKey)) === requestId) await releaseKey(DUP_PREFIX + dupKey)
}

const STRIPE_ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000

/**
 * A duplicate claim may be taken over only when the earlier attempt can never
 * produce a decision: the review expired, the Stripe session was canceled, or a
 * Stripe session was started but no outcome arrived within 24 hours (abandoned).
 */
export function isReclaimable(existing: TribalReviewRecord | null, now = Date.now()): boolean {
  if (!existing) return true
  if (existing.status !== 'pending') return false
  if (existing.source === 'stripe_identity') {
    if (existing.stripeStatus === 'canceled') return true
    if (existing.stripeStatus === 'created' && now - Date.parse(existing.createdAt) > STRIPE_ABANDONED_AFTER_MS) return true
  }
  return false
}

/** Replaces a reclaimable duplicate claim with a new request ID. */
export async function takeOverDuplicateKey(dupKey: string, oldId: string | null, requestId: string): Promise<boolean> {
  if ((await readClaim(DUP_PREFIX + dupKey)) !== oldId) return false
  await releaseKey(DUP_PREFIX + dupKey)
  return claimKey(DUP_PREFIX + dupKey, requestId)
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export const MAX_FIELD_LENGTH = 120
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const CUSTOMER_GID_RE = /^gid:\/\/shopify\/Customer\/\d+$/
const REVIEW_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidCustomerGid(id: unknown): id is string {
  return typeof id === 'string' && CUSTOMER_GID_RE.test(id)
}

export function isValidReviewId(id: unknown): id is string {
  return typeof id === 'string' && REVIEW_ID_RE.test(id)
}

export interface ReviewInput {
  email?: string
  firstName: string
  lastName: string
  tribalNation: string
  /** Only collected on the manual-review path. Never stored raw (see newReviewRecord). */
  tribalEnrollmentId?: string
}

export type ValidationResult = { ok: true; value: ReviewInput } | { ok: false; error: string }

export function validateReviewInput(
  body: any,
  opts: { requireEnrollmentId?: boolean; requireEmail?: boolean } = {}
): ValidationResult {
  const requireEnrollmentId = opts.requireEnrollmentId ?? true
  const out: Record<string, string> = {}
  const fields = ['firstName', 'lastName', 'tribalNation', ...(requireEnrollmentId ? ['tribalEnrollmentId'] : [])] as const
  for (const field of fields) {
    const v = body?.[field]
    if (typeof v !== 'string' || !v.trim()) return { ok: false, error: `${field} is required.` }
    if (v.trim().length > MAX_FIELD_LENGTH) return { ok: false, error: `${field} must be at most ${MAX_FIELD_LENGTH} characters.` }
    out[field] = v.trim()
  }
  // Optional enrollment ID (Stripe path): validate if present, but it is discarded by the route.
  if (!requireEnrollmentId && body?.tribalEnrollmentId !== undefined && body?.tribalEnrollmentId !== null && body?.tribalEnrollmentId !== '') {
    const v = body.tribalEnrollmentId
    if (typeof v !== 'string' || v.trim().length > MAX_FIELD_LENGTH) return { ok: false, error: 'tribalEnrollmentId is invalid.' }
  }
  let email: string | undefined
  if (body?.email !== undefined && body?.email !== null && body?.email !== '') {
    if (typeof body.email !== 'string') return { ok: false, error: 'email is invalid.' }
    const e = body.email.trim()
    if (e.length > MAX_FIELD_LENGTH || !EMAIL_RE.test(e)) return { ok: false, error: 'email is invalid.' }
    email = e.toLowerCase()
  }
  if (opts.requireEmail && !email) return { ok: false, error: 'email is required.' }
  return {
    ok: true,
    value: {
      email,
      firstName: out.firstName,
      lastName: out.lastName,
      tribalNation: out.tribalNation,
      tribalEnrollmentId: requireEnrollmentId ? out.tribalEnrollmentId : undefined,
    },
  }
}

/** Explicit consent: `consent` must be boolean true and consentVersion must match the current text. */
export function validateConsent(body: any): { ok: true } | { ok: false; error: string } {
  if (body?.consent !== true) {
    return { ok: false, error: 'Consent is required: please read the notice and check the consent box to continue.' }
  }
  if (body?.consentVersion !== CONSENT_TEXT_VERSION) {
    return { ok: false, error: 'The consent notice has changed. Please reload the page and review it again.' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Authenticated customer (Shopify Customer Account API session cookie)
// ---------------------------------------------------------------------------

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const pair of header.split(';')) {
    const [name, ...rest] = pair.trim().split('=')
    if (!name) continue
    try {
      cookies[name] = decodeURIComponent(rest.join('='))
    } catch {
      cookies[name] = rest.join('=')
    }
  }
  return cookies
}

/**
 * Resolves the logged-in customer's id from the `shopify_customer_token`
 * cookie set by /api/account/callback. Never trusts a client-supplied id.
 * Returns null for guests or on any failure.
 */
export async function getAuthenticatedCustomerId(cookieHeader: string | undefined): Promise<string | null> {
  const token = parseCookieHeader(cookieHeader).shopify_customer_token
  if (!token) return null
  try {
    const result = await customerAccountFetch<{ customer?: { id?: string } }>({
      accessToken: token,
      query: 'query tribalCustomerId { customer { id } }',
    })
    const id = result?.data?.customer?.id
    return isValidCustomerGid(id) ? id : null
  } catch {
    return null
  }
}

/** Client IP from Vercel's x-real-ip (not spoofable x-forwarded-for). */
export function getClientIp(headers: Record<string, string | string[] | undefined>, fallback?: string): string {
  const raw = headers['x-real-ip']
  const ip = (Array.isArray(raw) ? raw[0] : raw)?.trim()
  return ip || fallback || 'unknown'
}

export function newReviewRecord(
  input: ReviewInput & { customerId?: string | null; source?: ReviewSource; duplicateKeys?: string[] },
  consent: { at?: string; version?: string } = {}
): TribalReviewRecord {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    status: 'pending',
    createdAt: now,
    customerId: isValidCustomerGid(input.customerId) ? input.customerId : null,
    email: input.email?.trim() || null,
    firstName: input.firstName.trim(),
    lastInitial: input.lastName.trim().charAt(0).toUpperCase(),
    tribalNation: input.tribalNation.trim(),
    source: input.source || 'manual',
    // Only the masked last 4 of a self-entered number is kept; the raw value is dropped here.
    maskedEnrollmentId: input.tribalEnrollmentId ? maskEnrollmentId(input.tribalEnrollmentId.trim()) : null,
    duplicateKeys: input.duplicateKeys,
    consentAt: consent.at || now,
    consentVersion: consent.version || CONSENT_TEXT_VERSION,
  }
}

// ---------------------------------------------------------------------------
// Slack message
// ---------------------------------------------------------------------------

/** Escapes Slack mrkdwn control characters (&, <, >). */
export function escapeSlack(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function maskEnrollmentId(id: string): string {
  return id.length <= 4 ? '****' : '*'.repeat(id.length - 4) + id.slice(-4)
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return `${local[0]}***@${domain}`
}

export function isSlackConfigured(env: Env = process.env): boolean {
  return Boolean(env.SLACK_TRIBAL_WEBHOOK_URL || (env.SLACK_BOT_TOKEN && env.SLACK_TRIBAL_CHANNEL_ID))
}

export function displayName(r: TribalReviewRecord): string {
  // Tolerates review records written before the data-minimization change (lastName).
  const legacyLast = (r as any).lastName as string | undefined
  const initial = r.lastInitial || (legacyLast ? legacyLast.trim().charAt(0).toUpperCase() : '')
  return `${escapeSlack(r.firstName)}${initial ? ` ${escapeSlack(initial)}.` : ''}`
}

export type StripeOutcome =
  | { kind: 'passed'; sessionId: string; livemode: boolean }
  | { kind: 'manual_review'; sessionId: string; livemode: boolean; reasonCode: string }

function stripeLine(o: StripeOutcome): string {
  const mode = o.livemode ? 'Stripe' : 'Stripe test'
  const dash = `https://dashboard.stripe.com/${o.livemode ? '' : 'test/'}identity/verification-sessions/${o.sessionId}`
  const link = `<${dash}|Open in Stripe dashboard>`
  if (o.kind === 'passed') {
    return `*${mode}:* passed (a person still decides: Approve or Deny below)\n${link}`
  }
  return `*${mode}:* needs manual review (reason: ${escapeSlack(o.reasonCode)})\n${link}`
}

export function buildReviewBlocks(r: TribalReviewRecord, outcome?: StripeOutcome) {
  const lines = [
    `*Tribal verification request* (${outcome ? 'Stripe Identity' : 'manual review'})`,
    `*Name:* ${displayName(r)}`,
    `*Nation:* ${escapeSlack(r.tribalNation)}`,
  ]
  if (outcome) {
    lines.push(stripeLine(outcome))
  } else if (r.maskedEnrollmentId) {
    lines.push(`*Enrollment ID:* ${escapeSlack(r.maskedEnrollmentId)}`)
  }
  lines.push(`*Customer:* ${r.customerId ? escapeSlack(r.customerId) : 'guest (not signed in; tag manually)'}`)
  if (r.email) lines.push(`*Email:* ${escapeSlack(maskEmail(r.email))}`)
  return [
    { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
    {
      type: 'actions',
      block_id: 'tribal_review',
      elements: [
        { type: 'button', action_id: 'tribal_approve', style: 'primary', text: { type: 'plain_text', text: 'Approve' }, value: r.id },
        { type: 'button', action_id: 'tribal_deny', style: 'danger', text: { type: 'plain_text', text: 'Deny' }, value: r.id },
      ],
    },
  ]
}

export function reviewSummaryText(r: TribalReviewRecord): string {
  return `${displayName(r)} (${escapeSlack(r.tribalNation)})`
}

async function postToSlack(text: string, blocks: unknown[], env: Env): Promise<boolean> {
  if (env.SLACK_TRIBAL_WEBHOOK_URL) {
    const res = await fetch(env.SLACK_TRIBAL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    })
    return res.ok
  }
  if (env.SLACK_BOT_TOKEN && env.SLACK_TRIBAL_CHANNEL_ID) {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` },
      body: JSON.stringify({ channel: env.SLACK_TRIBAL_CHANNEL_ID, text, blocks }),
    })
    const json: any = await res.json().catch(() => null)
    return Boolean(res.ok && json?.ok)
  }
  return false
}

export async function postReviewToSlack(r: TribalReviewRecord, env: Env = process.env): Promise<boolean> {
  return postToSlack(`Tribal verification request: ${reviewSummaryText(r)}`, buildReviewBlocks(r), env)
}

/** Posts a Stripe Identity result (name, tribe, pass / needs-review + reason code, dashboard link). No images, no ID numbers. */
export async function postStripeOutcomeToSlack(r: TribalReviewRecord, outcome: StripeOutcome, env: Env = process.env): Promise<boolean> {
  const label = outcome.kind === 'passed' ? 'Stripe passed' : 'Stripe needs manual review'
  return postToSlack(`Tribal verification (${label}): ${reviewSummaryText(r)}`, buildReviewBlocks(r, outcome), env)
}

// ---------------------------------------------------------------------------
// Slack request authentication / authorization
// ---------------------------------------------------------------------------

/** Slack v0 request signing. Rejects requests older than 5 minutes. */
export function verifySlackSignature(params: {
  rawBody: string
  timestamp: string | undefined
  signature: string | undefined
  signingSecret: string | undefined
  nowSeconds?: number
}): boolean {
  const { rawBody, timestamp, signature, signingSecret } = params
  if (!signingSecret || !timestamp || !signature) return false
  const ts = Number(timestamp)
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false
  const expected = 'v0=' + createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex')
  const a = new Uint8Array(Buffer.from(expected))
  const b = new Uint8Array(Buffer.from(signature))
  return a.length === b.length && timingSafeEqual(a, b)
}

function csv(v: string | undefined): string[] {
  return (v || '').split(',').map((s) => s.trim()).filter(Boolean)
}

/**
 * Checks that a signed Slack interaction comes from an allowed approver in the
 * expected workspace/channel/app. Empty SLACK_TRIBAL_APPROVER_IDS rejects all.
 */
export function authorizeSlackAction(payload: any, env: Env = process.env): { ok: true } | { ok: false; reason: string } {
  const approvers = csv(env.SLACK_TRIBAL_APPROVER_IDS)
  const userId = payload?.user?.id
  if (!approvers.length) return { ok: false, reason: 'no approvers configured' }
  if (typeof userId !== 'string' || !approvers.includes(userId)) return { ok: false, reason: 'user not an approver' }
  if (env.SLACK_TEAM_ID && (payload?.team?.id || payload?.user?.team_id) !== env.SLACK_TEAM_ID) {
    return { ok: false, reason: 'wrong team' }
  }
  if (env.SLACK_TRIBAL_CHANNEL_ID && (payload?.channel?.id || payload?.container?.channel_id) !== env.SLACK_TRIBAL_CHANNEL_ID) {
    return { ok: false, reason: 'wrong channel' }
  }
  if (env.SLACK_APP_ID && payload?.api_app_id !== env.SLACK_APP_ID) return { ok: false, reason: 'wrong app' }
  return { ok: true }
}
