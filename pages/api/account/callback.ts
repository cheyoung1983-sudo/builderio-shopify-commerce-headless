import type { NextApiRequest, NextApiResponse } from 'next'
import {
  exchangeCodeForTokens,
  getCallbackUrl,
} from '../../../services/shopify-customer-account'
import { sanitizeReturnTo } from './login'

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {}
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach((pair) => {
    const [name, ...rest] = pair.trim().split('=')
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='))
    }
  })
  return cookies
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state, error, error_description } = req.query

  if (error) {
    console.error('[CustomerAccount:Callback] OAuth provider returned error:', error, error_description)
    return res.redirect(302, `/account?error=${encodeURIComponent(String(error_description || error))}`)
  }

  if (typeof code !== 'string' || typeof state !== 'string') {
    return res.status(400).json({ error: 'Missing code or state parameter' })
  }

  const cookies = parseCookies(req.headers.cookie)
  const expectedState = cookies['shopify_oauth_state']
  const codeVerifier = cookies['shopify_pkce_verifier']
  const returnTo = sanitizeReturnTo(cookies['shopify_oauth_return_to'])

  if (!expectedState || state !== expectedState) {
    console.error('[CustomerAccount:Callback] State mismatch or missing expected state')
    return res.status(400).json({ error: 'OAuth state mismatch' })
  }

  if (!codeVerifier) {
    console.error('[CustomerAccount:Callback] PKCE code verifier missing')
    return res.status(400).json({ error: 'Missing PKCE code verifier' })
  }

  try {
    const redirectUri = getCallbackUrl(req)
    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri,
      codeVerifier,
    })

    const isSecure = process.env.NODE_ENV === 'production'
    const sessionCookieOpts = `Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${isSecure ? '; Secure' : ''}`
    const clearCookieOpts = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? '; Secure' : ''}`

    res.setHeader('Set-Cookie', [
      `shopify_customer_token=${tokens.accessToken}; ${sessionCookieOpts}`,
      `shopify_customer_id_token=${tokens.idToken}; ${sessionCookieOpts}`,
      ...(tokens.refreshToken ? [`shopify_customer_refresh_token=${tokens.refreshToken}; ${sessionCookieOpts}`] : []),
      `shopify_oauth_state=; ${clearCookieOpts}`,
      `shopify_pkce_verifier=; ${clearCookieOpts}`,
      `shopify_oauth_nonce=; ${clearCookieOpts}`,
      `shopify_oauth_return_to=; ${clearCookieOpts}`,
    ])

    return res.redirect(302, returnTo)
  } catch (err: any) {
    console.error('[CustomerAccount:Callback] Token exchange failure:', err)
    return res.redirect(302, `/account?error=${encodeURIComponent(err?.message || 'Token exchange failed')}`)
  }
}
