import type { NextApiRequest, NextApiResponse } from 'next'
import {
  acquireElevenLabsTokenWithBackoff,
  ElevenLabsTokenError,
} from '@lib/elevenlabs-token'
import {
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
} from '../../../lib/api-security'

interface TokenResponse {
  token?: string
  conversation_id?: string
  agentId?: string
  iceServers?: Array<{ urls: string | string[] }>
  error?: string
}

const ALLOWED_ORIGINS = [
  'https://displaycellpros.com',
  'https://www.displaycellpros.com',
]
const DEFAULT_AGENT_ID = 'agent_3101m30qaxc1f3981zq05pp86ax1'
const AGENT_ID_PATTERN = /^agent_[a-zA-Z0-9]{20,64}$/
const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  return req.socket.remoteAddress || 'unknown'
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

function getAgentId(req: NextApiRequest): string | undefined {
  const body = req.body
  const bodyAgentId =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).agentId
      : undefined
  const requestedAgentId = bodyAgentId ?? req.query.agentId ?? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? DEFAULT_AGENT_ID
  return readBoundedString(requestedAgentId, { maxLength: 70, truncate: false })
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse>
) {
  const corsOptions = {
    allowedOrigins: ALLOWED_ORIGINS,
    allowLocalhost: process.env.NODE_ENV === 'development',
  }
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
  if (!agentId || !AGENT_ID_PATTERN.test(agentId)) {
    return res.status(400).json({ error: 'Invalid agent ID' })
  }

  try {
    const result = await acquireElevenLabsTokenWithBackoff({
      agentId,
      apiKey: process.env.ELEVENLABS_API_KEY,
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 3000,
      backoffFactor: 2,
    })

    return res.status(200).json({
      token: result.token,
      conversation_id: result.conversationId,
      agentId,
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
      ],
    })
  } catch (error) {
    if (error instanceof ElevenLabsTokenError) {
      console.error('[ElevenLabsTokenAPI] Upstream token request failed:', error.details.status)
    } else {
      console.error('[ElevenLabsTokenAPI] Unexpected server error acquiring token:', error)
    }
    return res.status(502).json({
      error: 'Failed to fetch conversation token from voice platform',
    })
  }
}
