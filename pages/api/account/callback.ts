import type { NextApiRequest, NextApiResponse } from 'next'
import {
  decodeIdTokenPayload,
  exchangeCodeForTokens,
  getCallbackUrl,
  getCustomerAccountClientId,
} from '../../../services/shopify-customer-account'
import {
  appendCookie,
  clearPkceCookies,
  COOKIE,
  isHttpsRequest,
} from '../../../lib/shopify/customer-account/cookies'

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/account'
  }
  return value
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  const { code, state, error, error_description } = req.query

  if (error) {
    clearPkceCookies(res, req)
    res.redirect(302, `/account?error=${encodeURIComponent(String(error_description || error))}`)
    return
  }

  const expectedState = req.cookies[COOKIE.state]
  const codeVerifier = req.cookies[COOKIE.verifier]
  const expectedNonce = req.cookies[COOKIE.nonce]
  const returnTo = sanitizeReturnTo(req.cookies[COOKIE.returnTo])

  if (
    typeof code !== 'string' ||
    typeof state !== 'string' ||
    !expectedState ||
    !codeVerifier ||
    state !== expectedState
  ) {
    clearPkceCookies(res, req)
    res.redirect(302, '/account?error=invalid_state')
    return
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri: getCallbackUrl(req),
      codeVerifier,
    })

    const idTokenPayload = decodeIdTokenPayload(tokens.idToken)
    if (expectedNonce && idTokenPayload?.nonce !== expectedNonce) {
      clearPkceCookies(res, req)
      res.redirect(302, '/account?error=invalid_nonce')
      return
    }
    if (idTokenPayload?.aud !== getCustomerAccountClientId()) {
      clearPkceCookies(res, req)
      res.redirect(302, '/account?error=invalid_audience')
      return
    }

    const secure = isHttpsRequest(req)
    const expiresInSeconds = Math.max(1, Math.floor((tokens.expiresAt - Date.now()) / 1000))
    appendCookie(res, COOKIE.accessToken, tokens.accessToken, { maxAge: expiresInSeconds, secure })
    appendCookie(res, COOKIE.idToken, tokens.idToken, { maxAge: expiresInSeconds, secure })
    appendCookie(res, COOKIE.expiresAt, String(tokens.expiresAt), { maxAge: expiresInSeconds, secure })
    if (tokens.refreshToken) {
      appendCookie(res, COOKIE.refreshToken, tokens.refreshToken, { maxAge: REFRESH_TOKEN_MAX_AGE, secure })
    }
    clearPkceCookies(res, req)

    res.redirect(302, returnTo)
  } catch (err) {
    clearPkceCookies(res, req)
    console.error('[account/callback] Token exchange failed', err)
    res.redirect(302, '/account?error=login_failed')
  }
}
