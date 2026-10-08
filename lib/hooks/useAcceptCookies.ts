import Cookies from 'js-cookie'
import { useEffect, useState, startTransition } from 'react'
import { builder } from '@builder.io/react'
const COOKIE_NAME = 'accept_cookies'

/** Window event that re-opens the cookie consent bar (footer "Cookie Preferences"). */
export const COOKIE_PREFERENCES_EVENT = 'dcp:open-cookie-preferences'

/**
 * Re-opens the cookie consent bar. Clears the stored consent so tracking
 * stays off until the visitor accepts again.
 */
export function openCookiePreferences() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT))
}

export const useAcceptCookies = () => {
  const [acceptedCookies, setAcceptedCookies] = useState(true)

  useEffect(() => {
    // Cookies aren't readable during SSR, so the default above is
    // optimistic (true) to match server output; this corrects it
    // post-mount if needed. No derived-state equivalent exists.
    if (!Cookies.get(COOKIE_NAME)) {
      builder.canTrack = false
      startTransition(() => {
        setAcceptedCookies(false)
      })
    }

    const reopen = () => {
      Cookies.remove(COOKIE_NAME)
      builder.canTrack = false
      setAcceptedCookies(false)
    }
    window.addEventListener(COOKIE_PREFERENCES_EVENT, reopen)
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, reopen)
  }, [])

  const acceptCookies = () => {
    setAcceptedCookies(true)
    Cookies.set(COOKIE_NAME, 'accepted', { expires: 365 })
    builder.canTrack = true
  }

  return {
    acceptedCookies,
    onAcceptCookies: acceptCookies,
  }
}
