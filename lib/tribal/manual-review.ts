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

type Env = Record<string, string | undefined>

export function isTribalVerifyEnabled(env: Env = process.env): boolean {
  return (env.TRIBAL_VERIFY_ENABLED || '').trim().toLowerCase() === 'true'
}

export type ReviewStatus = 'pending' | 'approved' | 'denied'

export interface TribalReviewRecord {
  id: string
  status: ReviewStatus
  createdAt: string
  customerId: string | null
  email: string | null
  firstName: string
  lastName: string
  tribalNation: string
  tribalEnrollmentId: string
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
  tribalEnrollmentId: string
}

export type ValidationResult = { ok: true; value: ReviewInput } | { ok: false; error: string }

export function validateReviewInput(body: any): ValidationResult {
  const out: Record<string, string> = {}
  for (const field of ['firstName', 'lastName', 'tribalNation', 'tribalEnrollmentId'] as const) {
    const v = body?.[field]
    if (typeof v !== 'string' || !v.trim()) return { ok: false, error: `${field} is required.` }
    if (v.trim().length > MAX_FIELD_LENGTH) return { ok: false, error: `${field} must be at most ${MAX_FIELD_LENGTH} characters.` }
    out[field] = v.trim()
  }
  let email: string | undefined
  if (body?.email !== undefined && body?.email !== null && body?.email !== '') {
    if (typeof body.email !== 'string') return { ok: false, error: 'email is invalid.' }
    const e = body.email.trim()
    if (e.length > MAX_FIELD_LENGTH || !EMAIL_RE.test(e)) return { ok: false, error: 'email is invalid.' }
    email = e.toLowerCase()
  }
  return {
    ok: true,
    value: {
      email,
      firstName: out.firstName,
      lastName: out.lastName,
      tribalNation: out.tribalNation,
      tribalEnrollmentId: out.tribalEnrollmentId,
    },
  }
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

export function newReviewRecord(input: ReviewInput & { customerId?: string | null }): TribalReviewRecord {
  return {
    id: randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    customerId: isValidCustomerGid(input.customerId) ? input.customerId : null,
    email: input.email?.trim() || null,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    tribalNation: input.tribalNation.trim(),
    tribalEnrollmentId: input.tribalEnrollmentId.trim(),
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

export function buildReviewBlocks(r: TribalReviewRecord) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*Tribal verification request* (manual review)\n` +
          `*Name:* ${escapeSlack(r.firstName)} ${escapeSlack(r.lastName)}\n*Nation:* ${escapeSlack(r.tribalNation)}\n` +
          `*Enrollment ID:* ${escapeSlack(maskEnrollmentId(r.tribalEnrollmentId))}\n` +
          `*Customer:* ${r.customerId ? escapeSlack(r.customerId) : 'guest (not signed in; tag manually)'}` +
          (r.email ? `\n*Email:* ${escapeSlack(maskEmail(r.email))}` : ''),
      },
    },
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
  return `${escapeSlack(r.firstName)} ${escapeSlack(r.lastName)} (${escapeSlack(r.tribalNation)})`
}

export async function postReviewToSlack(r: TribalReviewRecord, env: Env = process.env): Promise<boolean> {
  const text = `Tribal verification request: ${reviewSummaryText(r)}`
  const blocks = buildReviewBlocks(r)
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
