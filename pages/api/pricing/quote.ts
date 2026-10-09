import type { NextApiRequest, NextApiResponse } from 'next'
import { rejectUnlessAuthorizedAgent, getClientIp } from '../../../lib/voice-intake/auth.ts'
import { buildRepairQuote } from '../../../lib/voice-intake/quote.ts'
import { createWindowLimiter, hashKey } from '../../../lib/voice-intake/rate-limit.ts'

/**
 * POST /api/pricing/quote — ElevenLabs voice agent `get_repair_quote` tool.
 * Requires X-DCP-Agent-Secret (see lib/voice-intake/auth.ts).
 * Tier 3 repairs are never priced; the response tells the agent to escalate.
 */
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } }

// Per server instance (in-memory); generous because all agent calls share ElevenLabs' egress IPs.
const ipLimiter = createWindowLimiter({ limit: 120, windowMs: 60 * 60 * 1000 })

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (rejectUnlessAuthorizedAgent(req, res)) return

  const limited = ipLimiter.consume(hashKey(getClientIp(req)))
  if (!limited.allowed) {
    res.setHeader('Retry-After', String(limited.retryAfterSeconds))
    return res.status(429).json({ success: false, error: 'Too many quote requests. Try again later.' })
  }

  const result = buildRepairQuote(req.body)
  return res.status(result.status).json(result.body)
}
