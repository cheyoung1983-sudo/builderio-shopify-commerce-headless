import type { NextApiRequest, NextApiResponse } from 'next'
import { getGeminiClient } from '../../../lib/gemini'
import { searchStorefrontProducts, fetchAllAvailableProducts } from '../../../services/shopify'
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

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' })
  }

  try {
    const rawMessage = req.body?.message || req.body?.prompt || req.body?.query || ''
    const message = readBoundedString(rawMessage, { maxLength: 1000 })

    if (!message) {
      return res.status(400).json({ ok: false, error: 'Message cannot be empty.' })
    }

    // Retrieve relevant product catalog data for grounding
    let catalogContext = ''
    try {
      const searchRes = await searchStorefrontProducts(message, {
        maxProducts: 6,
        batchSize: 10,
        onlyAvailable: true,
      })
      const products = searchRes.products || []
      if (products.length > 0) {
        catalogContext = products
          .map((p) => {
            const price = p.priceRange?.minVariantPrice?.amount || '0.00'
            const cur = p.priceRange?.minVariantPrice?.currencyCode || 'USD'
            return `Product: ${p.title} | Handle: ${p.handle} | Price: ${cur} ${price} | In Stock: ${p.availableForSale}`
          })
          .join('\n')
      }
    } catch {
      // Fallback if catalog query fails
    }

    const ai = getGeminiClient()

    const prompt = `You are the expert Technical Repair & Parts Specialist for Display Cell Pros in Spokane, WA.
You help customers find smartphone screen replacements (iPhone, Samsung Galaxy, Google Pixel, etc.), repair services, warranties, and technical assistance.

${catalogContext ? `Current Catalog Matches in Store:\n${catalogContext}\n` : ''}

Customer question: "${message}"

Provide a friendly, helpful, professional, and concise response. Recommend specific products or repair options if available in the catalog. Mention our Spokane, WA shop and prompt customer if they'd like help checking out or booking a repair.`

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are Display Cell Pros AI Store Assistant. Keep responses concise, accurate, helpful, and natural.',
      },
    })

    const replyText = response.text || "Thank you for reaching out! We're here to help with all your screen replacements and repair parts at Display Cell Pros."

    return res.status(200).json({
      ok: true,
      reply: replyText,
    })
  } catch (error: any) {
    console.error('[API /api/agent/gemini-chat] Error generating AI response:', error)
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to process AI response',
    })
  }
}
