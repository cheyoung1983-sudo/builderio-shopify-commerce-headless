const nextConfig = {
  // Next.js 16 uses Turbopack by default; only opt into webpack (via
  // @next/bundle-analyzer below) when explicitly analyzing the bundle.
  // `root` is pinned to this project so Turbopack's workspace-root
  // inference doesn't get confused by an unrelated lockfile in a parent
  // directory (e.g. a stray package-lock.json in the user's home dir).
  turbopack: { root: __dirname },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 24, 32, 40, 48, 64, 80, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
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
              'frame-ancestors *',
              // connect-src: covers client-side fetches — Builder.io content API
              // (builder.get() calls from the browser, e.g. Navbar's announcement
              // bar), the shopify-buy SDK talking to the Storefront API directly
              // from the browser, and the Vercel Toolbar/Live feedback widget on
              // preview deployments (fixes the sw.js/geist.woff2 console noise).
              // ws://localhost:* is for next dev's Fast Refresh websocket.
              "connect-src 'self' https://cdn.builder.io https://builder.io https://*.builder.io https://*.myshopify.com https://vercel.live wss://*.pusher.com https://vitals.vercel-insights.com ws://localhost:* https://*.run.app https://ai.studio",
              // img-src: mirrors the remotePatterns allowed by next/image above.
              "img-src 'self' data: https://cdn.shopify.com https://cdn.builder.io https://res.cloudinary.com https://via.placeholder.com https://vercel.live",
              "font-src 'self' data: https://vercel.live",
            ].join('; '),
          },
          // X-Frame-Options is intentionally omitted: it can't express "allow
          // these specific origins" (only DENY/SAMEORIGIN), which would break
          // the Builder.io visual editor's iframe embed. frame-ancestors above
          // is the modern replacement and takes precedence in browsers that
          // support both.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), usb=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
    ]
  },
  env: {
    // Only explicitly public values are exposed to browser bundles.
    NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN,
    NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_VERSION: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
    NEXT_PUBLIC_BUILDER_PUBLIC_KEY: process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || process.env.BUILDER_PUBLIC_KEY,
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
