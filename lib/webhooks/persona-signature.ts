import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Shared webhook authentication helpers for Persona-style signed webhooks.
 *
 * Persona sends `Persona-Signature: t=<unix seconds>,v1=<hex hmac>[ ,v1=<hex hmac>]` where
 * the HMAC-SHA256 is computed over `${t}.${rawBody}` with the webhook secret. Several v1
 * values may be present during secret rotation, so any one matching is accepted.
 */

export const SIGNATURE_TOLERANCE_SECONDS = 300

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: 'missing_secret' | 'missing_signature' | 'malformed_signature' | 'stale_timestamp' | 'bad_signature' }

function constantTimeHexEqual(a: string, b: string): boolean {
  // Hash both sides so buffers are equal length and comparison time is independent of input.
  const da = createHash('sha256').update(a, 'utf8').digest()
  const db = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(new Uint8Array(da), new Uint8Array(db))
}

export function parseSignatureHeader(header: string | string[] | undefined): { timestamp: string; signatures: string[] } | null {
  const value = Array.isArray(header) ? header[0] : header
  if (!value || typeof value !== 'string') return null
  let timestamp = ''
  const signatures: string[] = []
  for (const part of value.split(',')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (key === 't') timestamp = val
    else if (key === 'v1' && val) signatures.push(val.toLowerCase())
  }
  if (!/^\d{1,12}$/.test(timestamp) || signatures.length === 0) return null
  return { timestamp, signatures }
}

export function computePersonaSignature(secret: string, timestamp: string, rawBody: Buffer | string): string {
  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')
  return createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')
}

export function verifyPersonaSignature(params: {
  secret: string | undefined
  header: string | string[] | undefined
  rawBody: Buffer | string
  nowSeconds?: number
  toleranceSeconds?: number
}): SignatureCheck {
  const { secret, header, rawBody } = params
  if (!secret) return { ok: false, reason: 'missing_secret' }
  if (!header) return { ok: false, reason: 'missing_signature' }
  const parsed = parseSignatureHeader(header)
  if (!parsed) return { ok: false, reason: 'malformed_signature' }

  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000)
  const tolerance = params.toleranceSeconds ?? SIGNATURE_TOLERANCE_SECONDS
  if (Math.abs(now - Number(parsed.timestamp)) > tolerance) return { ok: false, reason: 'stale_timestamp' }

  const expected = computePersonaSignature(secret, parsed.timestamp, rawBody)
  // Evaluate every candidate (no early exit) to keep timing uniform.
  let matched = false
  for (const candidate of parsed.signatures) {
    if (constantTimeHexEqual(candidate, expected)) matched = true
  }
  return matched ? { ok: true } : { ok: false, reason: 'bad_signature' }
}

/** Constant-time comparison of a `Authorization: Bearer <token>` header against a secret. */
export function verifyBearerToken(authorization: string | string[] | undefined, secret: string | undefined): boolean {
  if (!secret) return false
  const value = Array.isArray(authorization) ? authorization[0] : authorization
  if (!value || !value.startsWith('Bearer ')) return false
  return constantTimeHexEqual(value.slice(7).trim(), secret)
}

/** Stable idempotency key: explicit event id when supplied, otherwise a digest of the raw body. */
export function deriveIdempotencyKey(eventId: unknown, rawBody: Buffer | string): string {
  if (typeof eventId === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(eventId)) return `evt_${eventId}`
  const data = typeof rawBody === 'string' ? rawBody : new Uint8Array(rawBody)
  return `sha256_${createHash('sha256').update(data).digest('hex')}`
}
