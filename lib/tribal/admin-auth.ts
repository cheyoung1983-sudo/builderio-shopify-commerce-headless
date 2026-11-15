import type { NextApiRequest } from 'next'

export const ADMIN_ALLOWLIST = [
  'ryan@displaycellpros.com',
]

/**
 * Checks if a given email address is in the designated admin allowlist.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  const cleanEmail = email.trim().toLowerCase()
  return ADMIN_ALLOWLIST.includes(cleanEmail)
}

export interface AdminSessionUser {
  email?: string | null
  email_verified?: boolean | null
}

/** Resolves the signed-in user from the server-side session. */
export type AdminSessionResolver = (req: NextApiRequest) => Promise<AdminSessionUser | null>

/**
 * Default resolver: the server-side Auth0 session (encrypted, signed cookie
 * validated by the Auth0 SDK). Fails closed (null) when Auth0 is not configured.
 */
export const auth0SessionResolver: AdminSessionResolver = async (req) => {
  if (!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_SECRET)) return null
  try {
    const { auth0 } = await import('../auth0.ts')
    const session = await auth0.getSession(req as any)
    return (session?.user as AdminSessionUser | undefined) || null
  } catch {
    return null
  }
}

/**
 * Returns the reviewer's email ONLY from the authenticated server-side session.
 *
 * Never trusts client-controlled input: the `x-admin-email` / `x-user-email`
 * headers, the `user_email` cookie and the `?adminEmail=` query parameter are
 * ignored. The session email must be verified and on ADMIN_ALLOWLIST. The HTTP
 * Basic Auth in proxy.ts stays as the outer layer for /api/tribal/admin.
 */
export async function getAdminEmailFromRequest(
  req: NextApiRequest,
  resolveSession: AdminSessionResolver = auth0SessionResolver
): Promise<string | null> {
  const user = await resolveSession(req).catch(() => null)
  if (!user || typeof user.email !== 'string') return null
  if (user.email_verified === false) return null
  return isAdminEmail(user.email) ? user.email.trim().toLowerCase() : null
}

/**
 * Verifies whether the request comes from an authenticated, allowlisted admin session.
 */
export async function isAdminSession(req: NextApiRequest, resolveSession?: AdminSessionResolver): Promise<boolean> {
  return (await getAdminEmailFromRequest(req, resolveSession)) !== null
}
