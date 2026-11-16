import type { NextApiRequest, NextApiResponse } from 'next'
import { validateEmail } from '@lib/validate-email'
import { checkRateLimit } from '../../../lib/tribal/ratelimit.ts'

export interface NewsletterSubscribeResponse {
  success: boolean
  message: string
  email?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NewsletterSubscribeResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed. Please use POST.`,
    })
  }

  // Shared (Upstash when configured) per-IP limit so this public form can't be scripted.
  {
    const fwd = req.headers?.['x-forwarded-for']
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
    const limit = await checkRateLimit(`newsletter:${ip}`, 5, 3600)
    if (!limit.success) {
      res.setHeader('Retry-After', String(Math.max(1, limit.reset - Math.floor(Date.now() / 1000))))
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' })
    }
  }

  try {
    const { email } = req.body || {}

    const validationResult = validateEmail(email)
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.error || 'Please enter a valid email address.',
      })
    }

    const sanitizedEmail = validationResult.sanitizedEmail || String(email).trim().toLowerCase()

    // In a production store, you could push this to Klaviyo, Mailchimp, or Shopify Customer API.
    // For this storefront, we log the subscription securely and return confirmation.
    console.info(
      `[Newsletter] New subscriber captured: ${sanitizedEmail.slice(0, 3)}***@${sanitizedEmail.split('@')[1]}`
    )

    return res.status(200).json({
      success: true,
      message: 'You have been successfully subscribed to our newsletter!',
      email: sanitizedEmail,
    })
  } catch (error) {
    console.error('[Newsletter] Subscription error:', error)
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    })
  }
}

