if (!process.env.SHOPIFY_STORE_DOMAIN) {
  console.warn('Missing environment variable SHOPIFY_STORE_DOMAIN')
}
if (!process.env.SHOPIFY_STOREFRONT_API_TOKEN) {
  console.warn(
    'Missing environment variable SHOPIFY_STOREFRONT_API_TOKEN'
  )
}

const shopifyConfig = {
  domain: process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || '',
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN || '',
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
  clientId: process.env.SHOPIFY_CLIENT_ID || '',
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
  adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
}

export default shopifyConfig
