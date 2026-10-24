import { useEffect } from 'react'
import Script from 'next/script'
import { getGoogleTagScriptSrc, parseGoogleTagId } from '../../lib/analytics/google-tag'

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

type GoogleTagProps = {
  /** Override for tests; defaults to the public NEXT_PUBLIC_GA_ID build-time env var. */
  id?: string
}

/**
 * Loads the Google tag (gtag.js) for GA4. Renders nothing unless a valid
 * measurement ID (`G-XXXX`) is configured. No consent gate (owner's decision).
 *
 * The site CSP forbids inline scripts, so gtag() is defined and configured here
 * in bundled code; gtag.js picks the queued commands up from window.dataLayer
 * when it loads.
 */
export default function GoogleTag({ id = process.env.NEXT_PUBLIC_GA_ID }: GoogleTagProps) {
  const tagId = parseGoogleTagId(id)
  const src = getGoogleTagScriptSrc(id)

  useEffect(() => {
    if (!tagId) return
    window.dataLayer = window.dataLayer || []
    // gtag.js requires the real `arguments` object to be queued (not an array).
    function gtag(..._args: unknown[]) {
      window.dataLayer!.push(arguments)
    }
    gtag('js', new Date())
    gtag('config', tagId)
  }, [tagId])

  if (!tagId || !src) return null

  return <Script id="google-tag" src={src} strategy="afterInteractive" />
}
