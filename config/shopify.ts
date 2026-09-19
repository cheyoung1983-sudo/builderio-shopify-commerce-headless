const isInvalid = (val?: string) => !val || val === 'undefined' || val.includes('[SENSITIVE]')

function isPrivateToken(value?: string) {
  return typeof value === 'string' && /^(shpat_|shpua_)/i.test(value)
}

function cleanDomain(rawDomain?: string): string {
  if (!rawDomain || isInvalid(rawDomain)) return 'displaycellpros.myshopify.com'
  return rawDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

const rawDomain = isInvalid(process.env.SHOPIFY_STORE_DOMAIN)
  ? (isInvalid(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
      ? (isInvalid(process.env.SHOPIFY_DOMAIN)
          ? 'displaycellpros.myshopify.com'
          : process.env.SHOPIFY_DOMAIN)
      : process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
  : process.env.SHOPIFY_STORE_DOMAIN

const domain = cleanDomain(rawDomain)

const serverStorefrontAccessToken =
  process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
const publicStorefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN

if (isPrivateToken(publicStorefrontAccessToken)) {
  throw new Error(
    'NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN must contain a public Storefront API token, not a private Shopify token.'
  )
}

const storefrontAccessToken = isInvalid(serverStorefrontAccessToken)
  ? publicStorefrontAccessToken || ''
  : serverStorefrontAccessToken || ''

if (process.env.NODE_ENV === 'production') {
  if (isInvalid(rawDomain)) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN is required in production. Set SHOPIFY_STORE_DOMAIN or NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN.'
    )
  }

  if (!storefrontAccessToken) {
    throw new Error(
      'SHOPIFY_STOREFRONT_API_TOKEN is required in production. Set SHOPIFY_STOREFRONT_API_TOKEN or NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN.'
    )
  }
}

if (!storefrontAccessToken) {
  console.warn(
    '[config/shopify] Warning: SHOPIFY_STOREFRONT_API_TOKEN / NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN is missing or empty. Set this environment variable in Vercel to fetch catalog products.'
  )
}

const shopifyConfig = {
  domain,
  storefrontAccessToken,
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
  clientId: process.env.SHOPIFY_CLIENT_ID || '',
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
  adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
}

export default shopifyConfig
