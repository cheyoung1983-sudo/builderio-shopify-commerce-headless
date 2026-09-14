const isInvalid = (val?: string) => !val || val === 'undefined' || val.includes('[SENSITIVE]')

function isPrivateToken(value?: string) {
  return typeof value === 'string' && /^(shpat_|shpua_)/i.test(value)
}

function assertProductionShopifyConfig(domainValue?: string, tokenValue?: string) {
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'

  if (process.env.NODE_ENV === 'production' && !isProductionBuild) {
    if (isInvalid(domainValue)) {
      throw new Error(
        'SHOPIFY_STORE_DOMAIN is required in production. Set SHOPIFY_STORE_DOMAIN or NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN.'
      )
    }

    if (isInvalid(tokenValue)) {
      throw new Error(
        'SHOPIFY_STOREFRONT_API_TOKEN is required in production. Set SHOPIFY_STOREFRONT_API_TOKEN or NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN.'
      )
    }
  }
}

const domain = isInvalid(process.env.SHOPIFY_STORE_DOMAIN)
  ? (isInvalid(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
      ? (process.env.NODE_ENV === 'production' ? '' : 'displaycellpros.myshopify.com')
      : process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
  : process.env.SHOPIFY_STORE_DOMAIN

const serverStorefrontAccessToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN
const publicStorefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN

if (isPrivateToken(publicStorefrontAccessToken)) {
  throw new Error(
    'NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN must contain a public Storefront API token, not a private Shopify token.'
  )
}

const storefrontAccessToken = isInvalid(serverStorefrontAccessToken)
  ? publicStorefrontAccessToken || ''
  : serverStorefrontAccessToken

assertProductionShopifyConfig(domain, storefrontAccessToken)

if (!storefrontAccessToken && process.env.NODE_ENV !== 'production') {
  console.warn(
    'SHOPIFY_STOREFRONT_API_TOKEN environment variable is missing or empty. Set SHOPIFY_STOREFRONT_API_TOKEN for server-side requests or NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN for browser-side requests.'
  )
}

const shopifyConfig = {
  domain: domain || 'displaycellpros.myshopify.com',
  storefrontAccessToken: storefrontAccessToken || '',
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
  clientId: process.env.SHOPIFY_CLIENT_ID || '',
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
  adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
}

export default shopifyConfig
