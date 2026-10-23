/**
 * Feature flag for the automatic tribal sales tax exemption.
 *
 * OFF unless TRIBAL_TAX_EXEMPT_ENABLED is exactly "true". While off, verified
 * members still get the 20% commercial discount, but no code path marks an
 * order or customer tax exempt (standard tax on the post-discount price).
 */
export function isTribalTaxExemptEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.TRIBAL_TAX_EXEMPT_ENABLED || '').trim().toLowerCase() === 'true'
}
