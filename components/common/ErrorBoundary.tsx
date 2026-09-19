import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { logClientError } from '@lib/observability'

export interface ErrorBoundaryProps {
  children: React.ReactNode
  /**
   * Optional custom fallback component or render function
   */
  fallback?:
    | ReactNode
    | ((error: Error, reset: () => void, eventId?: string) => ReactNode)
  /**
   * Optional callback triggered when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo, eventId: string) => void
  /**
   * Optional identifier for the boundary region (e.g. "root-layout", "page-content")
   */
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
    const boundaryName = this.props.boundaryName || 'root-application-layout'

    // Dispatch error to the central observability service
    logClientError(error, errorInfo, {
      boundaryName,
    })
      .then((eventId) => {
        this.setState({ eventId })
        if (this.props.onError) {
          this.props.onError(error, errorInfo, eventId)
        }
      })
      .catch((logErr) => {
        console.warn('[ErrorBoundary] Failed to log error to central service:', logErr)
      })
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
          id="app-error-boundary-container"
          role="alert"
          aria-live="assertive"
          className="min-h-[500px] w-full flex items-center justify-center p-6 md:p-12 bg-neutral-50/70"
        >
          <div
            id="app-error-boundary-card"
            className="w-full max-w-lg bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-6 sm:p-8 text-center"
          >
            <div
              id="app-error-icon-wrapper"
              className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600"
            >
              <AlertTriangle className="w-7 h-7" aria-hidden="true" />
            </div>

            <h2
              id="app-error-heading"
              className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 mb-2"
            >
              Something went wrong
            </h2>

            <p
              id="app-error-description"
              className="text-sm text-neutral-600 leading-relaxed mb-6"
            >
              An unexpected error occurred while rendering this view. Our team has
              been automatically notified via our central observability service.
            </p>

            {eventId && (
              <div
                id="app-error-reference-badge"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200/80 text-xs font-mono text-neutral-700 mb-6 max-w-full overflow-hidden text-ellipsis"
              >
                <span className="font-semibold text-neutral-500">Ref ID:</span>
                <span>{eventId}</span>
              </div>
            )}

            <div
              id="app-error-actions"
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
            >
              <button
                id="app-error-try-again-button"
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium transition-colors shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                id="app-error-reload-button"
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload()
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-sm font-medium transition-colors cursor-pointer"
              >
                <span>Reload Page</span>
              </button>

              <a
                id="app-error-home-link"
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 text-sm font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </a>
            </div>
          </div>
        </section>
      )
    }

    return children
  }
}

export default ErrorBoundary
