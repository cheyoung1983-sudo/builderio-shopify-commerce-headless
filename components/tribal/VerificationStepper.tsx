'use client'

import React from 'react'
import {
  Check,
  Loader2,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
} from 'lucide-react'

export type VerificationStepStatus = 'SUBMITTED' | 'PROCESSING' | 'VERIFIED' | 'FAILED' | 'NOT_STARTED' | string

export interface VerificationStepperProps {
  currentStatus: VerificationStepStatus
  submittedAt?: string
  processedAt?: string
  verifiedAt?: string
  tribalNation?: string
  rejectionReason?: string
  className?: string
  onActionClick?: () => void
  actionLabel?: string
}

interface StepItem {
  id: 'submitted' | 'processing' | 'verified'
  title: string
  description: string
  icon: React.ReactNode
  timestamp?: string
}

export function VerificationStepper({
  currentStatus,
  submittedAt,
  processedAt,
  verifiedAt,
  tribalNation,
  rejectionReason,
  className = '',
  onActionClick,
  actionLabel,
}: VerificationStepperProps) {
  const normStatus = (currentStatus || 'NOT_STARTED').toUpperCase()
  const isVerified = normStatus === 'VERIFIED' || normStatus === 'EXEMPT_ACTIVE'
  const isProcessing = normStatus === 'PROCESSING' || normStatus === 'IN_REVIEW'
  const isSubmitted = normStatus === 'SUBMITTED' || normStatus === 'PENDING' || isProcessing || isVerified
  const isFailed = normStatus === 'FAILED' || normStatus === 'REJECTED' || normStatus === 'REVOKED'

  // Determine stage states: 'completed' | 'current' | 'upcoming' | 'failed'
  const getStepState = (stepId: 'submitted' | 'processing' | 'verified'): 'completed' | 'current' | 'upcoming' | 'failed' => {
    if (isFailed && (stepId === 'processing' || (stepId === 'verified' && !isVerified))) {
      return 'failed'
    }

    if (stepId === 'submitted') {
      if (isVerified || isProcessing || normStatus === 'SUBMITTED') return 'completed'
      if (normStatus === 'PENDING') return 'current'
      return 'upcoming'
    }

    if (stepId === 'processing') {
      if (isVerified) return 'completed'
      if (isProcessing || normStatus === 'SUBMITTED' || normStatus === 'PENDING') return 'current'
      return 'upcoming'
    }

    if (stepId === 'verified') {
      if (isVerified) return 'completed'
      return 'upcoming'
    }

    return 'upcoming'
  }

  const steps: StepItem[] = [
    {
      id: 'submitted',
      title: 'Submitted',
      description: tribalNation ? `Enrollment data submitted for ${tribalNation}` : 'Enrollment info & tribal census details submitted',
      icon: <FileText className="w-4 h-4" />,
      timestamp: submittedAt || (isSubmitted ? 'Submitted' : undefined),
    },
    {
      id: 'processing',
      title: 'Processing',
      description: 'Checking SheerID registry & Census Bureau AIANA reservation boundaries',
      icon: isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />,
      timestamp: processedAt || (isProcessing ? 'In Progress' : isVerified ? 'Completed' : undefined),
    },
    {
      id: 'verified',
      title: 'Verified',
      description: '20% member discount & on-reservation tax exemption active in Shopify',
      icon: <ShieldCheck className="w-4 h-4" />,
      timestamp: verifiedAt ? new Date(verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (isVerified ? 'Active' : undefined),
    },
  ]

  // Calculate overall progress percentage for the bar
  let progressPercent = 0
  if (isVerified) {
    progressPercent = 100
  } else if (isProcessing || normStatus === 'SUBMITTED') {
    progressPercent = 50
  } else if (normStatus === 'PENDING') {
    progressPercent = 15
  }

  return (
    <div className={`bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            Verification Progress
            {isVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 normal-case">
                <Check className="w-3 h-3" /> Complete
              </span>
            )}
            {isProcessing && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 normal-case">
                <Loader2 className="w-3 h-3 animate-spin" /> Processing
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 normal-case">
                <AlertCircle className="w-3 h-3" /> Action Needed
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Track your tribal membership review and automated Shopify tax exemption status.
          </p>
        </div>

        {onActionClick && actionLabel && (
          <button
            type="button"
            onClick={onActionClick}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline self-start sm:self-auto"
          >
            {actionLabel}
          </button>
        )}
      </div>

      {/* Visual Stepper Bar & Points */}
      <div className="relative">
        {/* Background Track Line */}
        <div className="hidden sm:block absolute top-5 left-8 right-8 h-1 bg-slate-200 rounded-full z-0" />
        
        {/* Active Progress Fill Line */}
        <div
          className="hidden sm:block absolute top-5 left-8 h-1 bg-indigo-600 rounded-full z-0 transition-all duration-500"
          style={{ width: `calc(${progressPercent}% * 0.85)` }}
        />

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 relative z-10">
          {steps.map((step, idx) => {
            const state = getStepState(step.id)

            return (
              <div key={step.id} className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-3.5 sm:gap-2">
                {/* Step Node Icon Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-sm ${
                    state === 'completed'
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : state === 'current'
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : state === 'failed'
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {state === 'completed' ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step Text Info */}
                <div className="flex-1 sm:w-full">
                  <div className="flex sm:justify-center items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:block hidden">
                      Step {idx + 1}
                    </span>
                    <h4
                      className={`text-xs font-bold ${
                        state === 'completed'
                          ? 'text-emerald-950'
                          : state === 'current'
                          ? 'text-indigo-950'
                          : state === 'failed'
                          ? 'text-rose-950'
                          : 'text-slate-600'
                      }`}
                    >
                      {step.title}
                    </h4>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5 sm:max-w-[180px] sm:mx-auto">
                    {step.description}
                  </p>

                  {step.timestamp && (
                    <span className="inline-block text-[10px] font-mono text-slate-400 mt-1 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                      {step.timestamp}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Failure Context Alert */}
      {isFailed && rejectionReason && (
        <div className="mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Verification Notice: </span>
            {rejectionReason}
          </div>
        </div>
      )}
    </div>
  )
}

export default VerificationStepper
