import type { NextApiRequest, NextApiResponse } from 'next'
import { rejectUnlessAuthorizedAgent, getClientIp } from '../../../lib/voice-intake/auth.ts'
import { dispatchBookingSms } from '../../../lib/voice-intake/sms.ts'

/**
 * POST /api/intake/dispatch-sms — ElevenLabs voice agent `dispatch_booking_link` tool.
 * Requires X-DCP-Agent-Secret. Texts the customer their estimate, a link to
 * /services-faq and the business phone via Twilio. Rate limited per phone,
 * per IP and per day (per server instance — see lib/voice-intake/rate-limit.ts).
 * Never logs customer names, phone numbers or emails.
 */
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (rejectUnlessAuthorizedAgent(req, res)) return

  const result = await dispatchBookingSms(req.body, { ip: getClientIp(req) })
  for (const [key, value] of Object.entries(result.headers || {})) res.setHeader(key, value)
  return res.status(result.status).json(result.body)
}
