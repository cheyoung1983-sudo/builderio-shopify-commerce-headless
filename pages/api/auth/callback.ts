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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state, shop, host, error, error_description } = req.query

  if (error) {
    clearPkceCookies(res, req)
    res.redirect(302, `/?error=${encodeURIComponent(String(error_description || error))}`)
    return
  }

  // 1. Check if this is a Customer Account API PKCE callback
  const expectedState = req.cookies[COOKIE.state]
  const codeVerifier = req.cookies[COOKIE.verifier]

  if (expectedState && codeVerifier && state === expectedState && typeof code === 'string') {
    const expectedNonce = req.cookies[COOKIE.nonce]
    const returnTo = req.cookies[COOKIE.returnTo] || '/account'

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
      return
    } catch {
      clearPkceCookies(res, req)
    }
  }

  // 2. Check if this is a Shopify Admin App installation OAuth callback
  if (typeof shop === 'string' && typeof code === 'string') {
    const clientId = process.env.SHOPIFY_CLIENT_ID
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET

    if (clientId && clientSecret) {
      try {
        const cleanShop = shop.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
        const tokenRes = await fetch(`https://${cleanShop}/admin/oauth/access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          }),
        })

        if (tokenRes.ok) {
          const redirectDestination = host
            ? `/?shop=${encodeURIComponent(cleanShop)}&host=${encodeURIComponent(String(host))}`
            : `/?shop=${encodeURIComponent(cleanShop)}`
          res.redirect(302, redirectDestination)
          return
        }
      } catch (err: any) {
        console.error('Shopify Admin OAuth token exchange error:', err?.message)
      }
    }
  }

  // Fallback redirect to homepage
  const targetHost = typeof host === 'string' ? host : ''
  const targetShop = typeof shop === 'string' ? shop : ''
  if (targetShop) {
    res.redirect(302, `/?shop=${encodeURIComponent(targetShop)}${targetHost ? `&host=${encodeURIComponent(targetHost)}` : ''}`)
    return
  }

  res.redirect(302, '/')
}
