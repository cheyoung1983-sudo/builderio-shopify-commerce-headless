/**
 * Shopify Admin API access token (server-only).
 *
 * Gets an Admin API token with the OAuth client credentials grant, which works
 * for a Dev Dashboard app installed on a store in the same Shopify
 * organization:
 *
 *   POST https://{shop}.myshopify.com/admin/oauth/access_token
 *   grant_type=client_credentials&client_id=...&client_secret=...
 *
 * Shopify returns `{ access_token, scope, expires_in }` (24h today). The token
 * is cached in memory until shortly before it expires; callers that get a 401
 * from the Admin API call `invalidateShopifyAdminAccessToken()` and retry
 * once, which forces a fresh token.
 *
 * SHOPIFY_ADMIN_ACCESS_TOKEN, if set, is used as a static override (no fetch,
 * no refresh). Leave it unset to use the client credentials grant.
 *
 * Never log or return the token itself.
 */

if (typeof window !== 'undefined') {
  throw new Error('lib/shopify/admin-token is server-only and must not be bundled for the browser.')
}

/** Refresh this long before Shopify's stated expiry (or 10% of the lifetime if shorter). */
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

export class ShopifyAdminNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShopifyAdminNotConfiguredError'
  }
}

export class ShopifyAdminTokenError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ShopifyAdminTokenError'
    this.status = status
  }
}

type FetchLike = (input: string, init?: any) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<any>
}>

interface CachedToken {
  token: string
  expiresAt: number
  cacheKey: string
}

let cached: CachedToken | null = null
let inflight: Promise<string> | null = null
let inflightKey = ''

function isBlank(value?: string): boolean {
  return !value || value === 'undefined' || value.includes('[SENSITIVE]')
}

/**
 * The shop's *.myshopify.com domain. The token endpoint and Admin API must be
 * called on the myshopify domain, not a custom storefront domain.
 */
export function getAdminShopDomain(): string {
  const raw =
    (!isBlank(process.env.SHOPIFY_STORE_DOMAIN) && process.env.SHOPIFY_STORE_DOMAIN) ||
    (!isBlank(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) &&
      process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) ||
    ''
  let domain = String(raw).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  if (domain && !domain.includes('.')) domain = `${domain}.myshopify.com`
  return domain.toLowerCase()
}

function getStaticOverrideToken(): string {
  const value = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  return isBlank(value) ? '' : String(value).trim()
}

function getClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = isBlank(process.env.SHOPIFY_CLIENT_ID) ? '' : String(process.env.SHOPIFY_CLIENT_ID).trim()
  const clientSecret = isBlank(process.env.SHOPIFY_CLIENT_SECRET)
    ? ''
    : String(process.env.SHOPIFY_CLIENT_SECRET).trim()
  return { clientId, clientSecret }
}

/** True when the Admin API can be called (shop domain plus override token or client credentials). */
export function isShopifyAdminTokenConfigured(): boolean {
  if (!getAdminShopDomain()) return false
  if (getStaticOverrideToken()) return true
  const { clientId, clientSecret } = getClientCredentials()
  return Boolean(clientId && clientSecret)
}

/** Drop the cached token so the next call fetches a new one (use after an Admin API 401). */
export function invalidateShopifyAdminAccessToken(): void {
  cached = null
}

/** Test hook: clear cache and any in-flight request. */
export function resetShopifyAdminTokenCacheForTests(): void {
  cached = null
  inflight = null
  inflightKey = ''
}

async function requestNewToken(
  shopDomain: string,
  clientId: string,
  clientSecret: string,
  fetchImpl: FetchLike,
  now: () => number
): Promise<CachedToken> {
  const url = `https://${shopDomain}/admin/oauth/access_token`
  let res
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    })
  } catch (err: any) {
    throw new ShopifyAdminTokenError(
      `Could not reach Shopify token endpoint for ${shopDomain}: ${err?.message || 'network error'}`
    )
  }

  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok || !body?.access_token) {
    // Only surface Shopify's error code/description, never request secrets.
    const reason = [body?.error, body?.error_description].filter(Boolean).join(': ')
    throw new ShopifyAdminTokenError(
      `Shopify token request failed (HTTP ${res.status})${reason ? `: ${reason}` : ''}`,
      res.status
    )
  }

  const lifetimeMs = Math.max(0, Number(body.expires_in) || 0) * 1000
  const margin = Math.min(TOKEN_REFRESH_MARGIN_MS, Math.floor(lifetimeMs * 0.1))
  return {
    token: String(body.access_token),
    expiresAt: now() + lifetimeMs - margin,
    cacheKey: `${shopDomain}|${clientId}`,
  }
}

/**
 * Returns a valid Admin API access token, fetching or refreshing it as needed.
 * Concurrent callers share one in-flight token request.
 */
export async function getShopifyAdminAccessToken(
  options: { forceRefresh?: boolean; fetchImpl?: FetchLike; now?: () => number } = {}
): Promise<string> {
  const { forceRefresh = false, now = Date.now } = options
  const fetchImpl: FetchLike = options.fetchImpl || ((input, init) => fetch(input, init) as any)

  const override = getStaticOverrideToken()
  if (override) return override

  const shopDomain = getAdminShopDomain()
  const { clientId, clientSecret } = getClientCredentials()
  if (!shopDomain || !clientId || !clientSecret) {
    throw new ShopifyAdminNotConfiguredError(
      'Shopify Admin API is not configured: set SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.'
    )
  }

  const cacheKey = `${shopDomain}|${clientId}`
  if (forceRefresh) cached = null
  if (cached && cached.cacheKey === cacheKey && now() < cached.expiresAt) {
    return cached.token
  }

  if (inflight && inflightKey === cacheKey) return inflight

  inflightKey = cacheKey
  const request = requestNewToken(shopDomain, clientId, clientSecret, fetchImpl, now)
    .then((fresh) => {
      cached = fresh
      return fresh.token
    })
    .finally(() => {
      if (inflight === request) {
        inflight = null
        inflightKey = ''
      }
    })
  inflight = request
  return request
}
