/**
 * dispatch_booking_link tool logic (ported from rev5, hardened).
 * Sends the estimate + link via Twilio's REST API (no SDK), same as rev5.
 * Differences from rev5: no /book link (that page doesn't exist here), no
 * Postgres insert, no in-memory PII log, per-phone/per-IP/daily limits,
 * 503 when Twilio isn't configured instead of pretending to send.
 */
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { normalizeUsPhone } from './phone.ts'
import { createWindowLimiter, hashKey } from './rate-limit.ts'

export const BUSINESS_PHONE_DISPLAY = '(509) 255-3852'
export const SMS_INFO_URL = 'https://www.displaycellpros.com/services-faq'

const HOUR = 60 * 60 * 1000

/** Per-instance limits (see rate-limit.ts). */
export const SMS_LIMITS = {
  perPhonePerHour: 3,
  perIpPerHour: 10,
  perInstancePerDay: 100,
}

export const phoneLimiter = createWindowLimiter({ limit: SMS_LIMITS.perPhonePerHour, windowMs: HOUR })
export const ipLimiter = createWindowLimiter({ limit: SMS_LIMITS.perIpPerHour, windowMs: HOUR })
export const dailyLimiter = createWindowLimiter({ limit: SMS_LIMITS.perInstancePerDay, windowMs: 24 * HOUR })

export function resetSmsLimiters() {
  phoneLimiter.reset()
  ipLimiter.reset()
  dailyLimiter.reset()
}

export const DispatchBookingLinkSchema = z.object({
  customer_name: z.string().trim().min(1).max(200),
  customer_phone: z.string().max(32),
  customer_email: z.string().trim().email().max(254).optional(),
  device_summary: z.string().trim().min(1).max(500),
  quoted_price: z.number().finite().min(0).max(10000),
  service_tier: z.string().max(100).optional().default(''),
  location_address: z.string().max(300).optional().default(''),
})

/** Keeps the tier label safe to put in an SMS (no links or odd characters). */
export function sanitizeTierLabel(raw: string): string {
  const cleaned = (raw || '').replace(/[^A-Za-z0-9 &/-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40)
  return cleaned || 'repair'
}

export function buildSmsBody(params: { quotedPrice: number; serviceTier: string }): string {
  const tier = sanitizeTierLabel(params.serviceTier)
  return (
    `Display & Cell Pros: Your ${tier} estimate is $${params.quotedPrice.toFixed(2)}. ` +
    `Details and next steps: ${SMS_INFO_URL} ` +
    `Questions? Call ${BUSINESS_PHONE_DISPLAY}. Reply STOP to opt out.`
  )
}

export function getTwilioConfig(env: Record<string, string | undefined> = process.env) {
  const accountSid = (env.TWILIO_ACCOUNT_SID || '').trim()
  const authToken = (env.TWILIO_AUTH_TOKEN || '').trim()
  const fromNumber = (env.TWILIO_FROM_NUMBER || '').trim()
  if (!accountSid || !authToken || !fromNumber) return null
  return { accountSid, authToken, fromNumber }
}

export async function sendTwilioSms(
  config: { accountSid: string; authToken: string; fromNumber: string },
  to: string,
  body: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ sent: boolean; status?: number }> {
  try {
    const res = await fetchImpl(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: config.fromNumber, Body: body }),
        signal: AbortSignal.timeout(10_000),
      }
    )
    return { sent: res.ok, status: res.status }
  } catch {
    return { sent: false }
  }
}

export interface DispatchResult {
  status: number
  body: Record<string, unknown>
  headers?: Record<string, string>
}

export async function dispatchBookingSms(
  input: unknown,
  ctx: { ip: string; env?: Record<string, string | undefined>; fetchImpl?: typeof fetch }
): Promise<DispatchResult> {
  const env = ctx.env ?? process.env

  // Per-IP limit first, so floods are cut off before any other work.
  const ipCheck = ipLimiter.consume(hashKey(`ip:${ctx.ip}`))
  if (!ipCheck.allowed) {
    return {
      status: 429,
      body: { success: false, smsSent: false, error: 'Too many SMS requests from this source. Try again later.' },
      headers: { 'Retry-After': String(ipCheck.retryAfterSeconds) },
    }
  }

  const parsed = DispatchBookingLinkSchema.safeParse(input ?? {})
  if (!parsed.success) {
    return { status: 400, body: { success: false, smsSent: false, error: parsed.error.issues[0]?.message || 'Invalid dispatch request' } }
  }

  const phone = normalizeUsPhone(parsed.data.customer_phone)
  if (!phone) {
    return {
      status: 400,
      body: { success: false, smsSent: false, error: 'customer_phone must be a valid US number, e.g. (509) 255-3852 or +15092553852' },
    }
  }

  const twilio = getTwilioConfig(env)
  if (!twilio) {
    return {
      status: 503,
      body: { success: false, smsSent: false, error: 'SMS is not configured. Do not tell the customer a text was sent.' },
    }
  }

  const phoneCheck = phoneLimiter.consume(hashKey(`phone:${phone}`))
  if (!phoneCheck.allowed) {
    return {
      status: 429,
      body: { success: false, smsSent: false, error: 'This number has already received the maximum texts for this hour.' },
      headers: { 'Retry-After': String(phoneCheck.retryAfterSeconds) },
    }
  }

  const dailyCheck = dailyLimiter.consume('daily')
  if (!dailyCheck.allowed) {
    return {
      status: 429,
      body: { success: false, smsSent: false, error: 'Daily SMS limit reached. Ask the customer to call (509) 255-3852.' },
      headers: { 'Retry-After': String(dailyCheck.retryAfterSeconds) },
    }
  }

  const ticketId = `dcp_sms_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`
  const smsBody = buildSmsBody({ quotedPrice: parsed.data.quoted_price, serviceTier: parsed.data.service_tier })
  const result = await sendTwilioSms(twilio, phone, smsBody, ctx.fetchImpl ?? fetch)

  if (!result.sent) {
    // Log only the ticket and provider status, never the phone/name/email.
    console.error(`[voice-intake] Twilio send failed for ${ticketId} (status ${result.status ?? 'network error'})`)
    return {
      status: 502,
      body: { success: false, ticketId, smsSent: false, error: 'The text could not be sent. Do not tell the customer it was sent.' },
    }
  }

  return {
    status: 200,
    body: { success: true, ticketId, smsSent: true, smsProvider: 'twilio', infoUrl: SMS_INFO_URL },
  }
}
