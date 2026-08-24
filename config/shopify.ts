if (!process.env.SHOPIFY_STORE_DOMAIN) {
  console.warn('Missing environment variable SHOPIFY_STORE_DOMAIN')
}
if (!process.env.SHOPIFY_STOREFRONT_API_TOKEN) {
  console.warn(
    'Missing environment variable SHOPIFY_STOREFRONT_API_TOKEN'
  )
}

export default {
  domain: process.env.SHOPIFY_STORE_DOMAIN || '',
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_API_TOKEN || '',
}
