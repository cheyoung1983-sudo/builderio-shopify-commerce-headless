'use client'

import React, { useState, useEffect } from 'react'
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
  MapPin,
  FileText,
  Activity,
} from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export interface RepairStatusTrackerProps {
  initialRms?: string
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
    label: 'Kit Dispatched',
    description: 'Prepaid ESD foam mailer & overnight label dispatched to your address',
    icon: Package,
  },
  {
    stage: 2,
    key: 'inbound_transit',
    label: 'Inbound Transit',
    description: 'Package scanned by courier & in transit to Phoenix Cleanroom Lab',
    icon: Truck,
  },
  {
    stage: 3,
    key: 'bench_diagnostic',
    label: 'Bench Triage & Repair',
    description: 'Hardware disassembled at grounded ESD station; OEM parts installed',
    icon: Wrench,
  },
  {
    stage: 4,
    key: 'qc_calibration',
    label: 'QC & Calibration',
    description: '100% multi-point QA stress test, touch digitizer test & OLED color tuning',
    icon: ShieldCheck,
  },
  {
    stage: 5,
    key: 'outbound_return',
    label: 'Outbound Delivery',
    description: 'Device sanitized, packaged, and returned via insured Priority Overnight',
    icon: CheckCircle2,
  },
]

function getStageIndex(status: string): number {
  switch (status?.toLowerCase()) {
    case 'kit_requested':
    case 'kit_dispatched':
      return 1
    case 'inbound_transit':
    case 'in_transit':
      return 2
    case 'bench_diagnostic':
    case 'repair_in_progress':
    case 'on_bench':
      return 3
    case 'qc_calibration':
    case 'quality_control':
    case 'testing':
      return 4
    case 'outbound_return':
    case 'completed':
    case 'delivered':
      return 5
    default:
      return 1
  }
}

