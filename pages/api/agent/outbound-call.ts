import type { NextApiRequest, NextApiResponse } from 'next'
import { ElevenLabsClient } from 'elevenlabs'
import {
  isNumberOnDnc,
  checkCallingTimeWindow,
} from '../../../lib/compliance/tcpa'
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '../../../lib/api-security/index'

interface OutboundCallResponse {
  success?: boolean
  message?: string
  conversation_id?: string
  sip_call_id?: string
  callSid?: string
  error?: string
}

const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OutboundCallResponse>
) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) return

  if (!rateLimiter.check(getClientKey(req)).allowed) {
    const result = rateLimiter.check(getClientKey(req))
    res.setHeader('Retry-After', String(result.retryAfterSeconds))
    return res.status(429).json({ error: 'Too many requests' })
  }

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ error: 'Origin not allowed' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    toNumber,
    agentId = process.env.ELEVENLABS_AGENT_ID,
    agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID,
    provider = 'sip_trunk', // 'sip_trunk' | 'twilio'
  } = req.body || {}

  if (!toNumber || typeof toNumber !== 'string') {
    return res.status(400).json({ error: 'Missing required field: toNumber' })
  }

  if (!agentId || !agentPhoneNumberId) {
    return res
      .status(400)
      .json({ error: 'Missing agentId or agentPhoneNumberId configuration' })
  }

  // TCPA Guard 1: Do Not Call Registry
  if (isNumberOnDnc(toNumber)) {
    return res.status(422).json({
      error: 'TCPA Violation: Phone number is listed on Do-Not-Call registry.',
    })
  }

  // TCPA Guard 2: Calling Time Window Restriction (8 AM - 9 PM recipient local time)
  const timeCheck = checkCallingTimeWindow(toNumber)
  if (!timeCheck.allowed) {
    return res.status(422).json({
      error: `TCPA Violation: ${timeCheck.reason}`,
    })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'Server configuration error: missing ElevenLabs API key' })
  }

  try {
    const elevenlabs = new ElevenLabsClient({ apiKey })

    if (provider === 'twilio') {
      const response = await (elevenlabs as any).conversationalAi.twilio.outboundCall({
        agentId,
        agentPhoneNumberId,
        toNumber,
      })
      return res.status(200).json({
        success: response.success,
        message: response.message,
        conversation_id: response.conversationId,
        callSid: response.callSid,
      })
    } else {
      const response = await (elevenlabs as any).conversationalAi.sipTrunk.outboundCall(
        {
          agentId,
          agentPhoneNumberId,
          toNumber,
        }
      )
      return res.status(200).json({
        success: response.success,
        message: response.message,
        conversation_id: response.conversationId,
        sip_call_id: response.sipCallId,
      })
    }
  } catch (error: any) {
    console.error('[OutboundCallAPI:Error]', error)
    return res.status(502).json({
      error: error.message || 'Failed to initiate outbound call',
    })
  }
}
