function getBuilderConfig() {
  const apiKey =
    process.env.BUILDER_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY ||
    ''

  if (!apiKey && process.env.NODE_ENV === 'production') {
    throw new Error(
      'BUILDER_PUBLIC_KEY or NEXT_PUBLIC_BUILDER_PUBLIC_KEY is required in production.'
    )
  }

  if (!apiKey) {
    console.warn('[config/builder] BUILDER_PUBLIC_KEY environment variable is missing or empty.')
  }

  return apiKey
}

const builderConfig = {
  apiKey: getBuilderConfig(),
  productsModel: 'shopify-product',
  collectionsModel: 'shopify-collection',
  announcementModel: process.env.NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL || '',
}

export default builderConfig