export const RepairStatusTracker: React.FC<RepairStatusTrackerProps> = ({
  initialRms = '',
  className = '',
  onTracked,
}) => {
  const [searchInput, setSearchInput] = useState<string>(initialRms)
  const [activeRms, setActiveRms] = useState<string>(initialRms)
  const [record, setRecord] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [copiedRms, setCopiedRms] = useState<boolean>(false)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false)

  const fetchFromApi = React.useCallback(async (rms: string) => {
    try {
      const res = await fetch(`/api/repair-requests/${encodeURIComponent(rms)}`)
      const json = await res.json()
      if (res.ok && json.success && json.record) {
        setRecord(json.record)
        setIsLiveConnected(false)
        if (onTracked) onTracked(json.record)
      } else {
        setRecord(null)
        setErrorMessage(
          json.error || `No repair request found for RMS #${rms}. Please verify your tracking number.`
        )
      }
    } catch {
      setRecord(null)
      setErrorMessage('Could not connect to tracking server. Please check your network connection.')
    } finally {
      setLoading(false)
    }
  }, [onTracked])

  // Real-time Firestore onSnapshot Subscription
  useEffect(() => {
    if (!activeRms.trim()) {
      const timer = setTimeout(() => {
        setRecord(null)
      }, 0)
      return () => clearTimeout(timer)
    }

    const cleanRms = activeRms.trim().toUpperCase()

    let unsubscribe: (() => void) | null = null
    const timer = setTimeout(() => {
      setLoading(true)
      setErrorMessage('')
    }, 0)

    if (db) {
      try {
        const docRef = doc(db, 'repair_requests', cleanRms)
        unsubscribe = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data()
              setRecord(data)
              setIsLiveConnected(true)
              setLoading(false)
              if (onTracked) onTracked(data)
            } else {
              // Try API fallback for demo or seeded records
              setTimeout(() => fetchFromApi(cleanRms), 0)
            }
          },
          (err) => {
            console.warn('[Firestore onSnapshot] Listening fallback:', err?.message)
            setTimeout(() => fetchFromApi(cleanRms), 0)
          }
        )
      } catch (err) {
        console.warn('Direct listener init error, calling API fallback:', err)
        setTimeout(() => fetchFromApi(cleanRms), 0)
      }
    } else {
      setTimeout(() => fetchFromApi(cleanRms), 0)
    }

    return () => {
      clearTimeout(timer)
      if (unsubscribe) unsubscribe()
    }
  }, [activeRms, fetchFromApi, onTracked])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    let clean = searchInput.trim().toUpperCase()
    if (!clean) return

    // Auto-prefix if user just entered numeric code
    if (/^\d{6}$/.test(clean)) {
      clean = `DCP-RMS-${clean}`
      setSearchInput(clean)
    } else if (/^RMS-\d{6}$/.test(clean)) {
      clean = `DCP-${clean}`
      setSearchInput(clean)
    }

    setActiveRms(clean)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedRms(true)
    setTimeout(() => setCopiedRms(false), 2000)
  }

  const currentStageIndex = record ? getStageIndex(record.status) : 1

  return (
    <div
      id="repair-status-tracker"
      className={`rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden p-6 sm:p-8 ${className}`}
      data-testid="repair-status-tracker"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold tracking-wider uppercase mb-1">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Live Cleanroom Repair Status</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Mail-In Repair Status Tracker
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-xl">
            Enter your <strong>DCP-RMS Tracking Number</strong> for real-time bench diagnostic updates, technician logs, and return shipment tracking.
          </p>
        </div>

        {/* Live Status Badge */}
        {record && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 px-3.5 py-2 text-emerald-900 text-xs font-bold self-start sm:self-auto shrink-0 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>{isLiveConnected ? 'Live Firestore Feed' : 'Real-Time Sync'}</span>
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. DCP-RMS-100001 or 100001"
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 font-mono placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <Search className="w-5 h-5 text-neutral-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Tracking...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Track Repair</span>
              </>
            )}
          </button>
        </div>

        {/* Demo Quick Select Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-neutral-500">
          <span className="font-semibold text-neutral-600">Try Sample Orders:</span>
          <button
            type="button"
            onClick={() => {
              setSearchInput('DCP-RMS-100001')
              setActiveRms('DCP-RMS-100001')
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-[11px] transition-colors"
          >
            DCP-RMS-100001 (Bench Repair)
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchInput('DCP-RMS-100002')
              setActiveRms('DCP-RMS-100002')
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-[11px] transition-colors"
          >
            DCP-RMS-100002 (Inbound Transit)
          </button>
        </div>
      </form>

      {/* Error State */}
      {errorMessage && (
        <div
          className="rounded-xl border border-rose-300 bg-rose-50/80 p-4 text-rose-950 text-xs flex items-start gap-3 mb-6"
          data-testid="repair-tracker-error"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-rose-900">Tracking Lookup Notice: </strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* RECORD DETAILS & 5-STAGE TIMELINE */}
      {record && (
        <div className="space-y-8" data-testid="repair-record-view">
          {/* Top Status Banner */}
          <div className="rounded-2xl border border-emerald-300 bg-linear-to-r from-emerald-50 via-white to-emerald-50/30 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 block">
                  Active Repair Order
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h4 className="text-xl sm:text-2xl font-mono font-extrabold text-neutral-900 tracking-tight">
                    {record.rmsNumber}
                  </h4>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(record.rmsNumber)}
                    className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors"
                    title="Copy RMS Number"
                  >
                    {copiedRms ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  Customer: <strong>{record.shippingKit?.recipientName}</strong> ({record.shippingKit?.email})
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 block">
                  Estimated Completion
                </span>
                <span className="text-sm font-bold text-emerald-800">
                  {record.estimatedCompletion || 'Within 24–48 hours of intake'}
                </span>
                {record.shippingKit?.inboundTracking && (
                  <span className="text-[11px] text-neutral-500 font-mono block mt-0.5">
                    Tracking: {record.shippingKit.inboundTracking}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 5-Stage Visual Progress Timeline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 mb-4">
              Repair Progress Lifecycle
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {REPAIR_STAGES.map((st) => {
                const Icon = st.icon
                const isCompleted = st.stage < currentStageIndex
                const isCurrent = st.stage === currentStageIndex
                const isPending = st.stage > currentStageIndex

                return (
                  <div
                    key={st.stage}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-600/20'
                        : isCompleted
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-neutral-200 bg-neutral-50/50 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isCurrent
                              ? 'bg-emerald-700 text-white'
                              : isCompleted
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-neutral-200 text-neutral-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-neutral-400">
                          Step {st.stage}
                        </span>
                      </div>

                      <strong
                        className={`text-xs block font-bold mb-1 ${
                          isCurrent ? 'text-emerald-950 font-extrabold' : isCompleted ? 'text-neutral-900' : 'text-neutral-600'
                        }`}
                      >
                        {st.label}
                      </strong>

                      <p className="text-[11px] text-neutral-600 leading-snug">
                        {st.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[10px] font-bold">
                      {isCompleted && (
                        <span className="text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-emerald-800 uppercase tracking-wider inline-flex items-center gap-1 font-extrabold animate-pulse">
                          ● In Progress
                        </span>
                      )}
                      {isPending && <span className="text-neutral-400">Pending</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hardware & Diagnostics Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Device Hardware & Issue Summary */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-700" />
                <span>Device Diagnostics &amp; Ingestion Specs</span>
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Device Model</span>
                  <strong className="text-neutral-900">
                    {record.itemDetails?.deviceBrand} {record.itemDetails?.deviceModel}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Serial / IMEI</span>
                  <strong className="text-neutral-900 font-mono">
                    {record.itemDetails?.serialOrImei || 'Not Provided'}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Reported Faults</span>
                  <strong className="text-neutral-900">
                    {record.itemDetails?.symptoms?.join(', ') || 'Diagnostic Triage'}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Cosmetic Condition</span>
                  <strong className="text-neutral-900">
                    {record.itemDetails?.cosmeticCondition || 'Standard'}
                  </strong>
                </div>
              </div>

              {record.itemDetails?.notes && (
                <div className="pt-3 border-t border-neutral-200">
                  <span className="text-neutral-500 block text-[11px] font-semibold">Customer Issue Description:</span>
                  <p className="text-neutral-700 text-xs italic mt-0.5 bg-white p-2.5 rounded-lg border border-neutral-200">
                    &quot;{record.itemDetails.notes}&quot;
                  </p>
                </div>
              )}

              {/* Uploaded Diagnostic Photos */}
              {record.itemDetails?.imageUrls && record.itemDetails.imageUrls.length > 0 && (
                <div className="pt-3 border-t border-neutral-200">
                  <span className="text-neutral-500 block text-[11px] font-semibold mb-2">
                    Customer Diagnostic Photos ({record.itemDetails.imageUrls.length}):
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {record.itemDetails.imageUrls.map((url: string, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewImg(url)}
                        className="relative group rounded-lg border border-neutral-200 overflow-hidden bg-neutral-200 aspect-4/3 shadow-2xs hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`Uploaded Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Technician Cleanroom Activity Log */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Technician Activity &amp; Cleanroom Log</span>
              </h4>

              {record.technicianLog && record.technicianLog.length > 0 ? (
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                  {record.technicianLog.map((log: any, lIdx: number) => (
                    <div key={lIdx} className="relative pl-6 text-xs">
                      <div className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-600 -translate-x-1/2 ring-2 ring-white" />
                      <span className="text-[10px] font-mono text-neutral-400 block">
                        {new Date(log.timestamp).toLocaleDateString()} at{' '}
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="text-neutral-800 font-medium mt-0.5">{log.event}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-xs text-neutral-600">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-[10px] font-mono text-neutral-400 block">
                      {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Active'}
                    </span>
                    <p className="font-semibold text-neutral-900 mt-0.5">
                      Shipping kit dispatched via {record.shippingKit?.courierPreference || 'Priority Overnight'}.
                    </p>
                    <span className="text-neutral-500 text-[11px]">
                      Destination: {record.shippingKit?.address?.city}, {record.shippingKit?.address?.state}{' '}
                      {record.shippingKit?.address?.zip}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-950">
                    <strong className="font-bold block">Bench Protocol Active:</strong>
                    <span>
                      Our technicians will record high-resolution photo triage immediately upon cleanroom delivery.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            <img
              src={previewImg}
              alt="Enlarged Diagnostic Photo"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RepairStatusTracker
