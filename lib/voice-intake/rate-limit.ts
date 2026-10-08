/**
 * Small in-memory sliding-window rate limiter.
 *
 * IMPORTANT: state lives in the memory of a single server instance. On
 * Vercel each serverless instance has its own counters and they reset on
 * cold start, so these limits are per instance, not global. They bound the
 * damage a leaked secret can do per instance; a shared store (Upstash/KV)
 * would be needed for exact global limits.
 */
import { createHash } from 'node:crypto'

export interface WindowLimiter {
  /** Records an attempt for `key` if allowed. Returns whether it was allowed. */
  consume(key: string): { allowed: boolean; remaining: number; retryAfterSeconds: number }
  /** Returns whether an attempt would be allowed, without recording it. */
  peek(key: string): boolean
  reset(): void
}

export function createWindowLimiter(options: {
  limit: number
  windowMs: number
  maxKeys?: number
  now?: () => number
}): WindowLimiter {
  const { limit, windowMs } = options
  const maxKeys = options.maxKeys ?? 10_000
  const now = options.now ?? (() => Date.now())
  const hits = new Map<string, number[]>()

  const prune = (key: string, t: number): number[] => {
    const list = (hits.get(key) || []).filter((ts) => t - ts < windowMs)
    if (list.length) hits.set(key, list)
    else hits.delete(key)
    return list
  }

  return {
    consume(key) {
      const t = now()
      const list = prune(key, t)
      if (list.length >= limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((list[0] + windowMs - t) / 1000))
        return { allowed: false, remaining: 0, retryAfterSeconds }
      }
      if (!hits.has(key) && hits.size >= maxKeys) {
        // Evict the oldest key so memory stays bounded.
        const oldest = hits.keys().next().value
        if (oldest !== undefined) hits.delete(oldest)
      }
      list.push(t)
      hits.set(key, list)
      return { allowed: true, remaining: limit - list.length, retryAfterSeconds: 0 }
    },
    peek(key) {
      return prune(key, now()).length < limit
    },
    reset() {
      hits.clear()
    },
  }
}

/** Hashes a key (e.g. a phone number) so raw PII isn't held as a map key. */
export function hashKey(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 32)
}
