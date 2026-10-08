import { NextResponse, type NextRequest } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Network-boundary guard for internal pages (Next.js 16 `proxy` convention,
 * formerly `middleware`). It only runs on the paths listed in `config.matcher`
 * below, so customer pages, cart/checkout, /account, repair requests, order
 * tracking, and the Builder.io visual editor are never touched.
 *
 * 1. Admin pages + the APIs they call  -> HTTP Basic Auth against
 *    ADMIN_USERNAME / ADMIN_PASSWORD. Fails closed: if either env var is
 *    unset, every request is rejected (503) instead of letting anyone in.
 * 2. Internal demo / test tools        -> 404 in production builds
 *    (NODE_ENV === 'production', i.e. Vercel preview + production and
 *    `next start`). Still available under `next dev`.
 *
 * The client-side Firebase gate in components/AdminProtectedRoute.tsx stays
 * as an inner layer on /admin, but it is not a server-side control (the page
 * HTML/JS and the admin APIs were reachable without it), hence this file.
 */

const ADMIN_PREFIXES = ['/admin', '/api/tribal/admin', '/api/config', '/api/health']

const DEMO_PREFIXES = [
  '/transcript-demo',
  '/tts',
  '/speech-to-text',
  '/models',
  '/api/tts',
  '/api/speech-to-text',
  '/api/elevenlabs',
  '/api/tribal/qa-matrix',
]

const LOCALE_PREFIX = /^\/en-US(?=\/|$)/

function normalizePath(pathname: string): string {
  const stripped = pathname.replace(LOCALE_PREFIX, '') || '/'
  return stripped.length > 1 ? stripped.replace(/\/+$/, '') : stripped
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so both buffers have equal length; compare in constant time.
  return timingSafeEqual(digest(a), digest(b))
}

function parseBasicAuth(header: string | null): { user: string; pass: string } | null {
  if (!header || !header.toLowerCase().startsWith('basic ')) return null
  try {
    const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8')
    const separator = decoded.indexOf(':')
    if (separator < 0) return null
    return { user: decoded.slice(0, separator), pass: decoded.slice(separator + 1) }
  } catch {
    return null
  }
}

const NOINDEX = 'noindex, nofollow, noarchive'

function adminGuard(request: NextRequest): NextResponse {
  const expectedUser = process.env.ADMIN_USERNAME
  const expectedPass = process.env.ADMIN_PASSWORD

  if (!expectedUser || !expectedPass) {
    return new NextResponse('Admin access is not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': NOINDEX },
    })
  }

  const credentials = parseBasicAuth(request.headers.get('authorization'))
  // Evaluate both comparisons so timing does not reveal which one failed.
  const userOk = credentials ? safeEqual(credentials.user, expectedUser) : false
  const passOk = credentials ? safeEqual(credentials.pass, expectedPass) : false

  if (!userOk || !passOk) {
    return new NextResponse('Authentication required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="DisplayCellPros Admin", charset="UTF-8"',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': NOINDEX,
      },
    })
  }

  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('X-Robots-Tag', NOINDEX)
  return response
}

export function proxy(request: NextRequest) {
  const pathname = normalizePath(request.nextUrl.pathname)

  if (matchesPrefix(pathname, ADMIN_PREFIXES)) {
    return adminGuard(request)
  }

  if (process.env.NODE_ENV === 'production' && matchesPrefix(pathname, DEMO_PREFIXES)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': NOINDEX },
    })
  }

  return NextResponse.next()
}

export const config = {
  // Keep this list in sync with ADMIN_PREFIXES / DEMO_PREFIXES above. Next.js
  // also matches the locale-prefixed form (e.g. /en-US/admin) automatically.
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/tribal/admin/:path*',
    '/api/config',
    '/api/config/:path*',
    '/api/health',
    '/api/health/:path*',
    '/transcript-demo',
    '/tts',
    '/speech-to-text',
    '/models',
    '/api/tts/:path*',
    '/api/speech-to-text/:path*',
    '/api/elevenlabs/:path*',
    '/api/tribal/qa-matrix',
  ],
}
