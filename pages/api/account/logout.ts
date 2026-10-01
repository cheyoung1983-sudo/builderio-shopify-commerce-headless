import type { NextApiRequest, NextApiResponse } from 'next'
import {
  buildLogoutUrl,
  getSiteUrl,
} from '../../../services/shopify-customer-account'

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
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cookies = parseCookies(req.headers.cookie)
  const idToken = cookies['shopify_customer_id_token']
  const postLogoutRedirectUri = `${getSiteUrl(req)}/account`

  const isSecure = process.env.NODE_ENV === 'production'
  const clearCookieOpts = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? '; Secure' : ''}`

  res.setHeader('Set-Cookie', [
    `shopify_customer_token=; ${clearCookieOpts}`,
    `shopify_customer_id_token=; ${clearCookieOpts}`,
    `shopify_customer_refresh_token=; ${clearCookieOpts}`,
  ])

  try {
    const logoutUrl = buildLogoutUrl({
      idToken,
      postLogoutRedirectUri,
    })
    return res.redirect(302, logoutUrl)
  } catch (err: any) {
    console.error('[CustomerAccount:Logout] Failed to construct logout URL:', err)
    return res.redirect(302, '/account')
  }
}
