const isInvalid = (val?: string) => !val || val === 'undefined' || val.includes('[SENSITIVE]')

function isPrivateToken(value?: string) {
  return typeof value === 'string' && /^(shpat_|shpua_)/i.test(value)
}

function cleanDomain(rawDomain?: string): string {
  if (!rawDomain || isInvalid(rawDomain)) return 'displaycellpros.myshopify.com'
  return rawDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

export interface ShopifyConfig {
  domain: string
  storefrontAccessToken: string
  apiVersion: string
  clientId: string
  clientSecret: string
  adminAccessToken: string
}

export function getShopifyDomain(): string {
  const rawDomain = isInvalid(process.env.SHOPIFY_STORE_DOMAIN)
    ? (isInvalid(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
        ? (isInvalid(process.env.SHOPIFY_DOMAIN)
            ? 'displaycellpros.myshopify.com'
            : process.env.SHOPIFY_DOMAIN)
        : process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
    : process.env.SHOPIFY_STORE_DOMAIN
  return cleanDomain(rawDomain)
}

export function getShopifyApiVersion(): string {
  return process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07'
}

export function getStorefrontAccessToken(): string {
  const serverToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
  const publicToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN
  
  const token = isInvalid(serverToken) ? publicToken : serverToken
  return (token || '').trim()
}

export function getAdminAccessToken(): string {
  return (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim()
}

export function getShopifyClientId(): string {
  return (process.env.SHOPIFY_CLIENT_ID || '').trim()
}

export function getShopifyClientSecret(): string {
  return (process.env.SHOPIFY_CLIENT_SECRET || '').trim()
}

// Safety check for private tokens in public variables
if (typeof window === 'undefined') {
  const publicStorefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN
  if (isPrivateToken(publicStorefrontAccessToken)) {
    console.warn(
      '[config/shopify] Security Warning: NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN looks like a private token (shpat_/shpua_). Use a public Storefront API token for browser access to avoid credential leakage.'
    )
  }

  if (!getStorefrontAccessToken()) {
    console.warn(
      '[config/shopify] Warning: Shopify Storefront access token is missing. Set SHOPIFY_STOREFRONT_API_TOKEN or NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN.'
    )
  }
}

const shopifyConfig: ShopifyConfig = {
  domain: getShopifyDomain(),
  storefrontAccessToken: getStorefrontAccessToken(),
  apiVersion: getShopifyApiVersion(),
  clientId: getShopifyClientId(),
  clientSecret: getShopifyClientSecret(),
  adminAccessToken: getAdminAccessToken(),
}

export default shopifyConfig
