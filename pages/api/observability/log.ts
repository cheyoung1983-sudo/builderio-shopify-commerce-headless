import type { NextApiRequest, NextApiResponse } from 'next'
import {
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
} from '../../../lib/api-security'

const ALLOWED_ORIGINS = [
  'https://displaycellpros.com',
  'https://www.displaycellpros.com',
]
const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })
const MAX_EVENT_ID = 128
const MAX_NAME = 128
const MAX_MESSAGE = 2048
const MAX_STACK = 4096
const MAX_URL = 2048
const MAX_USER_AGENT = 512
const MAX_METADATA = 4096

function createSecurityResponse(res: NextApiResponse) {
  return {
    setHeader(name: string, value: string) {
      res.setHeader(name, value)
    },
    getHeader(name: string) {
      const value = res.getHeader(name)
      return typeof value === 'number' ? String(value) : value
    },
    get statusCode() {
      return res.statusCode
    },
    set statusCode(value: number) {
      res.statusCode = value
    },
    end: res.end.bind(res),
  }
}

function boundedString(value: unknown, maxLength: number, fallback: string): string {
  return readBoundedString(value, { maxLength }) ?? fallback
}

function normalizeTimestamp(value: unknown, fallback: string): string {
  const timestamp = readBoundedString(value, { maxLength: 64, truncate: false })
  if (!timestamp || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)) {
    return fallback
  }
  const parsed = Date.parse(timestamp)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback
}

function serializeMetadata(value: unknown): string | undefined {
  if (value === undefined) return undefined
  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch {
    serialized = '[unserializable metadata]'
  }
  return readBoundedString(serialized, { maxLength: MAX_METADATA })
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = {
    allowedOrigins: ALLOWED_ORIGINS,
    allowedMethods: ['POST', 'OPTIONS'],
    allowLocalhost: process.env.NODE_ENV === 'development',
  }
  const securityRes = createSecurityResponse(res)

  if (handleOptions(req, securityRes, corsOptions)) return

  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  if (req.headers.origin && !isAllowedOrigin(origin, corsOptions)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' })
  }

  const rateLimit = rateLimiter.check(req.socket.remoteAddress || 'unknown')
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
    return res.status(429).json({ ok: false, error: 'Too many requests' })
  }

  let payload: unknown = req.body
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      payload = { message: payload }
    }
  }
  const input =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}

  const loggedAt = new Date().toISOString()
  const eventId = boundedString(input.eventId, MAX_EVENT_ID, `err_${Date.now().toString(36)}`)
  const name = boundedString(input.name, MAX_NAME, 'ClientError')
  const message = boundedString(input.message, MAX_MESSAGE, 'Unspecified client error')
  const stack = boundedString(input.stack, MAX_STACK, '')
  const componentStack = boundedString(input.componentStack, MAX_STACK, '')
  const url = boundedString(input.url, MAX_URL, '')
  const userAgent = boundedString(input.userAgent, MAX_USER_AGENT, '')
  const timestamp = normalizeTimestamp(input.timestamp, loggedAt)
  const metadata = serializeMetadata(input.metadata)

  const structuredEntry = {
    timestamp,
    severity: 'ERROR',
    serviceContext: { service: 'displaycellpros-frontend' },
    eventId,
    error: { name, message, stack, componentStack },
    httpRequest: { requestUrl: url, userAgent },
    metadata,
  }

  console.error(`[CLIENT-ERROR-OBSERVABILITY] EventID: ${eventId} | ${name}: ${message} | URL: ${url || 'N/A'}`)
  if (stack) console.error(`[CLIENT-ERROR-STACK] ${stack}`)
  if (componentStack) console.error(`[CLIENT-ERROR-COMPONENT-STACK] ${componentStack}`)

  const response: { ok: true; eventId: string; loggedAt: string; entry?: typeof structuredEntry } = {
    ok: true,
    eventId,
    loggedAt,
  }
  if (process.env.NODE_ENV !== 'production') response.entry = structuredEntry
  return res.status(200).json(response)
}
