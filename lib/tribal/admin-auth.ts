import type { NextApiRequest } from 'next'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import {
  OWNER_EMAIL_ALLOWLIST,
  ADMIN_ALLOWLIST,
  isAdminEmail,
  isAllowedOwnerEmail,
} from './owner-allowlist.ts'

export {
  OWNER_EMAIL_ALLOWLIST,
  ADMIN_ALLOWLIST,
  isAdminEmail,
  isAllowedOwnerEmail,
}

export interface AdminSessionUser {
  email?: string | null
  email_verified?: boolean | null
  sub?: string | null
  provider?: 'auth0' | 'firebase' | string
}

/** Resolves the signed-in user from the server-side session or verified token. */
export type AdminSessionResolver = (req: NextApiRequest) => Promise<AdminSessionUser | null>

interface CertCacheEntry {
  certs: Record<string, string>
  expiresAt: number
}

let firebaseCertCache: CertCacheEntry | null = null

function getFirebaseProjectId(): string | null {
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json')
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (parsed?.projectId && parsed.projectId !== 'remixed-project-id') {
        return String(parsed.projectId)
      }
    }
  } catch {
    // Ignore config read errors
  }
  return null
}

async function fetchFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now()
  if (firebaseCertCache && firebaseCertCache.expiresAt > now) {
    return firebaseCertCache.certs
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public certificates (${res.status})`)
  }

  const certs = (await res.json()) as Record<string, string>
  const cacheControl = res.headers.get('cache-control') || ''
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i)
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 300_000

  firebaseCertCache = {
    certs,
    expiresAt: now + Math.max(ttlMs, 60_000),
  }
  return certs
}

function decodeBase64UrlJson(segment: string): Record<string, any> | null {
  try {
    const json = Buffer.from(segment, 'base64url').toString('utf8')
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Cryptographically verifies a Firebase ID token (RS256) against Google's official
 * SecureToken x509 public keys. Requires no IAM privileges.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<AdminSessionUser | null> {
  if (!idToken || typeof idToken !== 'string') return null
  const parts = idToken.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, signatureB64] = parts
  const header = decodeBase64UrlJson(headerB64)
  const payload = decodeBase64UrlJson(payloadB64)

  if (!header || !payload) return null
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null

  const projectId = getFirebaseProjectId()
  if (!projectId) return null

  const nowSec = Math.floor(Date.now() / 1000)
  if (payload.aud !== projectId) return null
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null
  if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) return null
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return null
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 60) return null
  if (typeof payload.auth_time === 'number' && payload.auth_time > nowSec + 60) return null
  if (typeof payload.email !== 'string' || payload.email_verified !== true) return null

  try {
    const certs = await fetchFirebasePublicCerts()
    const cert = certs[header.kid]
    if (!cert) return null

    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(`${headerB64}.${payloadB64}`)
    verifier.end()

    const signatureStdB64 = Buffer.from(signatureB64, 'base64url').toString('base64')
    const valid = verifier.verify(cert, signatureStdB64, 'base64')
    if (!valid) return null

    return {
      email: payload.email.trim().toLowerCase(),
      email_verified: true,
      sub: payload.sub,
      provider: 'firebase',
    }
  } catch {
    return null
  }
}

/**
 * Auth0 server-side session resolver (encrypted, signed cookie validated by Auth0 SDK).
 * Fails closed (null) when Auth0 is not configured.
 */
export const auth0SessionResolver: AdminSessionResolver = async (req) => {
  if (!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_SECRET)) return null
  try {
    const { auth0 } = await import('../auth0.ts')
    const session = await auth0.getSession(req as any)
    if (!session?.user) return null
    return {
      email: (session.user as AdminSessionUser).email,
      email_verified: (session.user as AdminSessionUser).email_verified,
      sub: (session.user as any).sub || null,
      provider: 'auth0',
    }
  } catch {
    return null
  }
}

/**
 * Firebase Bearer ID token resolver from Authorization: Bearer <jwt>.
 */
export const firebaseBearerResolver: AdminSessionResolver = async (req) => {
  const authHeader = (req.headers?.authorization || req.headers?.Authorization) as string | undefined
  if (!authHeader || typeof authHeader !== 'string') return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  return verifyFirebaseIdToken(token)
}

/**
 * Unified fail-closed session resolver: checks signed Auth0 session cookie first,
 * then falls back to cryptographically verified Firebase Bearer ID token.
 * Never trusts client-supplied headers or query parameters.
 */
export const unifiedAdminSessionResolver: AdminSessionResolver = async (req) => {
  const auth0User = await auth0SessionResolver(req)
  if (auth0User && isAdminEmail(auth0User.email) && auth0User.email_verified !== false) {
    return auth0User
  }
  const firebaseUser = await firebaseBearerResolver(req)
  if (firebaseUser && isAdminEmail(firebaseUser.email) && firebaseUser.email_verified === true) {
    return firebaseUser
  }
  return null
}

/**
 * Returns the verified owner's email ONLY from an authenticated server-side session
 * or verified Firebase ID token.
 *
 * Never trusts client-controlled input: `x-admin-email`, `x-user-email`, `x-staff-preview`,
 * the `user_email` cookie, and `?adminEmail=` are strictly ignored.
 */
export async function getAdminEmailFromRequest(
  req: NextApiRequest,
  resolveSession: AdminSessionResolver = unifiedAdminSessionResolver
): Promise<string | null> {
  const user = await resolveSession(req).catch(() => null)
  if (!user || typeof user.email !== 'string') return null
  if (user.email_verified !== true) return null
  return isAdminEmail(user.email) ? user.email.trim().toLowerCase() : null
}

/**
 * Verifies whether the request comes from an authenticated, email-verified, allowlisted owner.
 */
export async function isAdminSession(req: NextApiRequest, resolveSession?: AdminSessionResolver): Promise<boolean> {
  return (await getAdminEmailFromRequest(req, resolveSession)) !== null
}
