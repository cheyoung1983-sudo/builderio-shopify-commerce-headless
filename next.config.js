const nextConfig = {
  // Note: no `output: 'standalone'` here — that's for self-hosting
  // (e.g. Docker) and conflicts with Vercel's own build/output tracing,
  // which handles serverless packaging automatically.
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
            value: [
              'frame-ancestors https://*.builder.io https://builder.io http://localhost:1234',
              // connect-src: covers client-side fetches — Builder.io content API
              // (builder.get() calls from the browser, e.g. Navbar's announcement
              // bar), the shopify-buy SDK talking to the Storefront API directly
              // from the browser, and the Vercel Toolbar/Live feedback widget on
              // preview deployments (fixes the sw.js/geist.woff2 console noise).
              // ws://localhost:* is for next dev's Fast Refresh websocket.
              "connect-src 'self' https://cdn.builder.io https://builder.io https://*.builder.io https://*.myshopify.com https://vercel.live wss://*.pusher.com https://vitals.vercel-insights.com ws://localhost:*",
              // img-src: mirrors the remotePatterns allowed by next/image above.
              "img-src 'self' data: https://cdn.shopify.com https://cdn.builder.io https://res.cloudinary.com https://via.placeholder.com https://vercel.live",
              "font-src 'self' data: https://vercel.live",
            ].join('; '),
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
