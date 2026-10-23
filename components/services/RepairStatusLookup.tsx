'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Wrench,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Sparkles,
  Printer,
  Copy,
  Check,
  ExternalLink,
  ZoomIn,
  X,
  RefreshCw,
  Mail,
  Smartphone,
  MapPin,
  Lock,
} from 'lucide-react'

export interface RepairStatusLookupProps {
  initialRms?: string
  initialEmail?: string
  className?: string
  onTracked?: (record: any) => void
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
    label: 'Prepaid Mailer Dispatched',
    description: 'Prepaid 2.0 lb ESD foam mailer and courier label dispatched to your address',
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

export const RepairStatusLookup: React.FC<RepairStatusLookupProps> = ({
  initialRms = '',
  initialEmail = '',
  className = '',
  onTracked,
}) => {
  const [rmsInput, setRmsInput] = useState<string>(initialRms)
  const [emailInput, setEmailInput] = useState<string>(initialEmail)
  const [record, setRecord] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [copiedRms, setCopiedRms] = useState<boolean>(false)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [showSlipModal, setShowSlipModal] = useState<boolean>(false)

  // Update email if passed from Auth0 Profile or query param
  useEffect(() => {
    if (initialEmail && !emailInput) {
      const timer = setTimeout(() => {
        setEmailInput(initialEmail)
      }, 0)
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

        const data = await response.json()

        if (response.ok && data.success && data.record) {
          setRecord(data.record)
          setErrorMessage('')
          onTracked?.(data.record)
        } else {
          setRecord(null)
          setErrorMessage(
            data.error ||
              'No matching repair record found for this Repair Request ID and Email combination. Please verify both details.'
          )
        }
      } catch (err: any) {
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

  const handleCopyRms = (rms: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(rms)
      setCopiedRms(true)
      setTimeout(() => setCopiedRms(false), 2000)
    }
  }

  const handleDemoFill = (demoRms: string, demoEmail: string) => {
    setRmsInput(demoRms)
    setEmailInput(demoEmail)
    executeLookup(demoRms, demoEmail)
  }

  const getStageNumber = (statusKey: string, numericStage?: number): number => {
    if (typeof numericStage === 'number') return numericStage
    switch (statusKey) {
      case 'kit_dispatched':
        return 1
      case 'inbound_transit':
        return 2
      case 'bench_diagnostic':
      case 'repair_in_progress':
        return 3
      case 'quality_testing':
        return 4
      case 'outbound_delivery':
      case 'completed':
        return 5
      default:
        return 1
    }
  }

  const currentStage = record ? getStageNumber(record.status, record.currentStage) : 1

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
                  placeholder="e.g. DCP-RMS-100001"
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-neutral-500">Test Demo Records:</span>
              <button
                type="button"
                onClick={() => handleDemoFill('DCP-RMS-100001', 'cheyoung1983@gmail.com')}
                className="text-[11px] font-mono px-2 py-0.5 bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-800 text-neutral-700 rounded-lg border border-neutral-200 transition-colors cursor-pointer"
              >
                RMS-100001 (iPhone 15 Pro Max)
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('DCP-RMS-100002', 'customer@example.com')}
                className="text-[11px] font-mono px-2 py-0.5 bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-800 text-neutral-700 rounded-lg border border-neutral-200 transition-colors cursor-pointer"
              >
                RMS-100002 (S24 Ultra)
              </button>
            </div>

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

      {/* Verified Status Display */}
      {record && (
        <div id="verified-repair-details" className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm overflow-hidden space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-emerald-950 text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 tracking-wider">
                  {record.rmsNumber}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Customer Ownership
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white pt-1">
                {record.itemDetails?.deviceBrand} {record.itemDetails?.deviceModel}
              </h3>
              <p className="text-xs text-neutral-300">
                Contact: <strong className="text-white">{record.shippingKit?.recipientName}</strong> &bull; {record.shippingKit?.email}
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => handleCopyRms(record.rmsNumber)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedRms ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRms ? 'Copied' : 'Copy RMS#'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSlipModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Packing Slip</span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-7">
            {/* 5-Stage Interactive Progress Track */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Repair Progress Timeline
                </h4>
                {record.estimatedCompletion && (
                  <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Est. Delivery: {record.estimatedCompletion}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {REPAIR_STAGES.map((st) => {
                  const Icon = st.icon
                  const isDone = st.stage < currentStage
                  const isCurrent = st.stage === currentStage
                  const isPending = st.stage > currentStage

                  return (
                    <div
                      key={st.key}
                      className={`relative p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
                          : isDone
                          ? 'border-neutral-200 bg-neutral-50/90 text-neutral-700'
                          : 'border-neutral-200/60 bg-white text-neutral-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-neutral-100 text-neutral-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Stage {st.stage}
                        </span>
                      </div>
                      <p className={`text-xs font-bold leading-snug ${isCurrent ? 'text-emerald-950' : 'text-neutral-900'}`}>
                        {st.label}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        {st.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Telemetry Grid (Hardware Specs & Courier Logistics) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-neutral-100">
              {/* Hardware Diagnostics */}
              <div className="bg-neutral-50/70 rounded-xl p-4 border border-neutral-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Device Hardware Specs</span>
                </div>
                <div className="text-xs space-y-1.5 text-neutral-700">
                  <div className="flex justify-between py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-500">Device Model:</span>
                    <strong className="text-neutral-900">{record.itemDetails?.deviceBrand} {record.itemDetails?.deviceModel}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 font-mono">
                    <span className="text-neutral-500">Serial / IMEI:</span>
                    <span className="text-neutral-900">{record.itemDetails?.serialOrImei || 'Verified on bench'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-500">Reported Issue:</span>
                    <span className="text-neutral-900 font-medium">
                      {(record.itemDetails?.symptoms || []).join(', ') || 'Diagnostic inspection'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Cosmetic Condition:</span>
                    <span className="text-neutral-900">{record.itemDetails?.cosmeticCondition || 'Normal wear'}</span>
                  </div>
                </div>

                {record.itemDetails?.notes && (
                  <div className="mt-2 p-2.5 bg-white rounded-lg border border-neutral-200 text-xs text-neutral-600">
                    <strong className="text-neutral-800 block text-[11px] mb-0.5">Technician Intake Note:</strong>
                    {record.itemDetails.notes}
                  </div>
                )}
              </div>

              {/* Courier Logistics */}
              <div className="bg-neutral-50/70 rounded-xl p-4 border border-neutral-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Reverse Logistics &amp; Shipping Kit</span>
                </div>
                <div className="text-xs space-y-1.5 text-neutral-700">
                  <div className="flex justify-between py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-500">Courier Service:</span>
                    <strong className="text-neutral-900">{record.shippingKit?.courierPreference || 'UPS Overnight Prepaid'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-500">Shipping Kit Format:</span>
                    <span className="text-neutral-900 font-medium">ESD Foam Mailer (Prepaid up to 2.0 lbs)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 font-mono">
                    <span className="text-neutral-500">Inbound Tracking:</span>
                    <span className="text-emerald-700 font-bold">{record.shippingKit?.inboundTracking || 'Pending Dispatch'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Destination:</span>
                    <span className="text-neutral-900">Spokane Advanced Cleanroom Hub</span>
                  </div>
                </div>

                <div className="mt-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero upfront shipping fees. Hand package directly to your local courier station.</span>
                </div>
              </div>
            </div>

            {/* Diagnostic Photos */}
            {record.itemDetails?.imageUrls && record.itemDetails.imageUrls.length > 0 && (
              <div className="pt-4 border-t border-neutral-100">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2.5">
                  Intake Diagnostic Photos ({record.itemDetails.imageUrls.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {record.itemDetails.imageUrls.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImg(url)}
                      className="group relative aspect-square rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden cursor-pointer"
                    >
                      <img src={url} alt={`Diagnostic photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1">
                        <ZoomIn className="w-4 h-4" />
                        <span>Enlarge</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Technician Event Log */}
            {record.technicianLog && record.technicianLog.length > 0 && (
              <div className="pt-4 border-t border-neutral-100">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3">
                  Technician Bench Log History
                </h4>
                <div className="space-y-2">
                  {record.technicianLog.map((log: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <span className="font-semibold text-neutral-900">{log.event}</span>
                        {log.timestamp && (
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-3xl w-full bg-neutral-900 rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImg} alt="Diagnostic enlarged preview" className="w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* Printable Packing Slip Modal */}
      {showSlipModal && record && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Official Mail-In Packing Slip</h3>
                <p className="text-xs text-neutral-500 font-mono">RMS #{record.rmsNumber}</p>
              </div>
              <button
                onClick={() => setShowSlipModal(false)}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <p><strong>Device:</strong> {record.itemDetails?.deviceBrand} {record.itemDetails?.deviceModel}</p>
              <p><strong>Serial / IMEI:</strong> {record.itemDetails?.serialOrImei || 'N/A'}</p>
              <p><strong>Customer Name:</strong> {record.shippingKit?.recipientName}</p>
              <p><strong>Customer Email:</strong> {record.shippingKit?.email}</p>
              <p><strong>Courier:</strong> {record.shippingKit?.courierPreference}</p>
              <p><strong>Facility Destination:</strong> DisplayCellPros Spokane Cleanroom Facility</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSlipModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RepairStatusLookup
