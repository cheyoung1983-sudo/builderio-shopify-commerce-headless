import type { NextApiRequest, NextApiResponse } from 'next'
import builderConfig from '../../../config/builder'

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use GET or POST.',
    })
  }

  try {
    const rawModel =
      req.method === 'POST'
        ? req.body?.model ?? req.query?.model
        : req.query?.model

    const rawQuery =
      req.method === 'POST'
        ? req.body?.query ?? req.query?.query
        : req.query?.query

    const model = typeof rawModel === 'string' && rawModel.trim() ? rawModel.trim() : 'page'
    const query = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 120) : ''

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
      return res.status(response.status).json({
        ok: false,
        error: `Builder.io API returned HTTP ${response.status}`,
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
