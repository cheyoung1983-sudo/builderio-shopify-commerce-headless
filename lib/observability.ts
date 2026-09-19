import type { ErrorInfo } from 'react'

export interface ClientErrorPayload {
  eventId: string
  message: string
  name?: string
  stack?: string
  componentStack?: string
  url?: string
  userAgent?: string
  timestamp: string
  metadata?: Record<string, any>
}

/**
 * Generates a unique incident/event ID for tracing client-side errors
 */
export function generateEventId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `err_${timestamp}_${random}`
}

/**
 * Logs a client-side error to the central observability service (/api/observability/log)
 */
export async function logClientError(
  error: Error | string,
  errorInfo?: ErrorInfo | null,
  metadata?: Record<string, any>
): Promise<string> {
  const eventId = generateEventId()
  const errorObj = typeof error === 'string' ? new Error(error) : error

  const payload: ClientErrorPayload = {
    eventId,
    message: errorObj?.message || String(error),
    name: errorObj?.name || 'Error',
    stack: errorObj?.stack,
    componentStack: errorInfo?.componentStack || undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
    metadata,
  }

  // Local console log for development debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Observability] Client error recorded (${eventId}):`, errorObj, errorInfo)
  }

  // Error reporting to central service
  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(payload)

      // Use navigator.sendBeacon when available for non-blocking transport
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([serialized], { type: 'application/json' })
        const queued = navigator.sendBeacon('/api/observability/log', blob)
        if (queued) {
          return eventId
        }
      }

      // Fallback to fetch with keepalive
      await fetch('/api/observability/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: serialized,
        keepalive: true,
      })
    } catch (sendError) {
      // Telemetry failures should never crash or interfere with app execution
      console.warn('[Observability] Failed to forward error to central log endpoint:', sendError)
    }
  }

  return eventId
}
