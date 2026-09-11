import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'
import { builder } from '@builder.io/react'
const COOKIE_NAME = 'accept_cookies'

export const useAcceptCookies = () => {
  const [acceptedCookies, setAcceptedCookies] = useState(true)

  useEffect(() => {
    // Cookies aren't readable during SSR, so the default above is
    // optimistic (true) to match server output; this corrects it
    // post-mount if needed. No derived-state equivalent exists.
    if (!Cookies.get(COOKIE_NAME)) {
      builder.canTrack = false
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAcceptedCookies(false)
    }
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
