const apiKey =
  process.env.BUILDER_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_BUILDER_API_KEY ||
  'bed07101c7fe4afb99fcb18ed5eaf58d'

if (!apiKey) {
  console.warn('Missing env variable BUILDER_PUBLIC_KEY')
}

export default {
  apiKey,
  productsModel: 'shopify-product',
  collectionsModel: 'shopify-collection',
}
