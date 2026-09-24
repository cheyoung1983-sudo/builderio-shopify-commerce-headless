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
  return process.env.SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID || '102354289012'
}

function getApiVersion(): string {
  return process.env.SHOPIFY_CUSTOMER_ACCOUNT_API_VERSION || '2025-10'
}

/** Normalizes allowed site origins and strips unsafe path data before using them in redirect URIs. */
function toHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

function isTruthy(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())
}

function isLocalHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '[::1]' ||
    normalized.endsWith('.localhost') ||
    normalized.startsWith('localhost:') ||
    normalized.startsWith('127.0.0.1:') ||
    normalized.startsWith('[::1]:')
  )
}

function isHostNameSafe(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()
  if (!normalized || normalized.includes(' ') || normalized.includes('/')) {
    return false
  }

  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1' || normalized === '[::1]') {
    return true
  }

  if (/^\[[0-9a-f:]+\]$/i.test(normalized)) {
    return true
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) {
    return true
  }

  const labelPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i
  return labelPattern.test(normalized)
}

function normalizeSiteOrigin(candidate: string): string | null {
  if (!candidate) {
    return null
  }

  const trimmed = candidate.trim().replace(/\/+$/, '')
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/')) {
    return null
  }

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(withScheme)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    if (!isHostNameSafe(url.hostname)) {
      return null
    }
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return null
    }
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

function trustedForwardHeadersEnabled(req?: { headers: Record<string, string | string[] | undefined> }): boolean {
  if (process.env.NODE_ENV !== 'production') {
    const host = toHeaderValue(req?.headers?.host)
    return !host || isLocalHost(host)
  }

  return (
    isTruthy(process.env.TRUSTED_PROXY) ||
    isTruthy(process.env.TRUSTED_PROXIES) ||
    isTruthy(process.env.TRUSTED_FORWARDED_HEADERS) ||
    isTruthy(process.env.ALLOW_FORWARDED_HEADERS)
  )
}

function resolveForwardedOrigin(req?: { headers: Record<string, string | string[] | undefined> }): string | null {
  if (!req || !trustedForwardHeadersEnabled(req)) {
    return null
  }

  const forwardedProto = toHeaderValue(req.headers['x-forwarded-proto'])
  const forwardedHost = toHeaderValue(req.headers['x-forwarded-host']) || toHeaderValue(req.headers.host)
  if (!forwardedHost) {
    return null
  }

  const proto = (forwardedProto || 'https').split(',')[0].trim().toLowerCase()
  const host = forwardedHost.split(',')[0].trim()
  if (!['http', 'https'].includes(proto)) {
    return null
  }
  if (process.env.NODE_ENV === 'production' && proto !== 'https') {
    return null
  }

  const normalizedHost = host.replace(/^https?:\/\//i, '').replace(/^\/+/, '')
  if (!isHostNameSafe(normalizedHost)) {
    return null
  }

  return `${proto}://${normalizedHost}`
}

/** Returns a relative-only path to keep callback redirects within the app origin. */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/account'
  }
  return value
}

/** Resolves the site's own origin used to build the OAuth redirect_uri. */
export function getSiteUrl(req?: { headers: Record<string, string | string[] | undefined> }): string {
  const configured = [process.env.NEXT_PUBLIC_SITE_URL, process.env.APP_URL, process.env.SITE_URL]
    .map((value) => normalizeSiteOrigin(value || ''))
    .find((value) => Boolean(value))

  if (configured) {
    return configured
  }

  const forwardedOrigin = resolveForwardedOrigin(req)
  if (forwardedOrigin) {
    return forwardedOrigin
  }

  return 'https://displaycellpros.com'
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

export interface CustomerAddress {
  address1?: string | null
  address2?: string | null
  city?: string | null
  province?: string | null
  zip?: string | null
  country?: string | null
}

export interface CustomerOrderLineItem {
  id: string
  title: string
  quantity: number
  variantTitle?: string | null
  image?: {
    url: string
    altText?: string | null
  } | null
  price?: {
    amount: string
    currencyCode: string
  } | null
}

export interface CustomerOrder {
  id: string
  name: string
  number?: number | string | null
  processedAt: string
  financialStatus?: string | null
  fulfillmentStatus?: string | null
  totalPrice?: {
    amount: string
    currencyCode: string
  } | null
  lineItems?: {
    edges: Array<{
      node: CustomerOrderLineItem
    }>
  } | null
}

export interface CustomerAccountProfile {
  id: string
  firstName?: string | null
  lastName?: string | null
  emailAddress?: { emailAddress?: string | null } | null
  phoneNumber?: { phoneNumber?: string | null } | null
  defaultAddress?: CustomerAddress | null
  orders?: {
    edges: Array<{
      node: CustomerOrder
    }>
  } | null
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
      phoneNumber {
        phoneNumber
      }
      defaultAddress {
        address1
        address2
        city
        province
        zip
        country
      }
      orders(first: 25, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            name
            number
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice {
              amount
              currencyCode
            }
            lineItems(first: 10) {
              edges {
                node {
                  id
                  title
                  quantity
                  image {
                    url
                  }
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

