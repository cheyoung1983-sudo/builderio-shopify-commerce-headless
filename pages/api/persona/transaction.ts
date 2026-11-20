import type { NextApiRequest, NextApiResponse } from 'next'
import { PERSONA_API_KEY, personaRequest } from '../../../services/persona'
import { rateLimit } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isAllowed = await rateLimit(req, res, 20, 60000) // 20 transactions per minute
  if (!isAllowed) {
    return res.status(429).json({ success: false, error: 'Too many requests' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { transactionTypeId, referenceId, fields } = req.body || {}

  if (!transactionTypeId || !referenceId) {
    return res.status(400).json({ success: false, error: 'Missing transactionTypeId or referenceId' })
  }

  // Sandbox fallback response
  if (!PERSONA_API_KEY) {
    const mockTxId = `tx_sandbox_${Date.now()}`
    const debugMode = fields?.debug || 'passed'
    const mockStatus = debugMode === 'passed' ? 'approved' : 'declined'

    return res.status(200).json({
      success: true,
      data: {
        id: mockTxId,
        type: 'transaction',
        attributes: {
          status: mockStatus,
          'reference-id': referenceId,
          fields: fields || {},
        },
      },
      is_sandbox: true,
    })
  }

  try {
    const response = await personaRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          attributes: {
            'transaction-type-id': transactionTypeId,
            'reference-id': referenceId,
            fields: {
              ...fields,
            },
          },
        },
      }),
    })

    const data = await response.json()
    return res.status(200).json({ success: true, data })
  } catch (error: any) {
    logger.error('[Persona transactions API error]:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create Persona transaction',
    })
  }
}
