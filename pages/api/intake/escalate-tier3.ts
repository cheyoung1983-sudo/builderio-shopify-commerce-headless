import type { NextApiRequest, NextApiResponse } from 'next'
import { rejectUnlessAuthorizedAgent, getClientIp } from '../../../lib/voice-intake/auth.ts'
import { escalateTier3 } from '../../../lib/voice-intake/slack.ts'
import { createWindowLimiter, hashKey } from '../../../lib/voice-intake/rate-limit.ts'

/**
 * POST /api/intake/escalate-tier3 — ElevenLabs voice agent `escalate_tier3_ticket` tool.
 * Requires X-DCP-Agent-Secret. Posts a Tier 3 alert to the Slack incoming
 * webhook in SLACK_ESCALATION_WEBHOOK_URL. The customer's phone and email are
 * never sent to Slack or logged.
 */
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } }

// Per server instance (in-memory).
const ipLimiter = createWindowLimiter({ limit: 30, windowMs: 60 * 60 * 1000 })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (rejectUnlessAuthorizedAgent(req, res)) return

  const limited = ipLimiter.consume(hashKey(getClientIp(req)))
  if (!limited.allowed) {
    res.setHeader('Retry-After', String(limited.retryAfterSeconds))
    return res.status(429).json({ success: false, error: 'Too many escalation requests. Try again later.' })
  }

  const result = await escalateTier3(req.body)
  return res.status(result.status).json(result.body)
}
