import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react'

export interface LoggedErrorDetails {
  eventId: string
  name: string
  message: string
  stack?: string
  componentStack?: string
  timestamp: string
  url?: string
}

/**
 * Mock implementation to log client-side errors to a console or central logging service
 * for observability (e.g. Sentry, Datadog, CloudWatch, or custom log API).
 */
export const logErrorToService = (
  error: Error,
  errorInfo: ErrorInfo,
  metadata?: Record<string, any>
): string => {
  const timestamp = new Date().toISOString()
  const eventId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  const errorPayload: LoggedErrorDetails = {
    eventId,
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack,
    componentStack: errorInfo?.componentStack || undefined,
    timestamp,
    url: currentUrl,
  }

  // 1. Structured console output for local observability
  if (typeof console !== 'undefined') {
    console.group?.(`[Observability Service] Error Incident ${eventId}`)
    console.error('Message:', errorPayload.message)
    console.error('Stack:', errorPayload.stack)
    if (errorPayload.componentStack) {
      console.error('Component Stack:', errorPayload.componentStack)
    }
    if (metadata) {
      console.info('Context Metadata:', metadata)
    }
    console.groupEnd?.()
  }

  // 2. Mock network dispatch to central observability API
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    try {
      fetch('/api/observability/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...errorPayload,
          metadata,
        }),
      }).catch((err) => {
        // Mock logging service fallback
        console.warn('[Observability Service] Mock service dispatch fallback:', err)
      })
    } catch {
      // Ignore network transport failures during error logging
    }
  }

  return eventId
}

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void, eventId?: string) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo, eventId: string) => void
  name?: string
  boundaryName?: string
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  eventId?: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      eventId: undefined,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const boundaryName = this.props.boundaryName || this.props.name || 'MainApplication'

    // Dispatch error to mock central logging service
    const eventId = logErrorToService(error, errorInfo, {
      boundary: boundaryName,
    })

    this.setState({ eventId })

    if (this.props.onError) {
      this.props.onError(error, errorInfo, eventId)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      eventId: undefined,
    })
  }

  render(): ReactNode {
    const { hasError, error, eventId } = this.state
    const { children, fallback } = this.props

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.handleReset, eventId)
      }

      if (fallback) {
        return fallback
      }

      return (
        <section
          id="main-error-boundary"
          role="alert"
          aria-live="assertive"
          className="min-h-[450px] w-full flex items-center justify-center p-6 sm:p-12 my-6"
        >
          <div
            id="main-error-boundary-card"
            className="w-full max-w-lg bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-6 sm:p-8 text-center"
          >
            <div
              id="main-error-icon"
              className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600"
            >
              <AlertTriangle className="w-7 h-7" aria-hidden="true" />
            </div>

            <h2
              id="main-error-title"
              className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 mb-2"
            >
              Application Error
            </h2>

            <p
              id="main-error-message"
              className="text-sm text-neutral-600 leading-relaxed mb-4"
            >
              An unexpected error occurred in the application. The error has been
              automatically captured and logged for investigation.
            </p>

            {eventId && (
              <div
                id="main-error-incident-id"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-100 text-xs font-mono text-neutral-700 mb-6"
              >
                <span className="text-neutral-500">Incident ID:</span>
                <span>{eventId}</span>
              </div>
            )}

            <div
              id="main-error-actions"
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
            >
              <button
                id="main-error-try-again-btn"
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                id="main-error-reload-btn"
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload()
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-sm font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </section>
      )
    }

    return children
  }
}

export default ErrorBoundary
