import type { NextApiRequest, NextApiResponse } from 'next'
import { calculateAvaTaxTribalQuote } from '../../../lib/tribal/avatax'
import { AvaTaxTribalRequest } from '../../../lib/tribal/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' })
  }

  try {
    const body: AvaTaxTribalRequest = req.body

    if (!body.shippingAddress || !body.lines || !Array.isArray(body.lines)) {
      return res.status(400).json({ error: 'Invalid request: shippingAddress and lines array are required.' })
    }

    const quote = await calculateAvaTaxTribalQuote(body)
    return res.status(200).json(quote)
  } catch (err: any) {
    console.error('Error in /api/tribal/tax-quote:', err)
    return res.status(500).json({ error: 'Failed to calculate AvaTax tribal quote', details: err.message })
  }
}
