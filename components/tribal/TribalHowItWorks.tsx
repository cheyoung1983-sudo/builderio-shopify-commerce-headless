import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import {
  getTribalSteps,
  TRIBAL_ELIGIBILITY_LINE,
  TRIBAL_MANUAL_MESSAGE,
  type TribalVerificationMode,
} from '../../lib/tribal/verification-copy'

export interface TribalHowItWorksProps {
  /** Passed down from getServerSideProps (see lib/tribal/verification-mode.ts). */
  mode: TribalVerificationMode
  /** 'full' for the /tribal-discount page, 'compact' for cards. Default 'full'. */
  variant?: 'compact' | 'full'
  /** Heading level to keep the page outline in order. Defaults: full = 2, compact = 3. */
  headingLevel?: 2 | 3 | 4
  className?: string
  /** Unique id prefix when more than one instance is on a page. */
  idPrefix?: string
}

/**
 * Read-only explanation of the verification steps. It has no inputs: the form
 * itself lives in TribalVerificationModal, opened from TribalVerifyCta.
 */
export function TribalHowItWorks({
  mode,
  variant = 'full',
  headingLevel,
  className = '',
  idPrefix = 'tribal-how',
}: TribalHowItWorksProps) {
  const steps = getTribalSteps(mode)
  const level = headingLevel ?? (variant === 'full' ? 2 : 3)
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4'
  const headingId = `${idPrefix}-heading`
  const compact = variant === 'compact'

  return (
    <section
      aria-labelledby={headingId}
      className={className}
      data-testid="tribal-how-it-works"
      data-mode={mode}
      data-variant={variant}
    >
      <Heading
        id={headingId}
        className={compact ? 'text-sm font-bold text-neutral-900' : 'text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900'}
      >
        How verification works
      </Heading>
      <p className={`${compact ? 'text-xs' : 'text-sm sm:text-base'} mt-1 text-neutral-700`}>{TRIBAL_ELIGIBILITY_LINE}</p>

      {steps.length === 0 ? (
        <p
          className={`${compact ? 'text-xs' : 'text-sm'} mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950`}
          data-testid="tribal-manual-message"
        >
          {TRIBAL_MANUAL_MESSAGE}
        </p>
      ) : (
        <ol className={`${compact ? 'mt-3 space-y-2' : 'mt-5 space-y-4'}`}>
          {steps.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`${
                  compact ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm'
                } shrink-0 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center`}
              >
                {index + 1}
              </span>
              <div>
                <p className={`${compact ? 'text-xs' : 'text-sm sm:text-base'} font-semibold text-neutral-900`}>
                  <span className="sr-only">{`Step ${index + 1}: `}</span>
                  {step.title}
                </p>
                {!compact && <p className="mt-0.5 text-sm text-neutral-700 leading-relaxed">{step.detail}</p>}
              </div>
              {index === steps.length - 1 && <CheckCircle2 aria-hidden="true" className="ml-auto h-5 w-5 shrink-0 text-emerald-600" />}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default TribalHowItWorks
