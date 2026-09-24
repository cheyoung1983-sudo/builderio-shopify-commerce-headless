import type { NextApiRequest, NextApiResponse } from 'next'
import { searchGlobalCatalog } from '@services/shopify'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query, country } = req.body

  if (!query) {
    return res.status(400).json({ error: 'Query is required' })
  }

  try {
    const result = await searchGlobalCatalog({ query, country })
    if (result.ok) {
      return res.status(200).json(result)
    } else {
      return res.status(500).json(result)
    }
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
