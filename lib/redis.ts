import { Redis } from '@upstash/redis'

// Initialize Redis client from environment variables
// Expects: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
export const redis = Redis.fromEnv()
