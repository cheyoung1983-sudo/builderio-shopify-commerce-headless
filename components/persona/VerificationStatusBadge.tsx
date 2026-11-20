import React from 'react'
import { CheckCircle2, AlertCircle, Clock, XCircle, RefreshCw } from 'lucide-react'

export type VerificationStatusType = 'passed' | 'requires_retry' | 'submitted' | 'initiated' | 'failed' | 'pending' | 'approved' | 'declined'

export interface VerificationStatusBadgeProps {
  status: VerificationStatusType
  label?: string
  className?: string
}

export function VerificationStatusBadge({ status, label, className = '' }: VerificationStatusBadgeProps) {
  const normalized = status.toLowerCase()

  switch (normalized) {
    case 'passed':
    case 'approved':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{label || 'Passed / Verified'}</span>
        </span>
      )
    case 'requires_retry':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}>
          <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-spin-slow" />
          <span>{label || 'Requires Retry'}</span>
        </span>
      )
    case 'submitted':
    case 'initiated':
    case 'pending':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{label || 'In Progress'}</span>
        </span>
      )
    case 'failed':
    case 'declined':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200 ${className}`}>
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>{label || 'Failed / Declined'}</span>
        </span>
      )
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 ${className}`}>
          <AlertCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span>{label || status}</span>
        </span>
      )
  }
}

export default VerificationStatusBadge
