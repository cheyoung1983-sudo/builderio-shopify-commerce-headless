/**
 * Server-only helper: resolve the signed-in Shopify customer (if any) for a
 * getServerSideProps request, refreshing an expired access token the same way
 * pages/account/index.tsx does. Returns null for signed-out visitors and on any
 * failure; it never throws and never exposes tokens.
 */
import type { IncomingMessage, ServerResponse } from 'http'
import {
  CUSTOMER_QUERY,
  customerAccountFetch,
  refreshAccessToken,
  type CustomerAccountProfile,
} from '../../../services/shopify-customer-account'
import { appendCookie, COOKIE, isHttpsRequest } from './cookies'

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30

export async function getSignedInCustomer(
  req: IncomingMessage & { cookies: Partial<Record<string, string>> },
  res: ServerResponse
): Promise<CustomerAccountProfile | null> {
  try {
    let accessToken = req.cookies[COOKIE.accessToken]
    const expiresAt = Number(req.cookies[COOKIE.expiresAt] || 0)
    const refreshToken = req.cookies[COOKIE.refreshToken]
    const isExpired = !accessToken || !expiresAt || Date.now() >= expiresAt

    if (isExpired && refreshToken) {
      const tokens = await refreshAccessToken(refreshToken)
      accessToken = tokens.accessToken
      const secure = isHttpsRequest(req)
      const expiresInSeconds = Math.max(1, Math.floor((tokens.expiresAt - Date.now()) / 1000))
      appendCookie(res, COOKIE.accessToken, tokens.accessToken, { maxAge: expiresInSeconds, secure })
      appendCookie(res, COOKIE.idToken, tokens.idToken, { maxAge: expiresInSeconds, secure })
      appendCookie(res, COOKIE.expiresAt, String(tokens.expiresAt), { maxAge: expiresInSeconds, secure })
      if (tokens.refreshToken) {
        appendCookie(res, COOKIE.refreshToken, tokens.refreshToken, { maxAge: REFRESH_TOKEN_MAX_AGE, secure })
      }
    } else if (isExpired) {
      return null
    }
    if (!accessToken) return null

    const { data } = await customerAccountFetch<{ customer: CustomerAccountProfile }>({
      accessToken,
      query: CUSTOMER_QUERY,
    })
    return data?.customer ?? null
  } catch {
    return null
  }
}
