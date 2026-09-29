import type { NextApiRequest, NextApiResponse } from 'next'
import {
  acquireElevenLabsTokenWithBackoff,
  ElevenLabsTokenError,
} from '../../../lib/elevenlabs-token.ts'
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '../../../lib/api-security/index.ts'

interface TokenResponse {
  token?: string
  conversation_id?: string
  agentId?: string
  iceServers?: Array<{ urls: string | string[] }>
  error?: string
  details?: string | Record<string, unknown>
  category?: string
}

const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse>
) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS

  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) {
    return
  }

  if (!rateLimiter.check(getClientKey(req)).allowed) {
    const result = rateLimiter.check(getClientKey(req))
    res.setHeader('Retry-After', String(result.retryAfterSeconds))
    return res.status(429).json({ error: 'Too many requests' })
  }

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ error: 'Origin not allowed' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (req.headers['xi-api-key'] || req.headers['x-api-key']) {
    return res.status(400).json({
      error: 'Client-provided API keys in request headers are forbidden. Use server-side configuration.',
    })
  }

  // Retrieve API Key: Prefer process.env.ELEVENLABS_API_KEY
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY

  // Retrieve Agent ID: Check headers, body, query, or environment variables
  const headerAgentId = typeof req.headers['x-agent-id'] === 'string' ? req.headers['x-agent-id'] : undefined
  const requestedAgentId =
    headerAgentId ||
    (req.body && (req.body as any).agentId) ||
    req.query.agentId ||
    process.env.ELEVENLABS_AGENT_ID ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ||
    'agent_3101m30qaxc1f3981zq05pp86ax1'

  const agentId =
    typeof requestedAgentId === 'string'
      ? readBoundedString(requestedAgentId.trim(), { maxLength: 100 }) || 'agent_3101m30qaxc1f3981zq05pp86ax1'
      : 'agent_3101m30qaxc1f3981zq05pp86ax1'

  try {
    const result = await acquireElevenLabsTokenWithBackoff({
      agentId,
      apiKey,
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
      const { status, responseBody, category, isRetryable, agentId: errAgentId } = error.details
      let msg = (error as Error).message
      if (msg.includes('sk_')) {
        msg = 'Upstream authentication error'
      }
      return res.status(status).json({
        error: `ElevenLabs API error: ${status}`,
        details: msg,
        category,
        agentId: errAgentId,
      })
    }
    return res.status(502).json({
      error: 'Failed to fetch conversation token from voice platform',
    })
  }
}
