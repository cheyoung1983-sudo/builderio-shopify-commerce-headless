import type { NextApiRequest, NextApiResponse } from 'next'
import { personaRequest } from '../../../services/persona'
import { rateLimit } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { isAdminSession } from '../../../lib/tribal/admin-auth'

/**
 * Sanitizes inquiry attributes by removing PII and metadata.
 */
function sanitizeAttributes(attributes: any) {
  if (!attributes) return {}
  const sanitized = { ...attributes }
  
  // Remove PII
  const piiFields = [
    'name-first', 'name-last', 'name-middle', 'birthdate', 
    'ssn', 'social-security-number', 'individual-id-number', 'tax-id',
    'phone-number', 'email-address', 'address-street-1', 'address-street-2'
  ]
  piiFields.forEach(field => delete sanitized[field])

  // Remove Device/IP Metadata
  const metadataFields = ['ip-address', 'user-agent', 'browser-info', 'device-info', 'geolocation-lat', 'geolocation-lng']
  metadataFields.forEach(field => delete sanitized[field])

  return sanitized
}

/**
 * Sanitizes event objects.
 */
function sanitizeEvent(event: any) {
  if (!event) return {}
  return {
    id: event.id,
    type: event.type,
    attributes: {
      name: event.attributes?.name,
      'created-at': event.attributes?.['created-at'],
      // Strip raw payload details
    },
    // Keep reference to the object the event is about
    relatedId: event.attributes?.payload?.data?.id
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const isAllowed = await rateLimit(req, res, 30, 60000)
  if (!isAllowed) {
    return res.status(429).json({ success: false, error: 'Too many requests' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  if (!(await isAdminSession(req))) {
    return res.status(403).json({ success: false, error: 'Forbidden: verified owner access required.' })
  }

  const { inquiryId, before, after } = req.query

  try {
    const pageSize = 10
    const queryParams = new URLSearchParams({
      'page[size]': pageSize.toString(),
      'sort': '-created-at'
    })

    if (before) queryParams.append('page[before]', before as string)
    if (after) queryParams.append('page[after]', after as string)

    // Construct request paths
    let inquiriesPath = `/inquiries?${queryParams.toString()}`
    let eventsPath = `/events?${queryParams.toString()}`

    if (inquiryId) {
      // If specific inquiryId is provided, we fetch just that inquiry and events filtered by it
      inquiriesPath = `/inquiries/${inquiryId}`
      queryParams.append('filter[inquiry-id]', inquiryId as string)
      eventsPath = `/events?${queryParams.toString()}`
    }

    const [inquiriesRes, eventsRes] = await Promise.all([
      personaRequest(inquiriesPath),
      personaRequest(eventsPath),
    ])

    // If Persona API is not configured or fails, we still want to return a stable response structure
    if (!inquiriesRes.ok || !eventsRes.ok) {
      const errorText = !inquiriesRes.ok ? await inquiriesRes.text() : await eventsRes.text()
      logger.warn('[Persona API Warning]:', errorText)
      
      // Fallback/Mock for sandbox or missing keys
      return res.status(200).json({
        success: true,
        logs: [
          { id: 'mock_1', name: 'inquiry.created', createdAt: new Date().toISOString(), details: 'System Placeholder: Persona API not configured' },
        ],
        pagination: { next: null, prev: null }
      })
    }

    const inquiriesJson = await inquiriesRes.json()
    const eventsJson = await eventsRes.json()

    const rawInquiries = Array.isArray(inquiriesJson.data) ? inquiriesJson.data : [inquiriesJson.data].filter(Boolean)
    const rawEvents = eventsJson.data || []

    const sanitizedInquiries = rawInquiries.map((i: any) => ({
      id: i.id,
      name: `inquiry.${i.attributes.status}`,
      createdAt: i.attributes['created-at'],
      details: `Inquiry status changed to ${i.attributes.status}`,
      attributes: sanitizeAttributes(i.attributes)
    }))

    const sanitizedEvents = rawEvents.map((e: any) => {
      const sanitized = sanitizeEvent(e)
      const name = sanitized.attributes?.name || 'unknown_event'
      const createdAt = sanitized.attributes?.['created-at'] || new Date().toISOString()
      
      return {
        id: sanitized.id,
        name,
        createdAt,
        details: `Event: ${name}`,
        relatedId: sanitized.relatedId
      }
    })

    // Merge and sort
    const logs = [...sanitizedInquiries, ...sanitizedEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Pagination info from Persona usually comes in links or meta
    // Since we are merging two feeds, standard pagination is tricky. 
    // We'll prioritize the events pagination as it's the more high-volume audit source.
    const pagination = {
      next: eventsJson.meta?.['next-cursor'] || null,
      prev: eventsJson.meta?.['prev-cursor'] || null
    }

    return res.status(200).json({ success: true, logs, pagination })
  } catch (error: any) {
    logger.error('[Persona Audit Log API error]:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch audit logs',
    })
  }
}
