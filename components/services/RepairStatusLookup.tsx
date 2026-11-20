'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { RepairStatusSummary } from '../../lib/repair-lookup'
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Mail,
  Lock,
} from 'lucide-react'

export interface RepairStatusLookupProps {
  initialRms?: string
  initialEmail?: string
  className?: string
  onTracked?: (record: RepairStatusSummary) => void
}

export interface RepairStageInfo {
  stage: number
  key: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export const REPAIR_STAGES: RepairStageInfo[] = [
  {
    stage: 1,
    key: 'kit_dispatched',
    label: 'Mailer Dispatched',
    description: '2.0 lb ESD foam mailer dispatched to your address',
    icon: Package,
  },
  {
    stage: 2,
    key: 'inbound_transit',
    label: 'Inbound Transit',
    description: 'Package scanned by courier and in transit to Spokane Cleanroom Facility',
    icon: Truck,
  },
  {
    stage: 3,
    key: 'bench_diagnostic',
    label: 'Intake & Bench Diagnostic',
    description: 'Hardware inspection, microsoldering/screen fitting, and OEM calibration',
    icon: Cpu,
  },
  {
    stage: 4,
    key: 'quality_testing',
    label: 'QC & Pressure Seal Testing',
    description: 'Water-resistance gasket test, display touch mapping, and battery charge cycling',
    icon: ShieldCheck,
  },
  {
    stage: 5,
    key: 'outbound_delivery',
    label: 'Outbound Priority Return',
    description: 'Device packaged with tamper seals and shipped via Priority Air return',
    icon: CheckCircle2,
  },
]


const NOT_FOUND_MESSAGE =
  'We could not find a repair matching that Repair Request ID and email. Please double-check both and try again.'

function formatUpdated(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

export const RepairStatusLookup: React.FC<RepairStatusLookupProps> = ({
  initialRms = '',
  initialEmail = '',
  className = '',
  onTracked,
}) => {
  const [rmsInput, setRmsInput] = useState<string>(initialRms)
  const [emailInput, setEmailInput] = useState<string>(initialEmail)
  const [record, setRecord] = useState<RepairStatusSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Update email if one is passed in after mount
  useEffect(() => {
    if (initialEmail && !emailInput) {
      const timer = setTimeout(() => setEmailInput(initialEmail), 0)
      return () => clearTimeout(timer)
    }
  }, [initialEmail, emailInput])

  const executeLookup = useCallback(
    async (rmsToSearch: string, emailToSearch: string) => {
      const cleanRms = rmsToSearch.trim().toUpperCase()
      const cleanEmail = emailToSearch.trim().toLowerCase()
      if (!cleanRms || !cleanEmail) {
        setErrorMessage('Please enter both your Repair Request ID and your email address.')
        return
      }
      setLoading(true)
      setErrorMessage('')
      try {
        const response = await fetch('/api/repair-requests/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rms: cleanRms, email: cleanEmail }),
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.success && data.record) {
          setRecord(data.record)
          onTracked?.(data.record)
        } else {
          setRecord(null)
          setErrorMessage(
            response.status === 429
              ? 'Too many lookups. Please wait a minute and try again.'
              : NOT_FOUND_MESSAGE
          )
        }
      } catch {
        setRecord(null)
        setErrorMessage('Could not connect to repair tracking server. Please check your network connection.')
      } finally {
        setLoading(false)
      }
    },
    [onTracked]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeLookup(rmsInput, emailInput)
  }

  const stageIndex = record ? Math.max(1, REPAIR_STAGES.findIndex((st) => st.key === record.status) + 1) : 1
  const updated = formatUpdated(record?.updatedAt)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dual Factor Lookup Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Search className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                Secure Repair Status Lookup
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Enter your Repair Request ID (RMS#) and contact email to view verified diagnostic telemetry
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dual-Factor Verified</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 1: Repair Request ID */}
            <div>
              <label
                htmlFor="lookup-rms-input"
                className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5"
              >
                Repair Request ID (RMS#) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="lookup-rms-input"
                  type="text"
                  required
                  placeholder="e.g. DCP-RMS-000000"
                  value={rmsInput}
                  onChange={(e) => setRmsInput(e.target.value.toUpperCase())}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-mono bg-neutral-50/80 hover:bg-white focus:bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors uppercase"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none">
                  #
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Found on your order confirmation email or packing slip receipt
              </p>
            </div>

            {/* Field 2: Email Address */}
            <div>
              <label
                htmlFor="lookup-email-input"
                className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5"
              >
                Intake Email Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="lookup-email-input"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-neutral-50/80 hover:bg-white focus:bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Matches the customer email submitted during mail-in intake
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div
              id="lookup-error-banner"
              className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Verification Notice</p>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Submit Button & Demo Helper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span />

            <button
              id="lookup-submit-btn"
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Repair Progress</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {record && (
        <div id="verified-repair-details" className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-neutral-700">{record.rmsNumber}</span>
              <h3 className="text-lg font-bold text-neutral-900">{record.deviceModel}</h3>
            </div>
            <div className="text-xs text-neutral-600 space-y-1 sm:text-right">
              {updated && <p>Last update: {updated}</p>}
              {record.estimatedCompletion && (
                <p className="inline-flex items-center gap-1.5 text-emerald-800">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Estimated completion: {record.estimatedCompletion}</span>
                </p>
              )}
            </div>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {REPAIR_STAGES.map((st) => {
              const Icon = st.icon
              const isCurrent = st.stage === stageIndex
              const isDone = st.stage < stageIndex
              return (
                <li
                  key={st.key}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`p-3.5 rounded-xl border ${
                    isCurrent
                      ? 'border-emerald-600 bg-emerald-50/70'
                      : isDone
                      ? 'border-neutral-200 bg-neutral-50'
                      : 'border-neutral-200/60 bg-white text-neutral-500'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1.5 text-emerald-700" />
                  <p className="text-xs font-bold text-neutral-900">{st.label}</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">{st.description}</p>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

export default RepairStatusLookup
