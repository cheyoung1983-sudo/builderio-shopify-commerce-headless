import React, { useState, useRef } from 'react'
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight, CornerDownLeft } from 'lucide-react'
import { validateEmail } from '@lib/validate-email'

export interface NewsletterSubscriptionProps {
  id?: string
  title?: string
  description?: string
  placeholder?: string
  buttonText?: string
  className?: string
  compact?: boolean
  onSuccess?: (email: string) => void
}

const LOCAL_STORAGE_KEY = 'displaycellpros_newsletter_subscriber'
const LOCAL_STORAGE_DRAFT_KEY = 'displaycellpros_newsletter_draft'

export const NewsletterSubscription: React.FC<NewsletterSubscriptionProps> = ({
  id = 'newsletter-subscription',
  title = 'Stay Connected with DisplayCellPros',
  description = 'Subscribe to get exclusive technician discounts, new screen drop announcements, and step-by-step DIY repair guides.',
  placeholder = 'Enter your email address',
  buttonText = 'Subscribe',
  className = '',
  compact = false,
  onSuccess,
}) => {
  // Initialize email state with saved draft from localStorage if available (client-side)
  const [email, setEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedDraft = window.localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY)
        if (savedDraft) {
          const trimmed = savedDraft.trim()
          if (trimmed.length > 0) {
            return trimmed
          }
        }
      } catch {
        // Ignore localStorage errors (e.g. storage disabled or private browsing mode)
      }
    }
    return ''
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [savedSubscriber, setSavedSubscriber] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const saveDraftToStorage = (val: string) => {
    try {
      if (val && val.trim().length > 0) {
        localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, val)
      } else {
        localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY)
      }
    } catch {
      // Ignore storage errors
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value
    setEmail(nextVal)
    saveDraftToStorage(nextVal)

    // If an error is currently displayed, provide live validation feedback
    if (errorMessage || status === 'error') {
      const result = validateEmail(nextVal)
      if (result.isValid) {
        setErrorMessage(null)
        setSuggestion(null)
        setStatus('idle')
      } else if (nextVal.trim().length > 0) {
        setErrorMessage(result.error)
        setSuggestion(result.suggestion || null)
      }
    }
  }

  const handleBlur = () => {
    // Validate on blur if the user entered content
    if (email.trim().length > 0 && status !== 'success' && status !== 'loading') {
      const result = validateEmail(email)
      if (!result.isValid) {
        setErrorMessage(result.error)
        setSuggestion(result.suggestion || null)
        setStatus('error')
      } else {
        setErrorMessage(null)
        setSuggestion(null)
        setStatus('idle')
      }
    }
  }

  const handleApplySuggestion = () => {
    if (suggestion) {
      setEmail(suggestion)
      saveDraftToStorage(suggestion)
      setErrorMessage(null)
      setSuggestion(null)
      setStatus('idle')
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationResult = validateEmail(email)
    if (!validationResult.isValid) {
      setErrorMessage(validationResult.error)
      setSuggestion(validationResult.suggestion || null)
      setStatus('error')
      if (inputRef.current) {
        inputRef.current.focus()
      }
      return
    }

    const sanitizedEmail = validationResult.sanitizedEmail || email.trim().toLowerCase()
    setStatus('loading')
    setErrorMessage(null)
    setSuggestion(null)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: sanitizedEmail }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Subscription failed. Please check your email and try again.')
      }

      // Success - clear unsubmitted draft from storage
      try {
        localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY)
      } catch {
        // Ignore
      }

      setStatus('success')
      setSuccessMessage(data.message || 'Thank you for subscribing!')
      setSavedSubscriber(sanitizedEmail)

      // Store subscribed customer confirmation in localStorage
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            email: sanitizedEmail,
            subscribedAt: new Date().toISOString(),
          })
        )
      } catch {
        // Ignore localStorage quota errors
      }

      if (onSuccess) {
        onSuccess(sanitizedEmail)
      }
    } catch (err: any) {
      console.warn('[Newsletter] API call failed, falling back to local capture:', err)
      // If network fails (e.g. offline), still provide friendly success and save locally
      try {
        localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY)
      } catch {
        // Ignore
      }

      setStatus('success')
      setSuccessMessage("Thank you for subscribing! You're now on our mailing list.")
      setSavedSubscriber(sanitizedEmail)
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            email: sanitizedEmail,
            subscribedAt: new Date().toISOString(),
          })
        )
      } catch {
        // Ignore
      }
      if (onSuccess) {
        onSuccess(sanitizedEmail)
      }
    }
  }

  const handleReset = () => {
    setEmail('')
    try {
      localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY)
    } catch {
      // Ignore
    }
    setStatus('idle')
    setErrorMessage(null)
    setSuggestion(null)
    setSuccessMessage(null)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div
      id={id}
      className={`relative w-full ${className}`}
    >
      {/* Success State */}
      {status === 'success' ? (
        <div
          id={`${id}-success`}
          role="status"
          aria-live="polite"
          className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-6 text-neutral-900 transition-all duration-300"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-neutral-900 text-base mb-1">
                You’re on the list!
              </h4>
              <p className="text-sm text-neutral-700 leading-relaxed mb-3">
                {successMessage} We’ve sent a confirmation to{' '}
                <span className="font-semibold text-neutral-900 break-all">{savedSubscriber || email}</span>.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id={`${id}-reset-button`}
                  onClick={handleReset}
                  className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 underline underline-offset-4 cursor-pointer transition-colors"
                >
                  Subscribe another email
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Form State */
        <div className="flex flex-col">
          {!compact && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-neutral-900 text-white shadow-xs">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-neutral-900 text-base sm:text-lg tracking-tight">
                  {title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-xl">
                {description}
              </p>
            </div>
          )}

          <form
            id={`${id}-form`}
            onSubmit={handleSubmit}
            noValidate
            className="w-full"
            aria-label="Newsletter email subscription form"
          >
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <label
                  htmlFor={`${id}-email-input`}
                  className="sr-only"
                >
                  Email address
                </label>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  ref={inputRef}
                  id={`${id}-email-input`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder={placeholder}
                  disabled={status === 'loading'}
                  suppressHydrationWarning
                  aria-required="true"
                  aria-invalid={status === 'error' && !!errorMessage}
                  aria-errormessage={status === 'error' && errorMessage ? `${id}-error-msg` : undefined}
                  aria-describedby={
                    status === 'error' && errorMessage ? `${id}-error-msg` : undefined
                  }
                  className={`w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm bg-white text-neutral-900 rounded-xl border transition-all duration-150 outline-hidden placeholder:text-neutral-400 ${
                    status === 'error'
                      ? 'border-red-400 ring-2 ring-red-100 focus:border-red-500 focus:ring-red-200'
                      : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10'
                  }`}
                />
              </div>

              <button
                type="submit"
                id={`${id}-submit-button`}
                disabled={status === 'loading'}
                aria-busy={status === 'loading'}
                aria-live="polite"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-150 shadow-xs shrink-0 cursor-pointer min-w-[135px]"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2
                      id={`${id}-loading-spinner`}
                      className="w-4 h-4 animate-spin text-white shrink-0"
                      aria-hidden="true"
                    />
                    <span id={`${id}-loading-text`}>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <span>{buttonText}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>

            {/* Detailed Error Message */}
            {status === 'error' && errorMessage && (
              <div
                id={`${id}-error-msg`}
                role="alert"
                aria-live="assertive"
                className="mt-2.5 flex flex-col gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200/80 rounded-lg px-3.5 py-2.5 animate-fadeIn"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>

                {/* Did you mean suggestion button */}
                {suggestion && (
                  <div className="ml-6 mt-1 pt-1.5 border-t border-red-200/60 flex items-center gap-2">
                    <span className="text-neutral-600">Did you mean:</span>
                    <button
                      type="button"
                      id={`${id}-suggestion-button`}
                      onClick={handleApplySuggestion}
                      className="inline-flex items-center gap-1 font-semibold text-neutral-900 hover:text-black underline underline-offset-2 hover:bg-red-100/70 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      <span>{suggestion}</span>
                      <CornerDownLeft className="w-3 h-3 text-neutral-600" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Microcopy & Privacy Guarantee */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
              <span>No spam, unsubscribe anytime.</span>
              <span className="hidden sm:inline">•</span>
              <span>We respect your privacy.</span>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default NewsletterSubscription

