'use client'

import React from 'react'
import Link from 'next/link'
import {
  Wrench,
  Package,
  ShieldCheck,
  Clock,
  ArrowRight,
  Truck,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from 'lucide-react'
import { useDeviceCompatibility } from '../../context/DeviceCompatibilityContext'
import {
  mapCategoryToSymptom,
  getSymptomLabel,
  buildRepairServiceUrl,
  PREPAID_SHIPPING_SPECS,
} from '../../lib/repair-bridge'

export interface RepairRequestBridgeProps {
  className?: string
  compact?: boolean
  onActionClick?: () => void
}

export const RepairRequestBridge: React.FC<RepairRequestBridgeProps> = ({
  className = '',
  compact = false,
  onActionClick,
}) => {
  const { selectedBrand, selectedModel, selectedCategory, hasActiveFilter } =
    useDeviceCompatibility()

  const symptomId = mapCategoryToSymptom(selectedCategory?.id)
  const symptomTitle = getSymptomLabel(symptomId)
  const deviceName = selectedModel
    ? `${selectedBrand?.name || ''} ${selectedModel.name}`.trim()
    : null

  const targetUrl = buildRepairServiceUrl({
    brand: selectedBrand?.name,
    model: selectedModel?.name,
    categoryId: selectedCategory?.id,
    symptom: symptomId,
  })

  // If no device is currently selected in the compatibility checker
  if (!hasActiveFilter || !selectedModel) {
    return (
      <div
        id="repair-request-bridge-idle"
        className={`bg-gradient-to-r from-neutral-50 via-emerald-50/20 to-neutral-50 border border-neutral-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-900 text-sm">
                Prefer Professional Installation?
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Mail-In Available
              </span>
            </div>
            <p className="text-neutral-600 mt-0.5">
              Select your phone model in the compatibility checker above to auto-generate a pre-filled mail-in repair quote.
            </p>
          </div>
        </div>

        <Link
          href="/services"
          onClick={onActionClick}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-neutral-900 hover:bg-black text-white rounded-xl shadow-xs transition-colors shrink-0"
        >
          <span>Explore Mail-In Services</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  // Active Device Bridge Banner
  return (
    <div
      id="repair-request-bridge-active"
      className={`bg-white border-2 border-emerald-600/30 rounded-2xl shadow-sm overflow-hidden transition-all ${className}`}
    >
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Information Column */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              1-Click Mail-In Repair
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              {deviceName}
            </span>
            <span className="text-xs font-medium text-neutral-600">
              Service: <strong className="text-neutral-900">{symptomTitle}</strong>
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
            Not comfortable repairing your {selectedModel.name} yourself?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600">
            Send it to our certified Spokane repair lab. We provide a custom electrostatic mailer with{' '}
            <strong className="text-neutral-900">Prepaid Return Postage (rated up to {PREPAID_SHIPPING_SPECS.maxPackageWeightLbs.toFixed(1)} lbs / {PREPAID_SHIPPING_SPECS.maxPackageWeightOz} oz)</strong>, fast 24–48h turnaround, and OEM-spec testing.
          </p>

          {/* Trust Highlights Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-neutral-600">
            <div className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-100">
              <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                <strong>Prepaid Postage Box</strong> ($0 Due)
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-100">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                <strong>24–48h Turnaround</strong> Time
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                <strong>UN3481 Li-Ion</strong> Certified
              </span>
            </div>
          </div>
        </div>

        {/* Action Button & Trust Seal */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
          <Link
            id="bridge-book-repair-btn"
            href={targetUrl}
            onClick={onActionClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all cursor-pointer text-center"
          >
            <Wrench className="w-4 h-4 text-emerald-100" />
            <span>Book Mail-In Repair for {selectedModel.name}</span>
            <ArrowRight className="w-4 h-4 text-emerald-100" />
          </Link>
          <span className="text-[10px] text-neutral-500 text-center lg:text-right flex items-center justify-center lg:justify-end gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Pre-fills device &amp; includes prepaid shipping box
          </span>
        </div>
      </div>
    </div>
  )
}

export default RepairRequestBridge
