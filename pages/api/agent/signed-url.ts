import type { NextApiRequest, NextApiResponse } from 'next'
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '../../../lib/api-security'

interface SignedUrlResponse {
  signedUrl?: string
  authenticated?: boolean
  agentId?: string
  fallbackAgentId?: string
  isFallback?: boolean
  error?: string
  message?: string
}

export const PRIMARY_AGENT_ID = 'agent_3101m30qaxc1f3981zq05pp86ax1'
export const FALLBACK_AGENT_ID = 'agent_6301kqxr35beedj8n91eq7gz73d7'
const AGENT_ID_PATTERN = /^agent_[a-zA-Z0-9]{20,64}$/
const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

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

function getAgentId(req: NextApiRequest): string {
  const body = req.body
  const bodyAgentId =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).agentId
      : undefined
  const requestedAgentId =
    bodyAgentId ??
    req.query.agentId ??
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ??
    PRIMARY_AGENT_ID
  const bound = readBoundedString(requestedAgentId, { maxLength: 70, truncate: false })
  return bound && AGENT_ID_PATTERN.test(bound) ? bound : PRIMARY_AGENT_ID
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignedUrlResponse>
) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS
  applyCors(res, req.headers.origin, corsOptions)
  const securityRes = createSecurityResponse(res)

  if (handleOptions(req, securityRes, corsOptions)) return

  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  if (req.headers.origin && !isAllowedOrigin(origin, corsOptions)) {
    return res.status(403).json({ error: 'Origin not allowed' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rateLimit = rateLimiter.check(getClientKey(req))
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
    return res.status(429).json({ error: 'Too many requests' })
  }

  const agentId = getAgentId(req)
  const apiKey = (process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || '').trim()

  // If a secret API key is available, attempt to generate a signed WebSocket URL from ElevenLabs
  if (apiKey) {
    try {
      const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          Accept: 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data && typeof data.signed_url === 'string') {
          return res.status(200).json({
            signedUrl: data.signed_url,
            authenticated: true,
            agentId,
            fallbackAgentId: FALLBACK_AGENT_ID,
            isFallback: agentId === FALLBACK_AGENT_ID,
          })
        }
      } else {
        const errText = await response.text().catch(() => '')
        console.warn(`[ElevenLabs:SignedUrl] Upstream API returned HTTP ${response.status}: ${errText}`)
      }
    } catch (error) {
      console.warn('[ElevenLabs:SignedUrl] Exception fetching signed url:', error)
    }
  }

  // Fallback: If signed URL could not be generated (e.g. key ID without sk_ secret, or public agent),
  // return metadata guiding the client to connect via direct WebSocket or ephemeral token
  return res.status(200).json({
    authenticated: false,
    agentId,
    fallbackAgentId: FALLBACK_AGENT_ID,
    isFallback: agentId === FALLBACK_AGENT_ID,
    message: 'Proceeding with standard WebSocket or ephemeral token connection.',
  })
}
