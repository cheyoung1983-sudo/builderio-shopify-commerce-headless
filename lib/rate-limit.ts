import type { NextApiRequest, NextApiResponse } from 'next'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

/**
 * Simple in-memory rate limiter for API routes.
 * Note: This will reset on server restart and doesn't share state across instances.
 */
export async function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  limit: number = 60,
  windowMs: number = 60000
) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous'
  const key = `${ip}`
  const now = Date.now()

  if (!store[key] || now > store[key].resetTime) {
    store[key] = {
      count: 0,
      resetTime: now + windowMs
    }
  }

  store[key].count++

  res.setHeader('X-RateLimit-Limit', limit)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - store[key].count))
  res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString())

  if (store[key].count > limit) {
    return false
  }

  return true
}
