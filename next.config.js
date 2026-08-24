const bundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: !!process.env.BUNDLE_ANALYZE,
})

module.exports = bundleAnalyzer({
  output: 'standalone',
  images: {
    domains: [
      'res.cloudinary.com',
      'cdn.shopify.com',
      'cdn.builder.io',
      'via.placeholder.com',
    ],
  },
  env: {
    // expose env to the browser
    SHOPIFY_STOREFRONT_API_TOKEN: process.env.SHOPIFY_STOREFRONT_API_TOKEN,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    BUILDER_PUBLIC_KEY: process.env.BUILDER_PUBLIC_KEY,
    IS_DEMO: process.env.IS_DEMO,
  },
  i18n: {
    // These are all the locales you want to support in
    // your application
    locales: ['en-US'],
    // This is the default locale you want to be used when visiting
    // a non-locale prefixed path e.g. `/hello`
    defaultLocale: 'en-US',
  },
})
