const isInvalid = (val?: string) => !val || val === 'undefined' || val.includes('[SENSITIVE]')

const domain = isInvalid(process.env.SHOPIFY_STORE_DOMAIN)
  ? (isInvalid(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) ? 'displaycellpros.myshopify.com' : process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
  : process.env.SHOPIFY_STORE_DOMAIN

const storefrontAccessToken = isInvalid(process.env.SHOPIFY_STOREFRONT_API_TOKEN)
  ? (isInvalid(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN) ? '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' : process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN)
  : process.env.SHOPIFY_STOREFRONT_API_TOKEN

const shopifyConfig = {
  domain: domain || 'displaycellpros.myshopify.com',
  storefrontAccessToken: storefrontAccessToken || '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',
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
  clientId: process.env.SHOPIFY_CLIENT_ID || '',
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
  adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
}

export default shopifyConfig
