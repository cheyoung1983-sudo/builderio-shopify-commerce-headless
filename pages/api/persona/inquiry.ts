import type { NextApiRequest, NextApiResponse } from 'next'
import { personaRequest } from '../../../services/persona'
import crypto from 'node:crypto'

// This endpoint should be called server-side from the frontend form submission
// to ensure inquiries are pre-created securely.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { inquiryTemplateId, referenceId, fields } = req.body

  if (!process.env.PERSONA_API_KEY) {
    return res.status(200).json({
      success: true,
      data: {
        id: `inq_sandbox_${Date.now()}`,
        type: 'inquiry',
        attributes: {
          status: 'created',
          'reference-id': referenceId || 'usr_test',
          'inquiry-template-id': inquiryTemplateId || 'itmpl_tribal_id',
        },
      },
      hostedUrl: `https://withpersona.com/verify?inquiry-id=inq_sandbox_${Date.now()}`,
      isSandbox: true,
    })
  }

  try {
    const response = await personaRequest('/inquiries', {
      method: 'POST',
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        data: {
          type: 'inquiry',
          attributes: {
            'inquiry-template-id': inquiryTemplateId,
            'reference-id': referenceId,
            fields: fields,
          },
        },
      }),
    })

    const data = await response.json()
    return res.status(200).json({ success: true, data })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message })
  }
}
