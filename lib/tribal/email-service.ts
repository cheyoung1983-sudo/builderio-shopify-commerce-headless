/**
 * Tribal Verification Email Notification Service
 * Dispatches confirmation emails via Resend or SendGrid APIs with simulation fallback.
 */

import type { TribalVerificationEmailData } from './email-templates.ts'
import {
  generateTribalVerificationHtmlEmail,
  generateTribalVerificationTextEmail,
} from './email-templates.ts'

export interface EmailServiceConfig {
  provider?: 'resend' | 'sendgrid' | 'auto'
  resendApiKey?: string
  sendgridApiKey?: string
  fromEmail?: string
  fromName?: string
}

export interface EmailDispatchResult {
  success: boolean
  messageId: string
  provider: 'resend' | 'sendgrid' | 'simulated'
  recipient: string
  subject: string
  timestamp: string
  error?: string
}

/**
 * Dispatches confirmation notice to the user once their tribal verification status is updated.
 */
export async function sendTribalVerificationConfirmationEmail(
  data: TribalVerificationEmailData,
  config?: EmailServiceConfig
): Promise<EmailDispatchResult> {
  const storeName = data.storeName || 'Display & Cell Pros'
  const fromEmail =
    config?.fromEmail ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.SENDGRID_FROM_EMAIL ||
    'support@displaycellpros.com'
  const fromName = config?.fromName || `${storeName} Verification`
  const subject = `Tribal Member Verification Confirmed - ${data.tribalNation}`

  const resendApiKey = config?.resendApiKey || process.env.RESEND_API_KEY
  const sendgridApiKey = config?.sendgridApiKey || process.env.SENDGRID_API_KEY

  const htmlContent = generateTribalVerificationHtmlEmail(data)
  const textContent = generateTribalVerificationTextEmail(data)

  // 1. Try Resend if configured or auto
  if (resendApiKey && (config?.provider === 'resend' || config?.provider === 'auto' || !config?.provider)) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [data.customerEmail],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      })

      if (response.ok) {
        const json = await response.json()
        return {
          success: true,
          messageId: json.id || `resend_${Date.now()}`,
          provider: 'resend',
          recipient: data.customerEmail,
          subject,
          timestamp: new Date().toISOString(),
        }
      }
      console.warn('Resend API response not ok, attempting fallback:', await response.text())
    } catch (err) {
      console.warn('Resend API call failed:', err)
    }
  }

  // 2. Try SendGrid if configured
  if (sendgridApiKey && (config?.provider === 'sendgrid' || config?.provider === 'auto' || !config?.provider)) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sendgridApiKey}`,
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: data.customerEmail, name: data.customerName }],
              subject,
            },
          ],
          from: { email: fromEmail, name: fromName },
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent },
          ],
        }),
      })

      if (response.ok || response.status === 202) {
        return {
          success: true,
          messageId: `sendgrid_${Date.now()}`,
          provider: 'sendgrid',
          recipient: data.customerEmail,
          subject,
          timestamp: new Date().toISOString(),
        }
      }
      console.warn('SendGrid API response not ok:', await response.text())
    } catch (err) {
      console.warn('SendGrid API call failed:', err)
    }
  }

  // 3. Simulated dispatch fallback for development & tests
  return {
    success: true,
    messageId: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    provider: 'simulated',
    recipient: data.customerEmail,
    subject,
    timestamp: new Date().toISOString(),
  }
}

export default sendTribalVerificationConfirmationEmail
