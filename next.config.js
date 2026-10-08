const nextConfig = {
  // Next.js 16 uses Turbopack by default; only opt into webpack (via
  // @next/bundle-analyzer below) when explicitly analyzing the bundle.
  // `root` is pinned to this project so Turbopack's workspace-root
  // inference doesn't get confused by an unrelated lockfile in a parent
  // directory (e.g. a stray package-lock.json in the user's home dir).
  turbopack: { root: __dirname },
  // Bundle sanitize-html (and its ESM-only htmlparser2@12 dependency) into
  // the server chunks instead of loading them with a runtime require().
  // Left external, the Vercel serverless runtime throws ERR_REQUIRE_ESM when
  // sanitize-html's CommonJS entry require()s htmlparser2, which crashed
  // every server-rendered route (lib/sanitize-html.ts is imported by
  // ProductDetail/QuickViewDrawer/PredictiveSearch, i.e. the shared layout).
  transpilePackages: ['sanitize-html', 'htmlparser2'],
  allowedDevOrigins: [
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
              // This is the ONLY place the CSP is defined. vercel.json used to
              // set a second, stricter Content-Security-Policy header that
              // silently overrode this one in production (it blocked the
              // ElevenLabs voice agent's websocket). Keep it here.
              //
              // frame-ancestors * lets the Builder.io visual editor iframe the
              // site (X-Frame-Options can't express an origin allowlist).
              'frame-ancestors *',
              // Fallback for anything without its own directive below.
              "default-src 'self'",
              // script-src: no 'unsafe-inline' (the app ships no inline
              // executable scripts; __NEXT_DATA__ and JSON-LD are data blocks)
              // and no 'unsafe-eval' outside `next dev`.
              //  - cdn.builder.io / builder.io / *.builder.io: Builder.io
              //    visual-editor bridge.
              //  - vercel.live: Vercel Toolbar on preview deployments.
              //  - www.googletagmanager.com: GTM / gtag.js (GA4) loader.
              //  - blob: + the pinned jsdelivr path: AudioWorklet modules used
              //    by @elevenlabs/client. It falls back to blob: worklets when
              //    /rawAudioProcessor.js isn't reachable, and loads the
              //    libsamplerate worklet from jsdelivr on browsers without
              //    getUserMedia sampleRate support (e.g. Firefox).
              //  - apis.google.com: gapi loader Firebase Auth uses for
              //    signInWithPopup (tribal eligibility checker / account).
              `script-src 'self' blob: https://cdn.builder.io https://builder.io https://*.builder.io https://vercel.live https://www.googletagmanager.com https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/ https://apis.google.com${
                process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
              }`,
              // AudioWorklet / Web Worker processors created from blob: URLs.
              "worker-src 'self' blob:",
              // 'unsafe-inline' is required by Emotion/theme-ui (CSS-in-JS
              // injects <style> tags at runtime). Inline styles can't run JS.
              "style-src 'self' 'unsafe-inline'",
              // <object>/<embed> are never used.
              "object-src 'none'",
              // Stops an injected <base href> from re-pointing relative URLs.
              "base-uri 'self'",
              // Vercel Toolbar iframe (previews), GTM's iframe/preview mode, and
              // the Firebase Auth helper iframe on the project's auth domain.
              "frame-src 'self' https://vercel.live https://www.googletagmanager.com https://dcpllcrev4.firebaseapp.com",
              // connect-src: browser-side fetch/XHR/WebSocket targets.
              //  - Builder.io content API; Shopify Storefront API (shopify-buy).
              //  - ElevenLabs voice agent: REST + websocket on api.elevenlabs.io,
              //    WebRTC signalling on livekit.rtc.elevenlabs.io (the client's
              //    default, non-residency hosts).
              //  - GA4 collection endpoints + GTM.
              //  - us-atlas map data for the order-tracking map overlay.
              //  - Vercel Toolbar (previews) and Speed Insights.
              //  - 'self' also covers same-origin wss:// (/api/agent/ws-proxy).
              [
                "connect-src 'self'",
                'https://cdn.builder.io https://builder.io https://*.builder.io',
                'https://*.myshopify.com',
                'https://api.elevenlabs.io wss://api.elevenlabs.io',
                'https://livekit.rtc.elevenlabs.io wss://livekit.rtc.elevenlabs.io',
                'https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://region1.analytics.google.com',
                'https://cdn.jsdelivr.net/npm/us-atlas@3/',
                // Firebase (firebase-applet-config.json): Firestore for the
                // mail-in repair form / repair tracker / tribal checker, and
                // Firebase Auth (Google sign-in) token endpoints + auth domain.
                'https://firestore.googleapis.com',
                'https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://dcpllcrev4.firebaseapp.com',
                'https://vercel.live https://*.vercel.live wss://*.pusher.com https://vitals.vercel-insights.com',
                process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : '',
              ]
                .filter(Boolean)
                .join(' '),
              // img-src: mirrors next/image remotePatterns + GA4/GTM pixels, Unsplash
              // images on /services-faq, and the cleardot.gif connectivity probe
              // Firestore's WebChannel transport loads.
              "img-src 'self' data: blob: https://cdn.shopify.com https://cdn.builder.io https://res.cloudinary.com https://images.unsplash.com https://www.google.com/images/cleardot.gif https://vercel.live https://vercel.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com",
              // <audio> players use data: (base64 TTS) and blob: URLs.
              "media-src 'self' data: blob:",
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
            value: 'camera=(), microphone=(self), geolocation=(), usb=(), payment=()',
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
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://www.displaycellpros.com',
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
