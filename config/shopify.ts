if (!process.env.SHOPIFY_STORE_DOMAIN) {
  console.warn('Missing environment variable SHOPIFY_STORE_DOMAIN')
}
if (!process.env.SHOPIFY_STOREFRONT_API_TOKEN) {
  console.warn(
    'Missing environment variable SHOPIFY_STOREFRONT_API_TOKEN'
  )
}

export default {
  domain: process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'displaycellpros.myshopify.com',
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN || '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',
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
  clientId: process.env.SHOPIFY_CLIENT_ID || '',
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
  adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
}
