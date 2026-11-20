import type { NextApiRequest, NextApiResponse } from 'next'
import { PERSONA_API_KEY, personaRequest } from '../../../services/persona'
import { rateLimit } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { isAdminSession } from '../../../lib/tribal/admin-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const isAllowed = await rateLimit(req, res, 10, 60000) // 10 simulations per minute
  if (!isAllowed) {
    return res.status(429).json({ success: false, error: 'Too many requests' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  if (!(await isAdminSession(req))) {
    return res.status(403).json({ success: false, error: 'Forbidden: verified owner access required.' })
  }

  const { inquiryId, simulateAction, idClass, checkName, reasonCode } = req.body || {}

  if (!inquiryId || !simulateAction) {
    return res.status(400).json({ success: false, error: 'Missing inquiryId or simulateAction' })
  }

  const validActions = [
    'start_inquiry',
    'complete_inquiry',
    'fail_inquiry',
    'expire_inquiry',
    'mark_for_review_inquiry',
    'approve_inquiry',
    'decline_inquiry',
    'create_passed_verification',
    'create_failed_verification',
  ]

  if (!validActions.includes(simulateAction)) {
    return res.status(400).json({ success: false, error: `Invalid simulate action: ${simulateAction}` })
  }

  // Sandbox / Mock simulation if API key is not configured or sandbox ID
  if (!PERSONA_API_KEY || inquiryId.startsWith('inq_sandbox')) {
    let mockStatus = 'pending'
    if (simulateAction === 'complete_inquiry') mockStatus = 'completed'
    if (simulateAction === 'approve_inquiry') mockStatus = 'approved'
    if (simulateAction === 'decline_inquiry') mockStatus = 'declined'
    if (simulateAction === 'fail_inquiry') mockStatus = 'failed'
    if (simulateAction === 'expire_inquiry') mockStatus = 'expired'
    if (simulateAction === 'mark_for_review_inquiry') mockStatus = 'needs_review'
    if (simulateAction === 'create_passed_verification') mockStatus = 'passed'
    if (simulateAction === 'create_failed_verification') mockStatus = 'failed'

    return res.status(200).json({
      success: true,
      simulation: {
        inquiryId,
        action: simulateAction,
        idClass: idClass || 'dl',
        checkName: checkName || 'selfie_liveness_detection',
        reasonCode: reasonCode || null,
        status: mockStatus,
        simulatedAt: new Date().toISOString(),
      },
      data: {
        id: inquiryId,
        type: 'inquiry',
        attributes: {
          status: mockStatus,
          'check-results': checkName ? { [checkName]: mockStatus } : undefined,
        },
      },
      is_sandbox: true,
    })
  }

  try {
    const payload: any = {
      data: {
        type: 'simulate-action',
        attributes: {
          action: simulateAction,
        },
      },
    }

    if (idClass) payload.data.attributes['id-class'] = idClass
    if (checkName) payload.data.attributes['check-name'] = checkName
    if (reasonCode) payload.data.attributes['reason-code'] = reasonCode

    const response = await personaRequest(`/inquiries/${inquiryId}/simulate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    return res.status(200).json({ success: true, data })
  } catch (error: any) {
    logger.error('[Persona simulate API error]:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to perform simulate action',
    })
  }
}
