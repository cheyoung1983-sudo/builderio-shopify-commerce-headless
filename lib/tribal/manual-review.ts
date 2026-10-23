/**
 * Manual tribal verification review via Slack (approve / deny).
 *
 * Gated by TRIBAL_VERIFY_ENABLED (default OFF). Requests are stored in Upstash
 * Redis (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN) with an
 * in-memory fallback for local dev/tests. Slack posting uses either
 * SLACK_TRIBAL_WEBHOOK_URL or SLACK_BOT_TOKEN + SLACK_TRIBAL_CHANNEL_ID.
 * Interactions are authenticated with SLACK_SIGNING_SECRET.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { Redis } from '@upstash/redis'

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
const TTL_SECONDS = 60 * 60 * 24 * 30
const memoryStore = new Map<string, TribalReviewRecord>()

function getRedis(env: Env = process.env): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
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

export function newReviewRecord(input: {
  customerId?: string
  email?: string
  firstName: string
  lastName: string
  tribalNation: string
  tribalEnrollmentId: string
}): TribalReviewRecord {
  const customerId = input.customerId && input.customerId !== 'guest' ? input.customerId : null
  return {
    id: randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    customerId,
    email: input.email?.trim() || null,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    tribalNation: input.tribalNation.trim(),
    tribalEnrollmentId: input.tribalEnrollmentId.trim(),
  }
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
          `*Name:* ${r.firstName} ${r.lastName}\n*Nation:* ${r.tribalNation}\n` +
          `*Enrollment ID:* ${r.tribalEnrollmentId}\n*Customer:* ${r.customerId || 'guest (no Shopify account; tag manually)'}` +
          (r.email ? `\n*Email:* ${r.email}` : ''),
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

export async function postReviewToSlack(r: TribalReviewRecord, env: Env = process.env): Promise<boolean> {
  const text = `Tribal verification request: ${r.firstName} ${r.lastName} (${r.tribalNation})`
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

export function maskEnrollmentId(id: string): string {
  return id.length <= 4 ? '****' : '*'.repeat(id.length - 4) + id.slice(-4)
}
