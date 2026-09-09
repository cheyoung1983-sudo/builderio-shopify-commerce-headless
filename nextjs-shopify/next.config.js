const bundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: !!process.env.BUNDLE_ANALYZE,
})

module.exports = bundleAnalyzer({
  images: {
    domains: [
      'res.cloudinary.com',
      'cdn.shopify.com',
      'cdn.builder.io',
      'via.placeholder.com',
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              'frame-ancestors https://*.builder.io https://builder.io http://localhost:1234',
          },
        ],
      },
    ]
  },
  env: {
    // expose env to the browser
    SHOPIFY_STOREFRONT_API_TOKEN: process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN || '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',
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'displaycellpros.myshopify.com',
    NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN || process.env.SHOPIFY_STOREFRONT_API_TOKEN || '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',
    NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN || 'displaycellpros.myshopify.com',
    BUILDER_PUBLIC_KEY: process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_API_KEY || 'bed07101c7fe4afb99fcb18ed5eaf58d',
    NEXT_PUBLIC_BUILDER_PUBLIC_KEY: process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_API_KEY || 'bed07101c7fe4afb99fcb18ed5eaf58d',
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
