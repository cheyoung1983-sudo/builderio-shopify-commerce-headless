import type { NextApiRequest, NextApiResponse } from 'next'
import builderConfig from '../../../config/builder'
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
} from '../../../lib/api-security'

const allowedOrigins = ['https://displaycellpros.com', 'https://www.displaycellpros.com']
const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

function hasOwn(value: unknown, key: string): boolean {
  return typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, key)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = {
    allowedOrigins,
    allowLocalhost: true,
    allowRunApp: true,
  }
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) {
    return
  }

  if (!rateLimiter.check(getClientKey(req)).allowed) {
    const result = rateLimiter.check(getClientKey(req))
    res.setHeader('Retry-After', String(result.retryAfterSeconds))
    return res.status(429).json({ ok: false, error: 'Too many requests' })
  }

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use GET or POST.',
    })
  }

  try {
    const body = req.method === 'POST' ? req.body : undefined
    if (
      req.method === 'POST' &&
      body !== undefined &&
      (body === null || typeof body !== 'object' || Array.isArray(body))
    ) {
      return res.status(400).json({ ok: false, error: 'Invalid request body', results: [] })
    }

    const rawModel =
      req.method === 'POST'
        ? hasOwn(body, 'model')
          ? (body as any).model
          : req.query?.model
        : req.query?.model

    const rawQuery =
      req.method === 'POST'
        ? hasOwn(body, 'query')
          ? (body as any).query
          : req.query?.query
        : req.query?.query

    const model =
      rawModel === undefined
        ? 'page'
        : readBoundedString(rawModel, { maxLength: 100, truncate: false })
    const query =
      rawQuery === undefined
        ? ''
        : readBoundedString(rawQuery, { maxLength: 120, truncate: false })

    if (!model || query === undefined) {
      return res.status(400).json({ ok: false, error: 'Invalid model or query', results: [] })
    }

    const apiKey = builderConfig.apiKey || process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY

    if (!apiKey) {
      return res.status(200).json({
        ok: false,
        warning: 'BUILDER_PUBLIC_KEY is not configured yet in environment.',
        model,
        results: [],
      })
    }

    const endpointUrl = new URL(`https://cdn.builder.io/api/v3/content/${encodeURIComponent(model)}`)
    endpointUrl.searchParams.set('apiKey', apiKey)
    endpointUrl.searchParams.set('limit', '5')
    endpointUrl.searchParams.set('cachebust', 'true')

    if (query) {
      endpointUrl.searchParams.set('query.name.$regex', escapeRegex(query))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    let response: Response
    try {
      response = await fetch(endpointUrl.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      console.error('[API /api/agent/content] Builder upstream returned', response.status)
      return res.status(502).json({
        ok: false,
        error: 'Failed to fetch Builder content',
        results: [],
      })
    }

    const data = await response.json()
    const results = (data.results || []).map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      published: entry.published,
      lastUpdated: entry.lastUpdated,
      data: entry.data,
    }))

    return res.status(200).json({
      ok: true,
      model,
      count: results.length,
      results,
    })
  } catch (error) {
    console.error('[API /api/agent/content] Error fetching Builder content:', error)
    return res.status(502).json({
      ok: false,
      error: 'Failed to fetch Builder content',
      results: [],
    })
  }
}
