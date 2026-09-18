/**
 * Shopify Customer Account API (headless OAuth 2.0 + PKCE)
 *
 * Distinct from `services/shopify-admin.ts` (Admin API, SHOPIFY_CLIENT_ID/SECRET)
 * and `services/shopify.ts` (Storefront API). This client authenticates a buyer
 * to read/update their own account data (orders, profile, addresses).
 * https://shopify.dev/docs/api/customer
 */
import crypto from 'crypto'

export interface CustomerAccountTokens {
  accessToken: string
  idToken: string
  refreshToken?: string
  expiresAt: number // epoch ms
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}

export function getCustomerAccountClientId(): string {
  return required('SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID')
}

export function getShopId(): string {
  return required('SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID')
}

function getApiVersion(): string {
  return process.env.SHOPIFY_CUSTOMER_ACCOUNT_API_VERSION || '2025-10'
}

/** Resolves the site's own origin used to build the OAuth redirect_uri. */
export function getSiteUrl(req?: { headers: Record<string, string | string[] | undefined> }): string {
  if (req) {
    const forwardedProto = req.headers['x-forwarded-proto']
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || 'https'
    const forwardedHost = req.headers['x-forwarded-host']
    const rawHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host
    if (rawHost) {
      const host = Array.isArray(rawHost) ? rawHost[0] : rawHost
      return `${proto}://${host}`
    }
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')
  }
  return 'https://www.displaycellpros.com'
}

/**
 * Guards against open redirects: only same-site, root-relative paths are allowed.
 * Rejects protocol-relative URLs (`//evil.com`) and backslash tricks (`/\evil.com`)
 * that some browsers normalize into a protocol-relative URL.
 */
export function sanitizeReturnTo(value: unknown, fallback: string): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return fallback
  }
  return value
}

export function getCallbackUrl(req?: { headers: Record<string, string | string[] | undefined> }): string {
  return `${getSiteUrl(req)}/api/account/callback`
}

export const DEFAULT_AUTH_SCOPE = 'openid email customer-account-api:full'

export function getAuthScope(): string {
  return process.env.SHOPIFY_CUSTOMER_ACCOUNT_API_SCOPE || DEFAULT_AUTH_SCOPE
}

export function authorizeEndpoint(): string {
  return `https://shopify.com/authentication/${getShopId()}/oauth/authorize`
}

export function tokenEndpoint(): string {
  return `https://shopify.com/authentication/${getShopId()}/oauth/token`
}

export function logoutEndpoint(): string {
  return `https://shopify.com/authentication/${getShopId()}/logout`
}

export function graphqlEndpoint(): string {
  return `https://shopify.com/${getShopId()}/account/customer/api/${getApiVersion()}/graphql`
}

// ---------------------------------------------------------------------------
// PKCE
// ---------------------------------------------------------------------------

function base64url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(64))
}

export function generateCodeChallenge(verifier: string): string {
  return base64url(crypto.createHash('sha256').update(verifier).digest())
}

export function generateState(): string {
  return base64url(crypto.randomBytes(16))
}

export function generateNonce(): string {
  return base64url(crypto.randomBytes(16))
}

export function buildAuthorizeUrl(params: {
  redirectUri: string
  state: string
  nonce: string
  codeChallenge: string
  scope?: string
}): string {
  const url = new URL(authorizeEndpoint())
  url.searchParams.set('client_id', getCustomerAccountClientId())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', params.scope || getAuthScope())
  url.searchParams.set('state', params.state)
  url.searchParams.set('nonce', params.nonce)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export function buildLogoutUrl(params: { idToken?: string; postLogoutRedirectUri: string }): string {
  const url = new URL(logoutEndpoint())
  if (params.idToken) {
    url.searchParams.set('id_token_hint', params.idToken)
  }
  url.searchParams.set('post_logout_redirect_uri', params.postLogoutRedirectUri)
  return url.toString()
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string
  id_token: string
  expires_in: number
  refresh_token?: string
  error?: string
  error_description?: string
}

async function postToken(body: URLSearchParams): Promise<CustomerAccountTokens> {
  const res = await fetch(tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json: TokenResponse = await res.json()
  if (!res.ok || json.error) {
    throw new Error(
      `Customer Account API token request failed: ${json.error || res.status} ${json.error_description || ''}`.trim()
    )
  }
  return {
    accessToken: json.access_token,
    idToken: json.id_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
}

export async function exchangeCodeForTokens(params: {
  code: string
  redirectUri: string
  codeVerifier: string
}): Promise<CustomerAccountTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: getCustomerAccountClientId(),
      redirect_uri: params.redirectUri,
      code: params.code,
      code_verifier: params.codeVerifier,
    })
  )
}

export async function refreshAccessToken(refreshToken: string): Promise<CustomerAccountTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: getCustomerAccountClientId(),
      refresh_token: refreshToken,
    })
  )
}

/** Decodes a JWT payload without verifying the signature (token came directly from Shopify's token endpoint over TLS). */
export function decodeIdTokenPayload(idToken: string): Record<string, any> | null {
  try {
    const payload = idToken.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

export async function customerAccountFetch<T = any>(params: {
  accessToken: string
  query: string
  variables?: Record<string, any>
}): Promise<{ data?: T; errors?: any[] }> {
  const res = await fetch(graphqlEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Note: this API expects the raw access token, not a "Bearer " prefix.
      Authorization: params.accessToken,
    },
    body: JSON.stringify({ query: params.query, variables: params.variables }),
  })
  return res.json()
}

export const CUSTOMER_QUERY = /* GraphQL */ `
  query getCustomer {
    customer {
      id
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      defaultAddress {
        address1
        address2
        city
        province
        zip
        country
      }
    }
  }
`
