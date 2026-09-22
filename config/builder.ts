function getBuilderConfig() {
  const apiKey =
    process.env.BUILDER_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY ||
    ''

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[config/builder] BUILDER_PUBLIC_KEY or NEXT_PUBLIC_BUILDER_PUBLIC_KEY is not set in environment. Builder.io CMS content will be disabled.'
      )
    } else {
      console.warn('[config/builder] BUILDER_PUBLIC_KEY environment variable is missing or empty.')
    }
  }

  return apiKey
}

const builderConfig = {
  apiKey: getBuilderConfig(),
  productsModel: 'shopify-product',
  collectionsModel: 'shopify-collection',
  announcementModel: process.env.NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL || '',
  cartUpsellModel: process.env.NEXT_PUBLIC_BUILDER_CART_UPSELL_MODEL || '',
  themeModel: process.env.NEXT_PUBLIC_BUILDER_THEME_MODEL || '',
}

export default builderConfig
