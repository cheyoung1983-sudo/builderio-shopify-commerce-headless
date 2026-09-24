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

/** Resolves the site's own origin used to build the OAuth redirect_uri. */
export function getSiteUrl(req?: { headers: Record<string, string | string[] | undefined> }): string {
  const siteUrlEnv = process.env.NEXT_PUBLIC_SITE_URL;
  const trustedProxy = process.env.TRUSTED_PROXY === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  if (req && trustedProxy) {
    const forwardedProto = req.headers['x-forwarded-proto']
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || 'https'
    const forwardedHost = req.headers['x-forwarded-host']
    const rawHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host
    if (rawHost) {
      const host = Array.isArray(rawHost) ? rawHost[0] : rawHost
      const finalProto = isProd && proto === 'http' ? 'https' : proto;
      return `${finalProto}://${host}`
    }
  }

  if (siteUrlEnv) {
    const normalized = siteUrlEnv.replace(/\/+$/, '');
    if (isProd && normalized.startsWith('http://')) {
      return normalized.replace('http://', 'https://');
    }
    return normalized;
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
// UCP Delegated IdP Flow (Buyer-Linked Tokens)
// ---------------------------------------------------------------------------

export interface BuyerLinkedTokenParams {
  shopAccessToken: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  resourceServer?: string; // e.g. 'https://catalog.shopify.com' or 'https://snowdevil.myshopify.com'
}

/**
 * Discovery 1: find the authorization server from the resource server's
 * OAuth protected resource metadata, then read its token endpoint.
 */
export async function discoverShopifyAuthServer(resourceServer: string) {
  const res = await fetch(`${resourceServer}/.well-known/oauth-protected-resource`);
  if (!res.ok) throw new Error(`${res.status} fetching protected resource metadata from ${resourceServer}`);
  
  const { authorization_servers } = await res.json();
  const issuer = new URL(authorization_servers[0]);
  const path = issuer.pathname === '/' ? '' : issuer.pathname;
  
  const metadataRes = await fetch(`${issuer.origin}/.well-known/oauth-authorization-server${path}`);
  if (!metadataRes.ok) throw new Error(`${metadataRes.status} fetching auth server metadata from ${issuer.origin}`);
  
  const metadata = await metadataRes.json();
  
  // The grant's audience: Shopify's global authorization server is
  // identified by its host, and a merchant store by the store's domain.
  const audience = path ? new URL(resourceServer).host : issuer.host;
  
  return { audience, tokenEndpoint: metadata.token_endpoint };
}

/**
 * Discovery 2: find Shop as the delegated IdP from the identity linking
 * capability in Shopify's UCP business profile.
 */
export async function discoverShopAuthUrl(resourceServer: string) {
  const res = await fetch(`${resourceServer}/.well-known/ucp`);
  if (!res.ok) throw new Error(`${res.status} fetching UCP business profile from ${resourceServer}`);
  
  const { ucp } = await res.json();
  const [identityLinking] = ucp.capabilities['dev.ucp.common.identity_linking'];
  const [provider] = Object.values(identityLinking.config.providers as Record<string, any[]>)
    .flat()
    .filter((p) => p.type === 'oauth2');
    
  return provider.auth_url; // https://accounts.shop.app
}

/**
 * Discovery 3: read Shop's OAuth endpoints from its authorization server metadata.
 */
export async function discoverShopEndpoints(shopAuthUrl: string) {
  const res = await fetch(`${shopAuthUrl}/.well-known/oauth-authorization-server`);
  if (!res.ok) throw new Error(`${res.status} fetching Shop auth server metadata`);
  return res.json();
}

/**
 * Step 2: exchange the Shop access token for a JWT authorization grant (RFC 8693).
 */
export async function getAuthorizationGrant(params: {
  tokenEndpoint: string;
  audience: string;
  shopAccessToken: string;
  clientId: string;
  clientSecret: string;
}) {
  const res = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: params.shopAccessToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      requested_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      audience: params.audience,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });
  
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Token exchange failed: ${json.error || res.status}`);
  }
  return json.access_token; // the JWT authorization grant
}

/**
 * Step 3: discover every endpoint, then redeem the grant for a buyer-linked token (RFC 7523).
 */
export async function getBuyerLinkedToken(params: BuyerLinkedTokenParams): Promise<string> {
  const resourceServer = params.resourceServer || 'https://catalog.shopify.com';
  
  const shopify = await discoverShopifyAuthServer(resourceServer);
  const shopAuthUrl = await discoverShopAuthUrl(resourceServer);
  const { token_endpoint: shopTokenEndpoint } = await discoverShopEndpoints(shopAuthUrl);

  const assertion = await getAuthorizationGrant({
    tokenEndpoint: shopTokenEndpoint,
    audience: shopify.audience,
    shopAccessToken: params.shopAccessToken,
    clientId: params.clientId,
    clientSecret: params.clientSecret,
  });

  const res = await fetch(shopify.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      scope: params.scope || 'dev.ucp.shopping.catalog.search:read',
    }),
  });
  
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Buyer-linked token redemption failed: ${json.error || res.status}`);
  }
  return json.access_token; // buyer-linked token, valid ~60 minutes
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

export function sanitizeReturnTo(returnTo: unknown): string {
  if (typeof returnTo !== 'string') return '/'
  const trimmed = returnTo.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/'
  }
  return trimmed
}


