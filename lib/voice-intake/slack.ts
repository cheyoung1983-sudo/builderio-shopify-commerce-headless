/**
 * escalate_tier3_ticket tool logic (ported from rev5, hardened).
 * Posts a Tier 3 alert to a Slack incoming webhook. The customer's phone
 * number and email are NEVER sent to Slack; the alert carries a ticket
 * reference and notes that contact details are on file with the voice agent.
 */
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { normalizeUsPhone } from './phone.ts'

export const EscalateTier3TicketSchema = z.object({
  customer_name: z.string().trim().min(1).max(200),
  customer_phone: z.string().max(32),
  customer_email: z.string().trim().email().max(254).optional(),
  device_model: z.string().trim().min(1).max(120),
  failure_symptoms: z.string().trim().min(1).max(2000),
  intake_notes: z.string().max(2000).optional().default(''),
})

/** Escapes Slack mrkdwn control characters (prevents <!channel>, link injection). */
export function escapeSlack(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Removes phone numbers and email addresses from free text. */
export function redactContactInfo(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email redacted]')
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone redacted]')
}

const clean = (text: string, max: number) => escapeSlack(redactContactInfo(text)).slice(0, max)

export function buildTier3SlackPayload(params: {
  ticketId: string
  customerName: string
  deviceModel: string
  failureSymptoms: string
  intakeNotes: string
}): { text: string } {
  const lines = [
    `:rotating_light: Tier 3 escalation ${params.ticketId}`,
    `Customer: ${clean(params.customerName, 200)}`,
    `Device: ${clean(params.deviceModel, 120)}`,
    `Symptoms: ${clean(params.failureSymptoms, 1500)}`,
    `Notes: ${params.intakeNotes ? clean(params.intakeNotes, 1500) : 'none'}`,
    `Phone: on file with the voice agent (not included here). Look up ticket ${params.ticketId} in the ElevenLabs conversation.`,
  ]
  return { text: lines.join('\n') }
}

export function getSlackWebhookUrl(env: Record<string, string | undefined> = process.env): string | null {
  const url = (env.SLACK_ESCALATION_WEBHOOK_URL || '').trim()
  return url.startsWith('https://') ? url : null
}

export async function escalateTier3(
  input: unknown,
  ctx: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch } = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  const env = ctx.env ?? process.env

  const parsed = EscalateTier3TicketSchema.safeParse(input ?? {})
  if (!parsed.success) {
    return { status: 400, body: { success: false, error: parsed.error.issues[0]?.message || 'Invalid escalation request' } }
  }
  if (!normalizeUsPhone(parsed.data.customer_phone)) {
    return { status: 400, body: { success: false, error: 'customer_phone must be a valid US number' } }
  }

  const webhookUrl = getSlackWebhookUrl(env)
  if (!webhookUrl) {
    return {
      status: 503,
      body: { success: false, escalated: false, error: 'Escalation channel is not configured. Ask the customer to call (509) 255-3852.' },
    }
  }

  const ticketId = `DCP-T3-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`
  const payload = buildTier3SlackPayload({
    ticketId,
    customerName: parsed.data.customer_name,
    deviceModel: parsed.data.device_model,
    failureSymptoms: parsed.data.failure_symptoms,
    intakeNotes: parsed.data.intake_notes,
  })

  let ok = false
  let status: number | undefined
  try {
    const res = await (ctx.fetchImpl ?? fetch)(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    ok = res.ok
    status = res.status
  } catch {
    ok = false
  }

  if (!ok) {
    console.error(`[voice-intake] Slack escalation failed for ${ticketId} (status ${status ?? 'network error'})`)
    return {
      status: 502,
      body: {
        success: false,
        ticketId,
        escalated: false,
        error: 'The escalation could not be delivered. Do not quote a price; ask the customer to call (509) 255-3852.',
      },
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      ticketId,
      escalated: true,
      notified: true,
      message: 'Tier 3 case sent to the lead technician for a callback. Do not provide a binding quote for this repair.',
    },
  }
}
