import type { NextApiRequest, NextApiResponse } from 'next'
import { readRawBody, rejectMethod } from '../../lib/api/read-raw-body.ts'
import { isAdminSession } from '../../lib/tribal/admin-auth.ts'

// Guarded by proxy.ts (admin Basic Auth) AND verified two-email owner session.
export const config = { api: { bodyParser: false } }

// Internal configuration store
let storeConfig: Record<string, unknown> = {
  shopifyCartEnabled: true,
  webhookEndpoint: 'https://api.example.com/webhooks',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (rejectMethod(req, res, ['GET', 'HEAD', 'POST', 'OPTIONS'])) return
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS, POST')
    return res.status(204).end()
  }
  if (!(await isAdminSession(req))) {
    return res.status(403).json({ success: false, error: 'Forbidden: verified owner access required.' })
  }
  if (req.method === 'POST') {
    const newConfig = JSON.parse((await readRawBody(req)).toString('utf8'))
    storeConfig = { ...storeConfig, ...newConfig }
    return res.status(200).json({ success: true, config: storeConfig })
  }
  return res.status(200).json(storeConfig)
}
