import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    let payload = req.body
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch {
        payload = { message: payload }
      }
    }

    const {
      eventId = `err_${Date.now().toString(36)}`,
      name = 'ClientError',
      message = 'Unspecified client error',
      stack,
      componentStack,
      url,
      userAgent,
      timestamp = new Date().toISOString(),
      metadata,
    } = payload || {}

    // Structured observability log output
    const structuredEntry = {
      timestamp,
      severity: 'ERROR',
      serviceContext: {
        service: 'displaycellpros-frontend',
      },
      eventId,
      error: {
        name,
        message,
        stack,
        componentStack,
      },
      httpRequest: {
        requestUrl: url,
        userAgent,
      },
      metadata,
    }

    // Server-side logging for Cloud Run / central log aggregators
    console.error(`[CLIENT-ERROR-OBSERVABILITY] EventID: ${eventId} | ${name}: ${message} | URL: ${url || 'N/A'}`)
    if (stack) {
      console.error(`[CLIENT-ERROR-STACK] ${stack}`)
    }
    if (componentStack) {
      console.error(`[CLIENT-ERROR-COMPONENT-STACK] ${componentStack}`)
    }

    return res.status(200).json({
      ok: true,
      eventId,
      loggedAt: new Date().toISOString(),
      entry: process.env.NODE_ENV !== 'production' ? structuredEntry : undefined,
    })
  } catch (err: any) {
    console.error('[CLIENT-ERROR-LOG-HANDLER-FAILED]', err)
    return res.status(500).json({
      ok: false,
      error: 'Failed to record observability log',
    })
  }
}
