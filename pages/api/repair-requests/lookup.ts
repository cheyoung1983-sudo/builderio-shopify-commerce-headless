import type { NextApiRequest, NextApiResponse } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { createRateLimiter } from '../../../lib/api-security'
import { db } from '../../../lib/firebase'
import { lookupRepair, normalizeLookupInput, type RepairRecordSource } from '../../../lib/repair-lookup'

// 10 lookups per minute per client, matching the in-memory limiter used by other API routes.
const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

const NOT_FOUND = {
  success: false,
  error: 'No repair matched that Repair Request ID and email. Please check both and try again.',
}

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

const firestoreSource: RepairRecordSource | null = db
  ? {
      async get(rms) {
        const snap = await getDoc(doc(db, 'repair_requests', rms))
        return snap.exists() ? (snap.data() as Record<string, unknown>) : null
      },
    }
  : null

const MIN_RESPONSE_MS = 250

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const limit = rateLimiter.check(getClientKey(req))
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds))
    return res.status(429).json({ success: false, error: 'Too many requests' })
  }

  const started = Date.now()
  const input = normalizeLookupInput(req.body?.rms, req.body?.email)
  const summary = input ? await lookupRepair(firestoreSource, input.rms, input.email) : null

  // Keep found / not-found / mismatch timing roughly constant.
  const wait = MIN_RESPONSE_MS - (Date.now() - started)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))

  if (!summary) return res.status(404).json(NOT_FOUND)
  return res.status(200).json({ success: true, record: summary })
}
