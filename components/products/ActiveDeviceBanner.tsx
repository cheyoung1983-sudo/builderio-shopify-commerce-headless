'use client'

import React from 'react'
import { CheckCircle2, RotateCcw, Wrench, Smartphone, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useDeviceCompatibility } from '../../context/DeviceCompatibilityContext'

export interface ActiveDeviceBannerProps {
  className?: string
  onChangeClick?: () => void
  productCount?: number
}

export const ActiveDeviceBanner: React.FC<ActiveDeviceBannerProps> = ({
  className = '',
  onChangeClick,
  productCount,
}) => {
  const {
    hasActiveFilter,
    selectedBrand,
    selectedModel,
    selectedCategory,
    clearCompatibilityFilter,
  } = useDeviceCompatibility()

  if (!hasActiveFilter || !selectedModel) {
    return null
  }

  const deviceTitle = `${selectedBrand?.name || ''} ${selectedModel.name}`
  const categorySuffix =
    selectedCategory && selectedCategory.id !== 'all' ? ` • ${selectedCategory.name}` : ''

  return (
    <div
      id="active-device-banner"
      className={`w-full bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white rounded-xl shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-emerald-200" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold truncate">
              Filtering for {deviceTitle}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/30 px-2 py-0.5 rounded-full border border-emerald-400/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              Guaranteed Fit
            </span>
            {typeof productCount === 'number' && (
              <span className="text-[11px] text-emerald-200">
                ({productCount} verified {productCount === 1 ? 'part' : 'parts'})
              </span>
            )}
          </div>
          <p className="text-[11px] text-emerald-100/80 truncate">
            All listed parts are verified compatible with your hardware revision{categorySuffix}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onChangeClick && (
          <button
            type="button"
            onClick={onChangeClick}
            className="px-2.5 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
          >
            Change Phone
          </button>
        )}

        <button
          type="button"
          onClick={clearCompatibilityFilter}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Clear device filter to view entire catalog"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear Filter</span>
        </button>

        <Link
          href={`/services?device=${encodeURIComponent(deviceTitle)}`}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-white text-emerald-900 hover:bg-emerald-50 rounded-lg shadow-xs transition-colors"
        >
          <Wrench className="w-3 h-3 text-emerald-700" />
          <span>Need Mail-In Repair?</span>
          <ArrowRight className="w-3 h-3 text-emerald-700" />
        </Link>
      </div>
    </div>
  )
}

export default ActiveDeviceBanner
