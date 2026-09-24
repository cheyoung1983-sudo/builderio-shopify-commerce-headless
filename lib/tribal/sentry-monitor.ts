import * as Sentry from '@sentry/node'

// Initialize Sentry if DSN is configured
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
if (sentryDsn && !Sentry.getClient()) {
  try {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'production',
    })
  } catch (err) {
    console.warn('Failed to initialize Sentry node client:', err)
  }
}

/**
 * Wraps an async operation with Sentry performance span tracing
 * to track latency for external API calls (e.g., identity verification & Shopify GraphQL).
 */
export async function traceSentryOperation<T>(
  opName: string,
  description: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now()

  if (typeof Sentry.startSpan === 'function') {
    return Sentry.startSpan({ op: opName, name: description }, async () => {
      try {
        const result = await operation()
        const duration = Date.now() - start
        if (duration > 1000) {
          console.warn(`[Sentry Performance Warning] Slow operation "${opName}" (${description}) took ${duration}ms`)
        }
        return result
      } catch (err: any) {
        Sentry.captureException(err)
        throw err
      }
    })
  }

  try {
    const result = await operation()
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn(`[Sentry Performance Warning] Slow operation "${opName}" (${description}) took ${duration}ms`)
    }
    return result
  } catch (err: any) {
    Sentry.captureException(err)
    throw err
  }
}
