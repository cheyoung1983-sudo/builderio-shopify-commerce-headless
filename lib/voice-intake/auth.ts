/**
 * Shared-secret guard for the ElevenLabs voice-intake tool endpoints
 * (/api/pricing/quote, /api/intake/dispatch-sms, /api/intake/escalate-tier3).
 *
 * The ElevenLabs agent sends the secret in the X-DCP-Agent-Secret header.
 * It is compared in constant time against ELEVENLABS_WEBHOOK_SECRET.
 * Fails closed in EVERY environment: if the env var is unset the endpoints
 * return 503 and do nothing.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

export const AGENT_SECRET_HEADER = 'x-dcp-agent-secret'
export const AGENT_SECRET_ENV = 'ELEVENLABS_WEBHOOK_SECRET'

function digest(value: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(value, 'utf8').digest())
}

/** Constant-time string comparison (hashing first equalizes lengths). */
export function secretsMatch(provided: string, expected: string): boolean {
  return timingSafeEqual(digest(provided), digest(expected))
}

export type GuardResult = { status: number; error: string } | null

/**
 * Checks method and shared secret. Returns null when the request may
 * proceed, otherwise the status/error to send.
 */
export function checkAgentRequest(
  req: Pick<NextApiRequest, 'method' | 'headers'>,
  env: Record<string, string | undefined> = process.env
): GuardResult {
  if (req.method !== 'POST') {
    return { status: 405, error: 'Method not allowed' }
  }

  const expected = (env[AGENT_SECRET_ENV] || '').trim()
  if (!expected) {
    return { status: 503, error: 'Tool endpoint is not configured' }
  }

  const raw = req.headers[AGENT_SECRET_HEADER]
  const provided = typeof raw === 'string' ? raw.trim() : ''
  if (!provided || !secretsMatch(provided, expected)) {
    return { status: 401, error: 'Unauthorized' }
  }

  return null
}

/**
 * Applies the guard to a Pages Router response. Returns true if a response
 * was sent (caller should stop).
 */
export function rejectUnlessAuthorizedAgent(req: NextApiRequest, res: NextApiResponse): boolean {
  res.setHeader('Cache-Control', 'no-store')
  const result = checkAgentRequest(req)
  if (!result) return false
  if (result.status === 405) res.setHeader('Allow', 'POST')
  res.status(result.status).json({ success: false, error: result.error })
  return true
}

/** Best-effort client IP (Vercel sets x-real-ip / x-forwarded-for). */
export function getClientIp(req: Pick<NextApiRequest, 'headers' | 'socket'>): string {
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim()
  const xff = req.headers['x-forwarded-for']
  const first = (Array.isArray(xff) ? xff[0] : xff || '').split(',')[0].trim()
  if (first) return first
  return req.socket?.remoteAddress || 'unknown'
}
