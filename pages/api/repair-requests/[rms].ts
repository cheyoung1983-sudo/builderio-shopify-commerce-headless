import type { NextApiRequest, NextApiResponse } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { createRateLimiter } from '../../../lib/api-security'
import { db } from '../../../lib/firebase'
import { toSafeSummary } from '../../../lib/repair-lookup'

// Status by RMS number only. Returns the customer-safe summary (no passcode,
// IMEI, address, phone or email) and never any demo data.
const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })
const RMS_PATTERN = /^[A-Z0-9-]{4,40}$/
const NOT_FOUND = { success: false, error: 'No repair matched that Repair Request ID.' }

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const limit = rateLimiter.check(getClientKey(req))
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds))
    return res.status(429).json({ success: false, error: 'Too many requests' })
  }

  const rms = typeof req.query.rms === 'string' ? req.query.rms.trim().toUpperCase() : ''
  if (!RMS_PATTERN.test(rms)) return res.status(404).json(NOT_FOUND)

  if (db) {
    try {
      const snap = await getDoc(doc(db, 'repair_requests', rms))
      if (snap.exists()) {
        return res.status(200).json({ success: true, record: toSafeSummary(rms, snap.data() as Record<string, unknown>) })
      }
    } catch {
      // fall through to not-found
    }
  }
  return res.status(404).json(NOT_FOUND)
}
