/**
 * Duplicate-submission keys for tribal verification.
 *
 * A duplicate key is an HMAC-SHA256 (server secret TRIBAL_DUPLICATE_HMAC_SECRET)
 * of the normalized legal name + tribe. The raw values are never stored or
 * logged and nothing from an ID document is used. In production the secret is
 * required (fail closed); outside production a random per-process secret is
 * used so local dev/tests work without configuration.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto'

type Env = Record<string, string | undefined>

export class DuplicateSecretMissingError extends Error {
  constructor() {
    super('TRIBAL_DUPLICATE_HMAC_SECRET is required in production (min 16 chars)')
    this.name = 'DuplicateSecretMissingError'
  }
}

let ephemeralSecret: string | null = null

export function getDuplicateSecret(env: Env = process.env): string {
  const s = (env.TRIBAL_DUPLICATE_HMAC_SECRET || '').trim()
  if (s.length >= 16) return s
  if (env.NODE_ENV === 'production') throw new DuplicateSecretMissingError()
  if (!ephemeralSecret) ephemeralSecret = randomBytes(32).toString('hex')
  return ephemeralSecret
}

/** True when the duplicate secret is usable (always true outside production). */
export function isDuplicateSecretAvailable(env: Env = process.env): boolean {
  try {
    getDuplicateSecret(env)
    return true
  } catch {
    return false
  }
}

/** Case/diacritic/punctuation/whitespace-insensitive normalization. */
export function normalizeIdentityPart(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalizes a tribe name, dropping generic trailing words so "Navajo Nation" == "Navajo". */
export function normalizeTribe(value: string): string {
  return normalizeIdentityPart(value)
    .split(' ')
    .filter((w) => w && !['nation', 'tribe', 'tribes', 'the', 'of'].includes(w))
    .join(' ')
}

export function normalizeEnrollmentToken(value: string): string {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function hmac(label: string, material: string, env: Env): string {
  return createHmac('sha256', getDuplicateSecret(env)).update(`${label}|${material}`).digest('hex')
}

/** Duplicate key for (legal name, tribe). Formatting variants produce the same key. */
export function nameTribeDuplicateKey(
  input: { firstName: string; lastName: string; tribalNation: string },
  env: Env = process.env
): string {
  const material = [
    normalizeIdentityPart(input.firstName),
    normalizeIdentityPart(input.lastName),
    normalizeTribe(input.tribalNation),
  ].join('|')
  return hmac('tribal-dup-name:v1', material, env)
}

/** Duplicate key for a self-entered enrollment number (manual-review path only). */
export function enrollmentDuplicateKey(tribalNation: string, enrollmentId: string, env: Env = process.env): string {
  return hmac('tribal-dup-enroll:v1', `${normalizeTribe(tribalNation)}|${normalizeEnrollmentToken(enrollmentId)}`, env)
}

/**
 * Keyed hash for rate-limit keys so raw email / IP never appear in Redis keys.
 * Falls back to an unkeyed hash only when no secret is available (never throws).
 */
export function hashForRateLimit(value: string, env: Env = process.env): string {
  const v = String(value || '').trim().toLowerCase()
  try {
    return createHmac('sha256', getDuplicateSecret(env)).update(`rl:${v}`).digest('hex').slice(0, 32)
  } catch {
    return createHash('sha256').update(`rl:${v}`).digest('hex').slice(0, 32)
  }
}
