const nextConfig = {
  // Next.js 16 uses Turbopack by default; only opt into webpack (via
  // @next/bundle-analyzer below) when explicitly analyzing the bundle.
  // `root` is pinned to this project so Turbopack's workspace-root
  // inference doesn't get confused by an unrelated lockfile in a parent
  // directory (e.g. a stray package-lock.json in the user's home dir).
  turbopack: { root: __dirname },
  allowedDevOrigins: [
    'ais-dev-jexmzfsqsgf4mbwujko5hx-367327296310.us-west2.run.app',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
  images: {
    qualities: [75, 85, 90],
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
              // default-src is the fallback for any resource type not given its
              // own directive below (e.g. worker-src, manifest-src) — this repo
              // doesn't use any of those, so 'self' is a safe backstop.
              "default-src 'self'",
              // script-src: without this, script-src falls back to default-src,
              // but a *missing* script-src previously meant NO restriction on
              // script execution at all — the CSP did nothing to contain an XSS
              // payload. 'self' covers Next.js's own bundled/hydration scripts
              // (all served from /_next/static, no inline script needed for
              // that). cdn.builder.io/builder.io/*.builder.io covers the visual
              // editor's embed bridge script; vercel.live covers the Toolbar/
              // Live feedback widget on preview deployments.
              "script-src 'self' blob: data: 'unsafe-eval' https://cdn.builder.io https://builder.io https://*.builder.io https://vercel.live",
              // worker-src: required for Web Workers and AudioWorklet processors (e.g. ElevenLabs conversational client)
              "worker-src 'self' blob: data:",
              // style-src: 'unsafe-inline' is required because this app uses
              // Emotion/theme-ui (CSS-in-JS), which injects <style> tags at
              // runtime with computed class names — there's no static nonce to
              // pin here without a much larger Emotion-cache/nonce migration.
              // This is a much smaller risk than the missing script-src above:
              // inline styles can't execute arbitrary JS.
              "style-src 'self' 'unsafe-inline'",
              // object-src 'none': blocks <object>/<embed>/<applet> entirely —
              // there's no legitimate use of any of them in this app, and they
              // were an unrestricted vector under the old policy.
              "object-src 'none'",
              // base-uri 'self': stops an injected <base href> tag from
              // silently rewriting where every relative URL on the page
              // (including script/link src) resolves to.
              "base-uri 'self'",
              // frame-src: the Vercel Live feedback widget on preview
              // deployments renders its UI in an iframe from vercel.live —
              // without this, adding default-src 'self' above would silently
              // break it (it was unrestricted before this change).
              "frame-src 'self' https://vercel.live",
              // connect-src: covers client-side fetches — Builder.io content API
              // (builder.get() calls from the browser, e.g. Navbar's announcement
              // bar), the shopify-buy SDK talking to the Storefront API directly
              // from the browser, and the Vercel Toolbar/Live feedback widget on
              // preview deployments (fixes the sw.js/geist.woff2 console noise).
              // ws://localhost:* is for next dev's Fast Refresh websocket.
              "connect-src 'self' https://cdn.builder.io https://builder.io https://*.builder.io https://*.myshopify.com https://vercel.live https://*.vercel.live wss://*.pusher.com https://vitals.vercel-insights.com ws://localhost:* https://*.run.app https://ai.studio https://api.elevenlabs.io https://*.elevenlabs.io wss://api.elevenlabs.io wss://*.elevenlabs.io https://*.rtc.elevenlabs.io wss://*.rtc.elevenlabs.io https://*.rtc.eu.residency.elevenlabs.io wss://*.rtc.eu.residency.elevenlabs.io https://*.livekit.cloud wss://*.livekit.cloud",
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
            value: 'camera=(), microphone=(self "https://ai.studio" "https://*.run.app"), geolocation=(), usb=(), payment=()',
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
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://displaycellpros.com',
    NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_VERSION: process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07',
    NEXT_PUBLIC_BUILDER_PUBLIC_KEY: process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || process.env.BUILDER_PUBLIC_KEY,
    NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL: process.env.NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL || '',
    NEXT_PUBLIC_BUILDER_CART_UPSELL_MODEL: process.env.NEXT_PUBLIC_BUILDER_CART_UPSELL_MODEL || '',
    NEXT_PUBLIC_BUILDER_THEME_MODEL: process.env.NEXT_PUBLIC_BUILDER_THEME_MODEL || '',
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
  async rewrites() {
    return [
      {
        source: '/search/suggest',
        destination: '/api/search/suggest',
      },
      {
        source: '/:locale/search/suggest',
        destination: '/api/search/suggest',
      },
    ]
  },
}

module.exports = () => {
  const withBuilderDevTools = require('@builder.io/dev-tools/next')()
  const config = process.env.BUNDLE_ANALYZE
    ? require('@next/bundle-analyzer')({ enabled: true })(nextConfig)
    : nextConfig

  return withBuilderDevTools(config)
}
