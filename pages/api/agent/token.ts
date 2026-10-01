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
  fallbackAgentId?: string
  isFallback?: boolean
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

  // Security: Reject client-supplied API keys in request headers
  if (req.headers['xi-api-key'] || req.headers['x-api-key']) {
    return res.status(400).json({
      error: 'Client-provided API keys in request headers are strictly forbidden. API keys are handled server-side only.',
    })
  }

  // Retrieve API Key: Server-side environment variables ONLY
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

  const FALLBACK_AGENT_ID = 'agent_6301kqxr35beedj8n91eq7gz73d7'

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
      fallbackAgentId: FALLBACK_AGENT_ID,
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
      ],
    })
  } catch (error) {
    // If primary agent fails and isn't already the fallback agent, attempt token with fallback agent
    if (agentId !== FALLBACK_AGENT_ID) {
      try {
        console.warn(`[ElevenLabsTokenAPI:Fallback] Retrying token acquisition with fallback agent ${FALLBACK_AGENT_ID}...`)
        const fallbackResult = await acquireElevenLabsTokenWithBackoff({
          agentId: FALLBACK_AGENT_ID,
          apiKey,
          maxRetries: 2,
          initialDelayMs: 400,
          maxDelayMs: 2000,
          backoffFactor: 2,
        })

        return res.status(200).json({
          token: fallbackResult.token,
          conversation_id: fallbackResult.conversationId,
          agentId: FALLBACK_AGENT_ID,
          fallbackAgentId: FALLBACK_AGENT_ID,
          isFallback: true,
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
          ],
        })
      } catch (fallbackError) {
        console.error(`[ElevenLabsTokenAPI:FallbackError] Fallback token acquisition also failed:`, fallbackError)
      }
    }

    if (error instanceof ElevenLabsTokenError) {
      const { status, responseBody, category, isRetryable, agentId: errAgentId } = error.details
      console.error(`[ElevenLabsTokenAPI:Error] Failed acquiring signed URL token from ElevenLabs API:`, {
        status,
        category,
        isRetryable,
        agentId: errAgentId,
        responseBody,
        message: (error as Error).message,
      })
      const sanitizedMessage = String((error as Error).message || '')
        .replace(/sk_[a-zA-Z0-9_\-]+/g, '[REDACTED]')
        .replace(/secret_[a-zA-Z0-9_\-]+/g, '[REDACTED]')
      return res.status(status).json({
        error: `ElevenLabs API error: ${status}`,
        details: sanitizedMessage,
        category,
        agentId: errAgentId,
      })
    }
    return res.status(502).json({
      error: 'Failed to fetch conversation token from voice platform',
    })
  }
}
