import type { NextApiRequest, NextApiResponse } from 'next'
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  readBoundedString,
} from '../../lib/api-security/index';

const allowedOrigins = ['https://displaycellpros.com', 'https://www.displaycellpros.com']
const rateLimiter = createRateLimiter({ maxRequests: 100, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = {
    allowedOrigins,
    allowLocalhost: process.env.NODE_ENV !== 'production',
  }
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) {
    return
  }

  if (!rateLimiter.check(getClientKey(req)).allowed) {
    const result = rateLimiter.check(getClientKey(req))
    res.setHeader('Retry-After', String(result.retryAfterSeconds))
    return res.status(429).json({ ok: false, error: 'Too many requests' })
  }

  if (
    req.headers.origin &&
    !corsOptions.allowedOrigins.includes(req.headers.origin) &&
    !(corsOptions.allowLocalhost && req.headers.origin.startsWith('http://localhost:'))
  ) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    let payload = req.body
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch {
        payload = { message: payload }
      }
    }

    const {
      eventId = `err_${Date.now().toString(36)}`,
      name = 'ClientError',
      message = 'Unspecified client error',
      stack,
      componentStack,
      url,
      userAgent,
      timestamp = new Date().toISOString(),
      metadata,
    } = payload || {}

    const boundedEventId = readBoundedString(eventId, { maxLength: 64 }) || `err_${Date.now().toString(36)}`
    const boundedName = readBoundedString(name, { maxLength: 64 }) || 'ClientError'
    const boundedMessage = readBoundedString(message, { maxLength: 1000 }) || 'Unspecified client error'
    const boundedStack = readBoundedString(stack, { maxLength: 5000 })
    const boundedComponentStack = readBoundedString(componentStack, { maxLength: 5000 })
    const boundedUrl = readBoundedString(url, { maxLength: 2048 })
    const boundedUserAgent = readBoundedString(userAgent, { maxLength: 512 })

    const structuredEntry = {
      timestamp,
      severity: 'ERROR',
      serviceContext: {
        service: 'displaycellpros-frontend',
      },
      eventId: boundedEventId,
      error: {
        name: boundedName,
        message: boundedMessage,
        stack: boundedStack,
        componentStack: boundedComponentStack,
      },
      httpRequest: {
        requestUrl: boundedUrl,
        userAgent: boundedUserAgent,
      },
      metadata,
    }

    console.error(`[CLIENT-ERROR-OBSERVABILITY] EventID: ${boundedEventId} | ${boundedName}: ${boundedMessage} | URL: ${boundedUrl || 'N/A'}`)
    if (boundedStack) {
      console.error(`[CLIENT-ERROR-STACK] ${boundedStack}`)
    }
    if (boundedComponentStack) {
      console.error(`[CLIENT-ERROR-COMPONENT-STACK] ${boundedComponentStack}`)
    }

    return res.status(200).json({
      ok: true,
      eventId: boundedEventId,
      loggedAt: new Date().toISOString(),
      entry: process.env.NODE_ENV !== 'production' ? structuredEntry : undefined,
    })
  } catch (err: any) {
    console.error('[CLIENT-ERROR-LOG-HANDLER-FAILED]', err)
    return res.status(500).json({
      ok: false,
      error: 'Failed to record observability log',
    })
  }
}
