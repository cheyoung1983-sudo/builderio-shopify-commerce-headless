import type { NextApiRequest, NextApiResponse } from 'next'
import { rejectMethod } from '../../lib/api/read-raw-body.ts'

// Moved from app/api/health/route.ts (pure move). Guarded by proxy.ts (admin Basic Auth).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (rejectMethod(req, res, ['GET', 'HEAD', 'OPTIONS'])) return
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    return res.status(204).end()
  }
  // Mock health status checks
  return res.status(200).json({
    elevenLabs: { status: 'connected', lastChecked: new Date().toISOString() },
    webhooks: { status: 'healthy', pending: 0 },
    apiKeys: { status: 'configured', provider: 'ElevenLabs' },
    audioWorklet: { status: 'available' },
  })
}
