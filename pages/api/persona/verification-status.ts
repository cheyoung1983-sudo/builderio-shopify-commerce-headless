import type { NextApiRequest, NextApiResponse } from 'next'
import { PERSONA_API_KEY, personaRequest } from '../../../services/persona'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { inquiryId } = req.query

  if (!inquiryId || typeof inquiryId !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing inquiryId parameter' })
  }

  // Sandbox mock response if API key is not configured
  if (!PERSONA_API_KEY || inquiryId.startsWith('inq_sandbox')) {
    return res.status(200).json({
      success: true,
      inquiry: {
        id: inquiryId,
        type: 'inquiry',
        attributes: {
          status: 'approved',
          'reference-id': 'usr_test',
          'created-at': new Date().toISOString(),
        },
        relationships: {
          verifications: {
            data: [
              { type: 'verification/government-id', id: 'ver_gov_1' },
              { type: 'verification/selfie', id: 'ver_selfie_1' },
            ],
          },
        },
      },
      verifications: [
        {
          id: 'ver_gov_1',
          type: 'verification/government-id',
          attributes: { status: 'passed', 'check-results': { 'document-verification': 'passed' } },
        },
        {
          id: 'ver_selfie_1',
          type: 'verification/selfie',
          attributes: { status: 'passed', 'check-results': { 'face-match': 'passed' } },
        },
      ],
      is_sandbox: true,
    })
  }

  try {
    const response = await personaRequest(`/inquiries/${inquiryId}?include=verifications`)
    const json = await response.json()
    const inquiry = json?.data || null
    const included = json?.included || []

    const verifications = included.filter((item: any) => item.type && item.type.startsWith('verification/'))

    return res.status(200).json({
      success: true,
      inquiry,
      verifications,
    })
  } catch (error: any) {
    console.error('[Persona verification-status API error]:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch inquiry verification status',
    })
  }
}
