export interface ResLike {
  getHeader(name: string): number | string | string[] | undefined
  setHeader(name: string, value: number | string | readonly string[]): unknown
}

export interface ReqLike {
  headers: Record<string, string | string[] | undefined>
}

export const COOKIE = {
  verifier: 'sca_pkce_verifier',
  state: 'sca_state',
  nonce: 'sca_nonce',
  returnTo: 'sca_return_to',
  accessToken: 'sca_access_token',
  refreshToken: 'sca_refresh_token',
  idToken: 'sca_id_token',
  expiresAt: 'sca_expires_at',
} as const

interface CookieOptions {
  maxAge?: number // seconds
  httpOnly?: boolean
  secure?: boolean
}

/**
 * Shopify requires HTTPS callback URIs, so in practice these cookies are only
 * ever set over TLS in real deployments (Vercel) or an HTTPS tunnel (ngrok)
 * used for local testing. Trust `x-forwarded-proto` in addition to NODE_ENV
 * so the Secure flag is correct behind those tunnels too.
 */
export function isHttpsRequest(req?: ReqLike): boolean {
  if (process.env.NODE_ENV === 'production') return true
  const proto = req?.headers['x-forwarded-proto']
  const value = Array.isArray(proto) ? proto[0] : proto
  return value === 'https'
}

function serialize(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax']
  if (options.httpOnly !== false) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
  }
  return parts.join('; ')
}

/** Appends a Set-Cookie header without clobbering any already queued on the response. */
export function appendCookie(res: ResLike, name: string, value: string, options?: CookieOptions) {
  const existing = res.getHeader('Set-Cookie')
  const cookie = serialize(name, value, options)
  const next = existing
    ? (Array.isArray(existing) ? existing : [String(existing)]).concat(cookie)
    : [cookie]
  res.setHeader('Set-Cookie', next)
}

export function clearCookie(res: ResLike, name: string, options?: Pick<CookieOptions, 'secure'>) {
  appendCookie(res, name, '', { maxAge: 0, secure: options?.secure })
}

export function clearPkceCookies(res: ResLike, req?: ReqLike) {
  const secure = isHttpsRequest(req)
  clearCookie(res, COOKIE.verifier, { secure })
  clearCookie(res, COOKIE.state, { secure })
  clearCookie(res, COOKIE.nonce, { secure })
  clearCookie(res, COOKIE.returnTo, { secure })
}

export function clearSessionCookies(res: ResLike, req?: ReqLike) {
  const secure = isHttpsRequest(req)
  clearCookie(res, COOKIE.accessToken, { secure })
  clearCookie(res, COOKIE.refreshToken, { secure })
  clearCookie(res, COOKIE.idToken, { secure })
  clearCookie(res, COOKIE.expiresAt, { secure })
}
