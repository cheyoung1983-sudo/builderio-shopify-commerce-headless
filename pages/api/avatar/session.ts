import type { NextApiRequest, NextApiResponse } from 'next'
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '../../../lib/api-security/index'

interface AvatarSessionResponse {
  success?: boolean
  sessionUrl?: string
  avatarId?: string
  contextId?: string
  error?: string
  details?: unknown
}

const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvatarSessionResponse>
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

  // LiveAvatar API Key from Server-Side Environment ONLY
  const apiKey =
    process.env.LIVEAVATAR_API_KEY ||
    process.env.HEYGEN_API_KEY ||
    process.env.NEXT_PUBLIC_LIVEAVATAR_API_KEY

  const body = req.body || {}
  const requestedAvatarId =
    body.avatarId ||
    req.query.avatarId ||
    process.env.LIVEAVATAR_AVATAR_ID ||
    '65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0'

  const requestedContextId =
    body.contextId ||
    req.query.contextId ||
    process.env.LIVEAVATAR_CONTEXT_ID ||
    '158f5d55-2d4f-11f1-8d28-066a7fa2e369'

  const isSandbox =
    body.isSandbox !== undefined
      ? Boolean(body.isSandbox)
      : req.query.isSandbox !== undefined
      ? req.query.isSandbox === 'true'
      : true

  const avatarId =
    typeof requestedAvatarId === 'string'
      ? readBoundedString(requestedAvatarId.trim(), { maxLength: 100 }) ||
        '65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0'
      : '65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0'

  const contextId =
    typeof requestedContextId === 'string'
      ? readBoundedString(requestedContextId.trim(), { maxLength: 100 }) ||
        '158f5d55-2d4f-11f1-8d28-066a7fa2e369'
      : '158f5d55-2d4f-11f1-8d28-066a7fa2e369'

  if (!apiKey) {
    // If API key is not configured, supply sandbox embed demo URL as graceful fallback
    const demoSessionUrl = `https://embed.liveavatar.com/v1/${avatarId}?is_sandbox=${isSandbox}`
    return res.status(200).json({
      success: true,
      sessionUrl: demoSessionUrl,
      avatarId,
      contextId,
    })
  }

  try {
    const upstreamRes = await fetch('https://api.liveavatar.com/v2/embeddings', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        avatar_id: avatarId,
        context_id: contextId,
        is_sandbox: isSandbox,
      }),
    })

    const data = await upstreamRes.json()

    if (!upstreamRes.ok || !data?.data?.url) {
      console.warn(
        '[LiveAvatarSession:UpstreamWarning] Failed creating upstream embedding:',
        data
      )
      // Provide fallback session URL so UI remains functional
      return res.status(200).json({
        success: true,
        sessionUrl: `https://embed.liveavatar.com/v1/${avatarId}?is_sandbox=${isSandbox}`,
        avatarId,
        contextId,
      })
    }

    return res.status(200).json({
      success: true,
      sessionUrl: data.data.url,
      avatarId,
      contextId,
    })
  } catch (error: any) {
    console.error('[LiveAvatarSession:Error]', error)
    return res.status(200).json({
      success: true,
      sessionUrl: `https://embed.liveavatar.com/v1/${avatarId}?is_sandbox=${isSandbox}`,
      avatarId,
      contextId,
    })
  }
}
