import type { NextApiRequest, NextApiResponse } from 'next'
import { buildLogoutUrl, getSiteUrl, sanitizeReturnTo } from '../../../services/shopify-customer-account'
import { clearSessionCookies, COOKIE } from '../../../lib/shopify/customer-account/cookies'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idToken = req.cookies[COOKIE.idToken]
  const returnTo = sanitizeReturnTo(req.query.returnTo, '/')
  const postLogoutRedirectUri = `${getSiteUrl(req)}${returnTo}`

  clearSessionCookies(res, req)

  if (!idToken) {
    res.redirect(302, postLogoutRedirectUri)
    return
  }

  const logoutUrl = buildLogoutUrl({ idToken, postLogoutRedirectUri })
  res.redirect(302, logoutUrl)
}
