import type { NextApiRequest, NextApiResponse } from 'next'
import { validateEmail } from '@lib/validate-email'

export interface ServiceRequestPayload {
  serviceQuery: string
  optInDetails: boolean
  userEmail?: string
  userName?: string
  deviceModel?: string
  urgency?: 'standard' | 'priority' | 'urgent'
  notes?: string
}

export interface ServiceRequestResponse {
  success: boolean
  message: string
  requestId: string
  forwardedTo: string
  mailtoUrl?: string
  data?: {
    serviceQuery: string
    optInDetails: boolean
    userEmail?: string
    userName?: string
    deviceModel?: string
    urgency?: string
    notes?: string
    submittedAt: string
  }
}

export const SUPPORT_EMAIL = 'support@displaycellpros.com'

/**
 * Generates an RFC compliant mailto URL with prefilled subject and body
 * so users or backup systems can directly launch an email client if desired.
 */
export function generateServiceRequestMailto(payload: {
  serviceQuery: string
  userEmail?: string
  userName?: string
  deviceModel?: string
  urgency?: string
  notes?: string
  requestId: string
}): string {
  const subject = `Service Request [${payload.requestId}]: ${payload.serviceQuery}`
  const body = [
    `SERVICE REQUEST - DISPLAY CELL PROS`,
    `----------------------------------------`,
    `Reference ID: ${payload.requestId}`,
    `Requested Service: ${payload.serviceQuery}`,
    `Device / Model: ${payload.deviceModel || 'Not specified'}`,
    `Urgency: ${payload.urgency || 'Standard'}`,
    `Customer Name: ${payload.userName || 'Anonymous Visitor'}`,
    `Customer Email: ${payload.userEmail || 'Not provided'}`,
    `Additional Notes:`,
    payload.notes || 'None provided',
    `----------------------------------------`,
    `Submitted from Display Cell Pros Shopify Catalog Service Search`,
  ].join('\n')

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServiceRequestResponse | { success: false; message: string }>
) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed. Please use POST.`,
    })
  }

  try {
    const {
      serviceQuery,
      optInDetails = false,
      userEmail,
      userName,
      deviceModel,
      urgency = 'standard',
      notes,
    }: ServiceRequestPayload = req.body || {}

    const trimmedQuery = (serviceQuery || '').trim()
    if (!trimmedQuery) {
      return res.status(400).json({
        success: false,
        message: 'A service query is required to submit a request.',
      })
    }

    // Validate email if user opted in and provided one
    let sanitizedEmail: string | undefined = undefined
    if (optInDetails && userEmail && userEmail.trim()) {
      const emailValidation = validateEmail(userEmail)
      if (!emailValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.error || 'Please provide a valid email address.',
        })
      }
      sanitizedEmail = emailValidation.sanitizedEmail || userEmail.trim().toLowerCase()
    }

    const requestId = `SRV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const submittedAt = new Date().toISOString()

    // Structured record ready for forwarding and logging
    const requestRecord = {
      requestId,
      submittedAt,
      forwardedTo: SUPPORT_EMAIL,
      serviceQuery: trimmedQuery,
      optInDetails: Boolean(optInDetails),
      userEmail: sanitizedEmail || (optInDetails ? undefined : 'Unspecified (Opt-out)'),
      userName: (userName || '').trim() || undefined,
      deviceModel: (deviceModel || '').trim() || undefined,
      urgency,
      notes: (notes || '').trim() || undefined,
    }

    // High-priority console dispatch log for Cloud Run / support ticket intake
    console.info('[SERVICE_NOT_OFFERED_REQUEST_DISPATCHED]', JSON.stringify(requestRecord, null, 2))

    const mailtoUrl = generateServiceRequestMailto({
      serviceQuery: trimmedQuery,
      userEmail: sanitizedEmail,
      userName: requestRecord.userName,
      deviceModel: requestRecord.deviceModel,
      urgency,
      notes: requestRecord.notes,
      requestId,
    })

    const message = optInDetails
      ? `Your detailed service request for "${trimmedQuery}" has been submitted to ${SUPPORT_EMAIL}. Our technicians will review and follow up promptly.`
      : `Your request for the service "${trimmedQuery}" has been automatically dispatched to ${SUPPORT_EMAIL}. We track every unlisted service to expand our catalog offerings.`

    return res.status(200).json({
      success: true,
      message,
      requestId,
      forwardedTo: SUPPORT_EMAIL,
      mailtoUrl,
      data: {
        serviceQuery: trimmedQuery,
        optInDetails: Boolean(optInDetails),
        userEmail: sanitizedEmail,
        userName: requestRecord.userName,
        deviceModel: requestRecord.deviceModel,
        urgency,
        notes: requestRecord.notes,
        submittedAt,
      },
    })
  } catch (error: any) {
    console.error('[SERVICE_REQUEST_ERROR]', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to process service request. Please try again or contact support directly.',
    })
  }
}
