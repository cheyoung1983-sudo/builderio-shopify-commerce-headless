/**
 * Google tag (gtag.js / GA4) helpers.
 *
 * The measurement ID comes from the public build-time env var
 * NEXT_PUBLIC_GA_ID. Nothing is loaded unless it is set AND looks like a
 * GA4 measurement ID (`G-` followed by upper-case letters/digits), so a typo
 * or a stray value can never inject anything into a script URL.
 *
 * Note: the site's CSP (next.config.js) has no 'unsafe-inline' for scripts,
 * so the tag is initialised from bundled code (see GoogleTag.tsx), not from an
 * inline <script>.
 */

export const GOOGLE_TAG_ID_PATTERN = /^G-[A-Z0-9]+$/

/** Returns the trimmed ID when valid, otherwise null. */
export function parseGoogleTagId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const id = raw.trim()
  return GOOGLE_TAG_ID_PATTERN.test(id) ? id : null
}

/** URL of the gtag.js loader for a (valid) measurement ID, or null. */
export function getGoogleTagScriptSrc(raw: unknown): string | null {
  const id = parseGoogleTagId(raw)
  return id ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}` : null
}
