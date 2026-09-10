function assertBuilderConfig() {
  const apiKey = process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || ''

  if (process.env.NODE_ENV === 'production' && !apiKey) {
    throw new Error(
      'BUILDER_PUBLIC_KEY is required in production. Set BUILDER_PUBLIC_KEY or NEXT_PUBLIC_BUILDER_PUBLIC_KEY.'
    )
  }

  if (!apiKey) {
    console.warn('BUILDER_PUBLIC_KEY environment variable is missing or empty')
  }

  return apiKey
}

const builderConfig = {
  apiKey: assertBuilderConfig(),
  productsModel: 'shopify-product',
  collectionsModel: 'shopify-collection',
}

export default builderConfig
