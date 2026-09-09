const nextConfig = {
  output: 'standalone',
  // Next.js 16 uses Turbopack by default; only opt into webpack (via
  // @next/bundle-analyzer below) when explicitly analyzing the bundle.
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'cdn.builder.io' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
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
    SHOPIFY_STOREFRONT_API_TOKEN: process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
    NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN || process.env.SHOPIFY_STOREFRONT_API_TOKEN,
    NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_VERSION: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
    SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID,
    BUILDER_PUBLIC_KEY: process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || 'bed07101c7fe4afb99fcb18ed5eaf58d',
    NEXT_PUBLIC_BUILDER_PUBLIC_KEY: process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || process.env.BUILDER_PUBLIC_KEY || 'bed07101c7fe4afb99fcb18ed5eaf58d',
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
}

module.exports = process.env.BUNDLE_ANALYZE
  ? require('@next/bundle-analyzer')({ enabled: true })(nextConfig)
  : nextConfig
