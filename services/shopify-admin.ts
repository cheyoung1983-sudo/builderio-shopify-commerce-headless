/**
 * Shopify Admin API service (server-only).
 *
 * Admin access comes from the client credentials grant in
 * lib/shopify/admin-token.ts (SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET on a
 * Dev Dashboard app installed on the store). The token is cached in memory and
 * refreshed automatically; on a 401 the cache is dropped and the request is
 * retried once with a fresh token. SHOPIFY_ADMIN_ACCESS_TOKEN remains an
 * optional static override.
 *
 * Imports here are relative with explicit .ts extensions so this module also
 * loads under `node --experimental-strip-types` (used by the test suite).
 */

import {
  getAdminShopDomain,
  getShopifyAdminAccessToken,
  invalidateShopifyAdminAccessToken,
  isShopifyAdminTokenConfigured,
  ShopifyAdminNotConfiguredError,
} from '../lib/shopify/admin-token.ts'

if (typeof window !== 'undefined') {
  throw new Error('services/shopify-admin is server-only and must not be bundled for the browser.')
}

export const DEFAULT_ADMIN_API_VERSION = '2026-01'

export interface ShopifyAdminConfig {
  clientId: string
  clientSecret: string
  storeDomain: string
  apiVersion: string
}

export interface ShopifyAdminFetchResult<T> {
  data?: T
  errors?: Array<{ message: string; extensions?: Record<string, any> }>
  /** HTTP status of the Admin API response, when one was received. */
  status?: number
  /** True when the Admin API isn't configured (missing domain or credentials). */
  notConfigured?: boolean
}

export function getShopifyAdminConfig(): ShopifyAdminConfig {
  return {
    clientId: process.env.SHOPIFY_CLIENT_ID || '',
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
    storeDomain: getAdminShopDomain(),
    apiVersion: process.env.SHOPIFY_ADMIN_API_VERSION || DEFAULT_ADMIN_API_VERSION,
  }
}

/** True when the store domain and Admin credentials (or override token) are configured. */
export function isShopifyAdminConfigured(): boolean {
  return isShopifyAdminTokenConfigured()
}

async function postGraphql(
  url: string,
  token: string,
  query: string,
  variables?: Record<string, any>
): Promise<{ status: number; body: any }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  })
  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { status: res.status, body }
}

/**
 * Runs an Admin GraphQL query/mutation. Never throws; problems are returned in
 * `errors` (and `notConfigured` / `status` for callers that need to branch).
 */
export async function shopifyAdminFetch<T = any>({
  accessToken,
  query,
  variables,
}: {
  /** Explicit token (skips the cached client-credentials token). */
  accessToken?: string
  query: string
  variables?: Record<string, any>
}): Promise<ShopifyAdminFetchResult<T>> {
  const config = getShopifyAdminConfig()

  if (!config.storeDomain) {
    return {
      notConfigured: true,
      errors: [{ message: 'Shopify Admin API is not configured: missing SHOPIFY_STORE_DOMAIN.' }],
    }
  }

  const url = `https://${config.storeDomain}/admin/api/${config.apiVersion}/graphql.json`

  try {
    let token = accessToken || (await getShopifyAdminAccessToken())
    let { status, body } = await postGraphql(url, token, query, variables)

    // Expired/revoked token: drop the cache and retry once with a fresh one.
    if (status === 401 && !accessToken) {
      invalidateShopifyAdminAccessToken()
      token = await getShopifyAdminAccessToken({ forceRefresh: true })
      ;({ status, body } = await postGraphql(url, token, query, variables))
    }

    if (status < 200 || status >= 300) {
      const detail =
        (Array.isArray(body?.errors) && body.errors.map((e: any) => e?.message).filter(Boolean).join('; ')) ||
        (typeof body?.errors === 'string' ? body.errors : '')
      return {
        status,
        errors: [{ message: `Shopify Admin API returned HTTP ${status}${detail ? `: ${detail}` : ''}` }],
      }
    }

    return { status, data: body?.data, errors: body?.errors }
  } catch (error: any) {
    if (error instanceof ShopifyAdminNotConfiguredError) {
      return { notConfigured: true, errors: [{ message: error.message }] }
    }
    return {
      errors: [{ message: error?.message || 'Shopify Admin API request failed.' }],
    }
  }
}

export const shopifyAdmin = {
  getConfig: getShopifyAdminConfig,
  isConfigured: isShopifyAdminConfigured,
  fetch: shopifyAdminFetch,
}

export default shopifyAdmin
