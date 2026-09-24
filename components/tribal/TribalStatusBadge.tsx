'use client'

import React from 'react'
import { ShieldCheck, Tag, MapPin, CheckCircle2 } from 'lucide-react'

interface TribalStatusBadgeProps {
  isVerified?: boolean
  discountActive?: boolean
  taxExempt?: boolean
  reservationName?: string
  isSelfAdministered?: boolean
  tribalTaxRate?: number
  compact?: boolean
  onClick?: () => void
}

export function TribalStatusBadge({
  isVerified = false,
  discountActive = false,
  taxExempt = false,
  reservationName,
  isSelfAdministered = false,
  tribalTaxRate,
  compact = false,
  onClick,
}: TribalStatusBadgeProps) {
  if (!isVerified && !discountActive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
        Tribal Member 20% Discount & Tax Exemption
      </button>
    )
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>Tribal Verified (20% Off{taxExempt ? ' + Tax Exempt' : ''})</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2 text-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              Enrolled Tribal Member Active
            </h4>
            <p className="text-xs text-emerald-700">Dual-Track Discount & Exemption Active</p>
          </div>
        </div>
        {onClick && (
          <button
            type="button"
            onClick={onClick}
            className="text-[11px] font-semibold text-emerald-800 hover:underline"
          >
            Manage
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60 text-xs">
        {/* Track 1: Commercial Discount */}
        <div className="flex items-start gap-1.5 bg-white/70 p-2 rounded-lg border border-emerald-100">
          <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">Track 1: 20% Discount</span>
            <p className="text-[11px] text-slate-600">Applied automatically at checkout</p>
          </div>
        </div>

        {/* Track 2: Statutory Tax Exemption */}
        <div className="flex items-start gap-1.5 bg-white/70 p-2 rounded-lg border border-emerald-100">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">
              Track 2: {taxExempt ? 'Tax Exempt (On-Res)' : 'Off-Reservation Tax'}
            </span>
            <p className="text-[11px] text-slate-600">
              {taxExempt
                ? isSelfAdministered
                  ? `Self-administered tribal tax (${((tribalTaxRate || 0) * 100).toFixed(1)}%)`
                  : 'Full state sales tax exempt (Entity Use Code C)'
                : 'Standard state tax (destination)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
