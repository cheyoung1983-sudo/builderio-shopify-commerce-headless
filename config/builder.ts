if (!process.env.BUILDER_PUBLIC_KEY) {
  console.warn('BUILDER_PUBLIC_KEY environment variable is missing or empty')
}

const builderConfig = {
  apiKey: process.env.BUILDER_PUBLIC_KEY || '',
  productsModel: 'shopify-product',
  collectionsModel: 'shopify-collection',
}

export default builderConfig
