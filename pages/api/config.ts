import type { NextApiRequest, NextApiResponse } from 'next'
import { readRawBody, rejectMethod } from '../../lib/api/read-raw-body.ts'

// Moved from app/api/config/route.ts (pure move). Guarded by proxy.ts (admin Basic Auth).
export const config = { api: { bodyParser: false } }

// Mock configuration store
let storeConfig: Record<string, unknown> = {
  shopifyCartEnabled: true,
  webhookEndpoint: 'https://api.example.com/webhooks',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (rejectMethod(req, res, ['GET', 'HEAD', 'POST', 'OPTIONS'])) return
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS, POST')
    return res.status(204).end()
  }
  if (req.method === 'POST') {
    const newConfig = JSON.parse((await readRawBody(req)).toString('utf8'))
    storeConfig = { ...storeConfig, ...newConfig }
    return res.status(200).json({ success: true, config: storeConfig })
  }
  return res.status(200).json(storeConfig)
}
