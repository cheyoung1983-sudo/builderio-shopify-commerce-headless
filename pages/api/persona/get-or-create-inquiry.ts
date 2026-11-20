import type { NextApiRequest, NextApiResponse } from 'next'
import {
  PERSONA_API_KEY,
  findIncompleteInquiry,
  createSessionToken,
  createPersonaInquiry,
} from '../../../services/persona'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { referenceId, fields, templateId } = req.body || {}
    const refId = referenceId || `usr_${Date.now()}`
    const envId = process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID || process.env.PERSONA_ENVIRONMENT_ID || 'env_sandbox'

    // If no Persona API key configured, return sandbox mock structure
    if (!PERSONA_API_KEY) {
      const mockId = `inq_sandbox_${Date.now()}`
      return res.status(200).json({
        success: true,
        inquiry_id: mockId,
        session_token: null,
        environment_id: envId,
        is_sandbox: true,
      })
    }

    // 1. Check for existing incomplete inquiry to prevent duplicates
    const existing = await findIncompleteInquiry(refId)

    if (existing) {
      const inquiryId = existing.id
      const status = existing.attributes?.status

      // If pending, user submitted previous verifications -> generate session token to resume
      if (status === 'pending') {
        const sessionToken = await createSessionToken(inquiryId)
        return res.status(200).json({
          success: true,
          inquiry_id: inquiryId,
          session_token: sessionToken,
          environment_id: envId,
          status,
          resumed: true,
        })
      }

      // If created (not yet started), resume without session token
      return res.status(200).json({
        success: true,
        inquiry_id: inquiryId,
        session_token: null,
        environment_id: envId,
        status,
        resumed: false,
      })
    }

    // 2. Pre-create new inquiry securely on the backend
    const newInquiry = await createPersonaInquiry({
      referenceId: refId,
      inquiryTemplateId: templateId || process.env.PERSONA_INQUIRY_TEMPLATE_ID || 'itmpl_tribal_id',
      fields,
    })

    return res.status(200).json({
      success: true,
      inquiry_id: newInquiry.id,
      session_token: null,
      environment_id: envId,
      resumed: false,
    })
  } catch (error: any) {
    console.error('[Persona get-or-create API error]:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to initialize Persona inquiry',
    })
  }
}
