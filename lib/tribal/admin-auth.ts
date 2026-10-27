import type { NextApiRequest } from 'next'
import { parseCookieHeader } from './manual-review'

export const ADMIN_ALLOWLIST = [
  'ryan@displaycellpros.com',
  'cheyoung1983@gmail.com',
]

/**
 * Checks if a given email address is in the designated admin allowlist.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  const cleanEmail = email.trim().toLowerCase()
  return ADMIN_ALLOWLIST.includes(cleanEmail)
}

/**
 * Extracts and validates the authenticated admin email from a NextApiRequest.
 * Checks cookies, headers, and environment overrides.
 */
export function getAdminEmailFromRequest(req: NextApiRequest): string | null {
  // 1. Header overrides (e.g. x-admin-email from proxy/middleware or test environment)
  const headerEmail = req.headers['x-admin-email'] || req.headers['x-user-email']
  if (typeof headerEmail === 'string' && isAdminEmail(headerEmail)) {
    return headerEmail.trim().toLowerCase()
  }

  // 2. Cookie parsing (Auth0 or session cookie)
  const cookies = parseCookieHeader(req.headers.cookie)
  if (cookies.user_email && isAdminEmail(cookies.user_email)) {
    return cookies.user_email.trim().toLowerCase()
  }

  // 3. Fallback check for query email if provided
  const queryEmail = req.query.adminEmail
  if (typeof queryEmail === 'string' && isAdminEmail(queryEmail)) {
    return queryEmail.trim().toLowerCase()
  }

  return null
}

/**
 * Verifies whether the request is originated by an authorized admin user.
 */
export function isAdminSession(req: NextApiRequest): boolean {
  return getAdminEmailFromRequest(req) !== null
}
