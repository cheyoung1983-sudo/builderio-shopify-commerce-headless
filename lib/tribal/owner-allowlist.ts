/**
 * Browser-safe and server-safe canonical two-email owner allowlist for all Admin
 * and Wholesale Gadget Parts (WGP) routes, UI guards, and API middleware.
 *
 * Kept strictly free of Node built-in imports (`node:*`) so client components
 * and pages can import `isAdminEmail` without pulling server modules into client bundles.
 */
export const OWNER_EMAIL_ALLOWLIST = [
  'cheyoung1983@gmail.com',
  'ryan@displaycellpros.com',
] as const

export const ADMIN_ALLOWLIST: readonly string[] = OWNER_EMAIL_ALLOWLIST

export function isAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  const cleanEmail = email.trim().toLowerCase()
  return ADMIN_ALLOWLIST.includes(cleanEmail)
}

export const isAllowedOwnerEmail = isAdminEmail
