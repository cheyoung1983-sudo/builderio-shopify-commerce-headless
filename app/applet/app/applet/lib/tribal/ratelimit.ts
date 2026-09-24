import { Redis } from '@upstash/redis'

// Initialize Upstash Redis client if credentials are provided in environment variables
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

let redisClient: Redis | null = null
if (redisUrl && redisToken) {
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    })
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis client, falling back to in-memory rate limiter:', err)
  }
}

// Fallback in-memory store for rate limiting when Redis is not configured
const inMemoryStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Rate-limiting middleware helper using Upstash Redis with robust in-memory fallback.
 * Limits verification attempts to prevent brute-force attacks on /api/tribal/verify.
 */
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const key = `ratelimit:verify:${identifier}`

  // Try Upstash Redis if available
  if (redisClient) {
    try {
      const multi = redisClient.multi()
      multi.incr(key)
      multi.pttl(key)
      const results = await multi.exec()
      
      const count = Number(results[0]) || 1
      let pttl = Number(results[1])

      if (pttl === -1 || pttl === -2) {
        await redisClient.pexpire(key, windowMs)
        pttl = windowMs
      }

      const reset = Math.ceil((now + pttl) / 1000)
      const remaining = Math.max(0, maxAttempts - count)

      return {
        success: count <= maxAttempts,
        limit: maxAttempts,
        remaining,
        reset,
      }
    } catch (err) {
      console.error('Upstash Redis rate limit error, falling back to memory:', err)
    }
  }

  // In-memory sliding window fallback
  let record = inMemoryStore.get(key)
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    }
    inMemoryStore.set(key, record)
  }

  record.count += 1
  const remaining = Math.max(0, maxAttempts - record.count)
  const reset = Math.ceil(record.resetTime / 1000)

  return {
    success: record.count <= maxAttempts,
    limit: maxAttempts,
    remaining,
    reset,
  }
}
