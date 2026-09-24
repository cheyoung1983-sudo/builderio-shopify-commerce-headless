import type { NextApiRequest, NextApiResponse } from 'next'
import {
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
} from '../../../lib/api-security'

interface SignedUrlResponse {
  signedUrl?: string
  authenticated?: boolean
  agentId?: string
  error?: string
  message?: string
}

const allowedOrigins = [
  'https://displaycellpros.com',
  'https://www.displaycellpros.com',
]
const DEFAULT_AGENT_ID = 'agent_3101m30qaxc1f3981zq05pp86ax1'
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
  res: NextApiResponse<SignedUrlResponse>
) {
  const corsOptions = {
    allowedOrigins,
    allowLocalhost: process.env.NODE_ENV !== 'production',
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

  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim()
  if (!apiKey || !apiKey.startsWith('sk_')) {
    return res.status(200).json({
      authenticated: false,
      agentId,
      message:
        'No valid ElevenLabs secret key (sk_*) found. Public agent access with ephemeral conversation tokens should be used.',
    })
  }

  try {
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`[ElevenLabs:SignedUrl] Upstream API returned HTTP ${response.status}`)
      return res.status(502).json({
        authenticated: false,
        agentId,
        error: 'Failed to generate signed URL',
      })
    }

    const data = await response.json()
    return res.status(200).json({
      signedUrl: data.signed_url,
      authenticated: true,
      agentId,
    })
  } catch (error) {
    console.error('[ElevenLabs:SignedUrl] Exception fetching signed url:', error)
    return res.status(502).json({
      authenticated: false,
      agentId,
      error: 'Failed to generate signed URL',
    })
  }
}
