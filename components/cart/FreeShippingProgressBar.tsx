'use client'

import React from 'react'
import { Truck, CheckCircle2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useCart } from '../../context/CartContext'

export interface FreeShippingProgressBarProps {
  threshold?: number // default 75
  currencySymbol?: string
  className?: string
}

export const FreeShippingProgressBar: React.FC<FreeShippingProgressBarProps> = ({
  threshold = 75,
  currencySymbol = '$',
  className = '',
}) => {
  const cart = useCart()

  const subtotal = typeof cart?.subtotal === 'number' ? cart.subtotal : 0
  const remaining = Math.max(0, threshold - subtotal)
  const progressPercent = Math.min(100, Math.round((subtotal / threshold) * 100))
  const isUnlocked = subtotal >= threshold

  return (
    <div
      id="free-shipping-progress"
      className={`bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 text-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isUnlocked ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Truck className="w-4 h-4 text-neutral-600 shrink-0" />
          )}
          <span className="font-semibold text-neutral-900 truncate">
            {isUnlocked ? (
              <span className="text-emerald-700 font-bold">
                You&apos;ve unlocked FREE Standard Shipping!
              </span>
            ) : (
              <span>
                Add{' '}
                <strong className="text-emerald-700 font-bold">
                  {currencySymbol}
                  {remaining.toFixed(2)}
                </strong>{' '}
                more for FREE shipping
              </span>
            )}
          </span>
        </div>
        <span className="text-[11px] font-medium text-neutral-500 shrink-0">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${
            isUnlocked ? 'bg-emerald-600' : 'bg-emerald-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default FreeShippingProgressBar
