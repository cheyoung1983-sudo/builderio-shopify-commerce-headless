import type { NextApiRequest, NextApiResponse } from 'next'
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
  getCallbackUrl,
  sanitizeReturnTo,
} from '../../../services/shopify-customer-account.ts'
import { appendCookie, COOKIE, isHttpsRequest } from '../../../lib/shopify/customer-account/cookies.ts'

const PKCE_COOKIE_MAX_AGE = 600 // 10 minutes: just long enough to complete the redirect round trip

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  try {
    const verifier = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier)
    const state = generateState()
    const nonce = generateNonce()
    const returnTo = sanitizeReturnTo(req.query.returnTo)
    const secure = isHttpsRequest(req)

    appendCookie(res, COOKIE.verifier, verifier, { maxAge: PKCE_COOKIE_MAX_AGE, secure })
    appendCookie(res, COOKIE.state, state, { maxAge: PKCE_COOKIE_MAX_AGE, secure })
    appendCookie(res, COOKIE.nonce, nonce, { maxAge: PKCE_COOKIE_MAX_AGE, secure })
    appendCookie(res, COOKIE.returnTo, returnTo, { maxAge: PKCE_COOKIE_MAX_AGE, secure })

    const authorizeUrl = buildAuthorizeUrl({
      redirectUri: getCallbackUrl(req),
      state,
      nonce,
      codeChallenge: challenge,
    })

    res.redirect(302, authorizeUrl)
  } catch (error) {
    console.error('[account/login] Failed to start login', error)
    res.status(500).json({ error: 'Failed to start Customer Account API login' })
  }
}
