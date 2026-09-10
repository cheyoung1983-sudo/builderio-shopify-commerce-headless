const isInvalid = (val?: string) => !val || val === 'undefined' || val.includes('[SENSITIVE]')

function assertProductionShopifyConfig(domainValue?: string, tokenValue?: string) {
  if (process.env.NODE_ENV === 'production') {
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

const storefrontAccessToken = isInvalid(process.env.SHOPIFY_STOREFRONT_API_TOKEN)
  ? (isInvalid(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN)
      ? (process.env.NODE_ENV === 'production' ? '' : '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')
      : process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN)
  : process.env.SHOPIFY_STOREFRONT_API_TOKEN

assertProductionShopifyConfig(domain, storefrontAccessToken)

const shopifyConfig = {
  domain: domain || 'displaycellpros.myshopify.com',
  storefrontAccessToken: storefrontAccessToken || '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',
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
  clientId: process.env.SHOPIFY_CLIENT_ID || '',
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
  adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
}

export default shopifyConfig
