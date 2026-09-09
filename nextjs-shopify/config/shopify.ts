const domain =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
  'displaycellpros.myshopify.com'

const storefrontAccessToken =
  process.env.SHOPIFY_STOREFRONT_API_TOKEN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN ||
  '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'

export default {
  domain,
  storefrontAccessToken,
}
