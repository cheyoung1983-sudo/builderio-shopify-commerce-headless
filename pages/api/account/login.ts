import type { NextApiRequest, NextApiResponse } from 'next'
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
  getCallbackUrl,
} from '../../../services/shopify-customer-account'

export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value) return '/account'
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes(':')) {
    return '/account'
  }
  return value.trim()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const returnTo = sanitizeReturnTo(req.query.returnTo)
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = generateState()
    const nonce = generateNonce()
    const redirectUri = getCallbackUrl(req)

    const authUrl = buildAuthorizeUrl({
      redirectUri,
      state,
      nonce,
      codeChallenge,
    })

    const isSecure = process.env.NODE_ENV === 'production'
    const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=600${isSecure ? '; Secure' : ''}`

    res.setHeader('Set-Cookie', [
      `shopify_pkce_verifier=${codeVerifier}; ${cookieOptions}`,
      `shopify_oauth_state=${state}; ${cookieOptions}`,
      `shopify_oauth_nonce=${nonce}; ${cookieOptions}`,
      `shopify_oauth_return_to=${encodeURIComponent(returnTo)}; ${cookieOptions}`,
    ])

    return res.redirect(302, authUrl)
  } catch (err: any) {
    console.error('[CustomerAccount:Login] Failed to build authorize URL:', err)
    return res.status(500).json({ error: err?.message || 'Authentication initialization error' })
  }
}
