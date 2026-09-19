'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingBag,
  Heart,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import { motion } from 'motion/react'
import { ToastItem as ToastItemType } from '../../../context/ToastContext'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '../../../lib/image'

interface ToastItemProps {
  toast: ToastItemType
  onDismiss: (id: string) => void
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false)
  const remainingTimeRef = useRef<number>(toast.duration || 4500)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    onDismiss(toast.id)
  }, [onDismiss, toast.id])

  // Timer logic with pause/resume support
  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return

    if (!isPaused) {
      startTimeRef.current = Date.now()
      timerRef.current = setTimeout(() => {
        handleDismiss()
      }, remainingTimeRef.current)
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isPaused, toast.duration, handleDismiss])

  // Icon and theme styling
  const getTypeConfig = () => {
    switch (toast.type) {
      case 'cart':
        return {
          icon: <ShoppingBag className="w-4 h-4 text-emerald-700" />,
          badgeBg: 'bg-emerald-50 border border-emerald-100',
          borderColor: 'border-emerald-200/80',
          progressColor: 'bg-emerald-600',
          typeLabel: 'Shopping Bag',
          actionBtnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        }
      case 'wishlist':
        return {
          icon: <Heart className="w-4 h-4 text-rose-600 fill-rose-500" />,
          badgeBg: 'bg-rose-50 border border-rose-100',
          borderColor: 'border-rose-200/80',
          progressColor: 'bg-rose-500',
          typeLabel: 'Wishlist',
          actionBtnBg: 'bg-neutral-900 hover:bg-neutral-800 text-white',
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-600" />,
          badgeBg: 'bg-red-50 border border-red-100',
          borderColor: 'border-red-200',
          progressColor: 'bg-red-600',
          typeLabel: 'Notice',
          actionBtnBg: 'bg-red-600 hover:bg-red-700 text-white',
        }
      case 'info':
        return {
          icon: <Info className="w-4 h-4 text-sky-600" />,
          badgeBg: 'bg-sky-50 border border-sky-100',
          borderColor: 'border-sky-200',
          progressColor: 'bg-sky-600',
          typeLabel: 'Information',
          actionBtnBg: 'bg-sky-600 hover:bg-sky-700 text-white',
        }
      case 'success':
      default:
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          badgeBg: 'bg-emerald-50 border border-emerald-100',
          borderColor: 'border-emerald-200/80',
          progressColor: 'bg-emerald-600',
          typeLabel: 'Success',
          actionBtnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        }
    }
  }

  const config = getTypeConfig()
  const isError = toast.type === 'error'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      id={`toast-item-${toast.id}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className="pointer-events-auto w-full"
    >
      <div
        className={`relative bg-white rounded-2xl shadow-xl border ${config.borderColor} text-neutral-900 overflow-hidden backdrop-blur-sm transition-shadow duration-200 hover:shadow-2xl`}
      >
        {/* Main Content Area */}
        <div className="p-3.5 sm:p-4">
          {/* Header Row: Type Badge + Title + Dismiss Button */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${config.badgeBg}`}
                aria-hidden="true"
              >
                {config.icon}
              </span>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                  {config.typeLabel}
                </span>
                <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                  {toast.title}
                </h4>
              </div>
            </div>

            <button
              type="button"
              id={`toast-dismiss-btn-${toast.id}`}
              onClick={handleDismiss}
              className="text-neutral-500 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Product Preview Card (if image or product details provided) */}
          {toast.image || toast.variantTitle || toast.price ? (
            <div className="mt-2.5 flex items-center gap-3 bg-neutral-50/90 p-2 sm:p-2.5 rounded-xl border border-neutral-150/70">
              {toast.image ? (
                <div className="relative w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 border border-neutral-200/80">
                  <Image
                    src={toast.image}
                    alt={toast.title}
                    fill
                    placeholder="blur"
                    blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
                    className="object-cover"
                    sizes={RESPONSIVE_IMAGE_SIZES.notificationThumb}
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 shrink-0 border border-neutral-200/80">
                  {config.icon}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  {toast.message || toast.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-600">
                  {toast.variantTitle && (
                    <span className="truncate max-w-[120px]">{toast.variantTitle}</span>
                  )}
                  {toast.quantity && toast.quantity > 1 && (
                    <span className="font-medium bg-neutral-200/70 px-1.5 py-0.5 rounded text-[10px] text-neutral-700">
                      Qty: {toast.quantity}
                    </span>
                  )}
                  {toast.price && (
                    <span className="font-semibold text-neutral-900">{toast.price}</span>
                  )}
                </div>
              </div>
            </div>
          ) : toast.message ? (
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed">{toast.message}</p>
          ) : null}

          {/* Actions Bar */}
          {(toast.action || toast.secondaryAction) && (
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-end gap-2">
              {toast.secondaryAction && (
                <button
                  type="button"
                  id={`toast-secondary-action-${toast.id}`}
                  onClick={() => {
                    toast.secondaryAction?.onClick?.()
                    handleDismiss()
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  {toast.secondaryAction.label}
                </button>
              )}

              {toast.action &&
                (toast.action.href ? (
                  <Link
                    id={`toast-action-link-${toast.id}`}
                    href={toast.action.href}
                    onClick={() => handleDismiss()}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${config.actionBtnBg} shadow-xs transition-colors cursor-pointer`}
                  >
                    <span>{toast.action.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    id={`toast-action-btn-${toast.id}`}
                    onClick={() => {
                      toast.action?.onClick?.()
                      handleDismiss()
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      toast.action.label.toLowerCase() === 'undo'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : `${config.actionBtnBg} shadow-xs`
                    } transition-colors cursor-pointer`}
                  >
                    {toast.action.label.toLowerCase() === 'undo' ? (
                      <RotateCcw className="w-3.5 h-3.5" />
                    ) : null}
                    <span>{toast.action.label}</span>
                    {toast.action.label.toLowerCase() !== 'undo' ? (
                      <ArrowRight className="w-3.5 h-3.5" />
                    ) : null}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Auto-Dismiss Progress Bar Indicator */}
        {toast.duration && toast.duration > 0 && (
          <div className="h-1 w-full bg-neutral-100 overflow-hidden" aria-hidden="true">
            <div
              className={`h-full ${config.progressColor} origin-left`}
              style={{
                animationName: 'shrinkWidth',
                animationDuration: `${toast.duration}ms`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ToastItem
