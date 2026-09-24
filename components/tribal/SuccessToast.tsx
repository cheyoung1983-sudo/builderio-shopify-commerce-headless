'use client'

import React, { useEffect, useState } from 'react'
import {
  Tag,
  X,
  Sparkles,
  ShieldCheck,
  Percent,
} from 'lucide-react'

export interface SuccessToastProps {
  isOpen: boolean
  title?: string
  tagName?: string
  discountPercentage?: number
  message?: string
  subMessage?: string
  duration?: number // default 7000ms
  onClose: () => void
  actionLabel?: string
  onAction?: () => void
}

export function SuccessToast({
  isOpen,
  title = 'Shopify Customer Tag Applied',
  tagName = 'tribal-member-verified',
  discountPercentage = 20,
  message = 'Your tribal membership verification was successful!',
  subMessage = 'The Shopify customer tag has been added to your profile. Your 20% commercial discount is now active across all qualified catalog items.',
  duration = 7000,
  onClose,
  actionLabel,
  onAction,
}: SuccessToastProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!isOpen) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        onClose()
      }
    }, 50)

    return () => {
      clearInterval(interval)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  return (
    <aside
      aria-label="Success notification"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-md w-full sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-emerald-300/80 p-4 sm:p-5 overflow-hidden transition-all duration-300 ease-out animate-in slide-in-from-bottom-5 fade-in"
    >
      {/* Top accent border bar with animated progress */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-100 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start gap-3.5 pt-1">
        {/* Animated Emerald Icon with Sparkles */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-[9px] font-black shadow">
            <Sparkles className="w-2.5 h-2.5 text-amber-950" />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              {title}
            </h4>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs font-medium text-slate-700 mt-1">
            {message}
          </p>

          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            {subMessage}
          </p>

          {/* Shopify Tag Pill & Discount Tag */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-semibold">
              <Tag className="w-3 h-3 text-emerald-600" />
              tag: {tagName}
            </div>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
              <Percent className="w-3 h-3 text-indigo-600" />
              {discountPercentage}% Member Discount Active
            </div>
          </div>

          {/* Optional Action Button */}
          {actionLabel && onAction && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  onAction()
                  onClose()
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                {actionLabel} &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

export default SuccessToast
