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
 * Wraps an async operation with Sentry performance span / transaction monitoring
 * to track latency for external API calls (e.g., identity verification & Shopify GraphQL).
 */
export async function traceSentryOperation<T>(
  opName: string,
  description: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now()

  // If Sentry is active, start a span/transaction
  const transaction = Sentry.startTransaction
    ? Sentry.startTransaction({ op: opName, name: description })
    : null

  try {
    const result = await operation()
    const duration = Date.now() - start
    
    if (transaction) {
      transaction.setStatus('ok')
      transaction.finish()
    }

    // Log latency metric for monitoring dashboards
    if (duration > 1000) {
      console.warn(`[Sentry Performance Warning] Slow operation "${opName}" (${description}) took ${duration}ms`)
    }

    return result
  } catch (err: any) {
    const duration = Date.now() - start
    if (transaction) {
      transaction.setStatus('internal_error')
      transaction.finish()
    }
    Sentry.captureException(err)
    console.error(`[Sentry Error] Operation "${opName}" failed after ${duration}ms:`, err)
    throw err
  }
}
