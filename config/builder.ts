const apiKey =
  process.env.BUILDER_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_BUILDER_API_KEY ||
  'bed07101c7fe4afb99fcb18ed5eaf58d'

if (!apiKey) {
  console.warn('BUILDER_PUBLIC_KEY environment variable is missing or empty')
}

const builderConfig = {
  apiKey,
  productsModel: 'shopify-product',
  collectionsModel: 'shopify-collection',
}

export default builderConfig
