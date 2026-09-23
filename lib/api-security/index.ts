export interface ApiSecurityOriginOptions {
  allowedOrigins?: readonly string[]
  allowLocalhost?: boolean
  allowRunApp?: boolean
}

export interface CorsOptions extends ApiSecurityOriginOptions {
  allowedMethods?: readonly string[]
  allowedHeaders?: readonly string[]
  credentials?: boolean
}

export interface ApiResponse {
  setHeader(name: string, value: string): void
  getHeader?(name: string): string | string[] | undefined
  statusCode?: number
  end?(chunk?: unknown): void
}

export interface ApiRequest {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

export interface BoundedStringOptions {
  maxLength?: number
  minLength?: number
  trim?: boolean
  truncate?: boolean
}

export interface BoundedIntegerOptions {
  min?: number
  max?: number
  minimum?: number
  maximum?: number
}

export interface RateLimiterOptions {
  maxRequests?: number
  limit?: number
  max?: number
  windowMs?: number
  windowSeconds?: number
  now?: () => number
  clock?: () => number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

interface RateLimitBucket {
  count: number
  resetAt: number
}

const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS']
const DEFAULT_ALLOWED_HEADERS = ['Content-Type', 'Authorization']
const DEFAULT_STRING_MAX_LENGTH = 256
const DEFAULT_RATE_LIMIT = 60
const DEFAULT_RATE_WINDOW_MS = 60_000

function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value || value.includes(',')) return undefined

  try {
    const url = new URL(value)
    if (
      !url.protocol ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return undefined
    }

    return url.origin
  } catch {
    return undefined
  }
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '[::1]')
    )
  } catch {
    return false
  }
}

function isRunAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'https:' &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.run\.app$/.test(url.hostname)
    )
  } catch {
    return false
  }
}

export function isAllowedOrigin(
  origin: string | undefined,
  options: ApiSecurityOriginOptions = {}
): boolean {
  const normalizedOrigin = normalizeOrigin(origin)
  if (!normalizedOrigin) return false

  const configuredOrigins = (options.allowedOrigins ?? [])
    .map((configuredOrigin) => normalizeOrigin(configuredOrigin))
    .filter((configuredOrigin): configuredOrigin is string => Boolean(configuredOrigin))

  if (configuredOrigins.includes(normalizedOrigin)) return true
  if (options.allowLocalhost && isLocalhostOrigin(normalizedOrigin)) return true
  if (options.allowRunApp && isRunAppOrigin(normalizedOrigin)) return true
  return false
}

function getHeader(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  const normalizedName = name.toLowerCase()
  const value =
    headers?.[normalizedName] ??
    Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === normalizedName)?.[1]
  if (Array.isArray(value)) return value[0]
  return value
}

function headerValue(values: readonly string[] | undefined, fallback: readonly string[]): string {
  return (values ?? fallback).join(', ')
}

export function applyCors(
  res: ApiResponse,
  origin: string | undefined,
  options: CorsOptions
): void {
  const allowed = isAllowedOrigin(origin, options)
  res.setHeader(
    'Access-Control-Allow-Methods',
    headerValue(options.allowedMethods, DEFAULT_ALLOWED_METHODS)
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    headerValue(options.allowedHeaders, DEFAULT_ALLOWED_HEADERS)
  )

  if (!allowed) return

  const normalizedOrigin = normalizeOrigin(origin)
  if (!normalizedOrigin) return

  res.setHeader('Access-Control-Allow-Origin', normalizedOrigin)
  const existingVary = res.getHeader?.('Vary')
  const vary = Array.isArray(existingVary)
    ? existingVary.join(', ')
    : existingVary
  if (!vary || !vary.split(',').some((value) => value.trim().toLowerCase() === 'origin')) {
    res.setHeader('Vary', vary ? `${vary}, Origin` : 'Origin')
  }
  if (options.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
}

export function handleOptions(
  req: ApiRequest,
  res: ApiResponse,
  options: CorsOptions
): boolean {
  const origin = getHeader(req.headers, 'origin')
  applyCors(res, origin, options)
  if (req.method?.toUpperCase() !== 'OPTIONS') return false

  if (!isAllowedOrigin(origin, options)) {
    res.statusCode = 403
    res.end?.()
    return true
  }

  const requestedMethod = getHeader(req.headers, 'access-control-request-method')
  const allowedMethods = (options.allowedMethods ?? DEFAULT_ALLOWED_METHODS).map((method) =>
    method.toUpperCase()
  )
  if (requestedMethod && !allowedMethods.includes(requestedMethod.toUpperCase())) {
    res.statusCode = 405
    res.end?.()
    return true
  }

  res.statusCode = 204
  res.end?.()
  return true
}

export function readBoundedString(
  value: unknown,
  options: BoundedStringOptions = {}
): string | undefined {
  if (typeof value !== 'string') return undefined

  const trim = options.trim ?? true
  const normalized = trim ? value.trim() : value
  const maxLength =
    Number.isInteger(options.maxLength) && (options.maxLength as number) > 0
      ? (options.maxLength as number)
      : DEFAULT_STRING_MAX_LENGTH
  if (normalized.length > maxLength && options.truncate === false) return undefined
  const bounded =
    normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized
  const minLength = options.minLength ?? 0

  if (bounded.length < minLength) return undefined
  return bounded
}

export function readBoundedInteger(
  value: unknown,
  options: BoundedIntegerOptions = {}
): number | undefined {
  let parsed: number
  if (typeof value === 'number') {
    parsed = value
  } else if (typeof value === 'string' && /^[+-]?\d+$/.test(value.trim())) {
    parsed = Number(value)
  } else {
    return undefined
  }

  if (!Number.isSafeInteger(parsed)) return undefined
  const min = options.min ?? options.minimum
  const max = options.max ?? options.maximum
  if (min !== undefined && parsed < min) return undefined
  if (max !== undefined && parsed > max) return undefined
  return parsed
}

export function createRateLimiter(options: RateLimiterOptions = {}): {
  check(key: string): RateLimitResult
} {
  const configuredLimit =
    options.maxRequests ?? options.limit ?? options.max ?? DEFAULT_RATE_LIMIT
  const maxRequests =
    Number.isInteger(configuredLimit) && configuredLimit > 0
      ? configuredLimit
      : DEFAULT_RATE_LIMIT
  const configuredWindowMs =
    options.windowMs ??
    (options.windowSeconds === undefined
      ? DEFAULT_RATE_WINDOW_MS
      : options.windowSeconds * 1000)
  const windowMs =
    Number.isFinite(configuredWindowMs) && configuredWindowMs > 0
      ? configuredWindowMs
      : DEFAULT_RATE_WINDOW_MS
  const now = options.now ?? options.clock ?? (() => Date.now())
  const buckets = new Map<string, RateLimitBucket>()

  return {
    check(key: string): RateLimitResult {
      const timestamp = now()
      const current = buckets.get(key)
      if (!current || timestamp >= current.resetAt) {
        buckets.set(key, { count: 1, resetAt: timestamp + windowMs })
        return { allowed: true, retryAfterSeconds: 0 }
      }

      if (current.count < maxRequests) {
        current.count += 1
        return { allowed: true, retryAfterSeconds: 0 }
      }

      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - timestamp) / 1000)),
      }
    },
  }
}
