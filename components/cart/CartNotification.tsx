'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  CheckCircle2,
  ShoppingBag,
  X,
  ArrowRight,
  AlertCircle,
  Info,
  ExternalLink,
  Trash2,
  Tag,
} from 'lucide-react'
import { useCart, CartNotification as CartNotificationType } from '../../context/CartContext'

interface SingleToastProps {
  notification: CartNotificationType
  onDismiss: (id: string) => void
  onOpenCart: () => void
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  subtotalFormatted: string
  totalQuantity: number
  checkoutUrl: string | null
}

const SingleToast: React.FC<SingleToastProps> = ({
  notification,
  onDismiss,
  onOpenCart,
  onPause,
  onResume,
  subtotalFormatted,
  totalQuantity,
  checkoutUrl,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const item = notification.item
  const imageUrl = item?.image?.url || item?.image?.src
  const duration = notification.duration || 4500

  const handleMouseEnter = () => {
    setIsHovered(true)
    onPause?.(notification.id)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onResume?.(notification.id)
  }

  // Calculate discount if on sale
  const regularPrice = item?.price?.amount ? parseFloat(item.price.amount) : 0
  const comparePrice = item?.compareAtPrice?.amount
    ? parseFloat(item.compareAtPrice.amount)
    : 0
  const hasDiscount = comparePrice > regularPrice && regularPrice > 0
  const savingsAmount = hasDiscount ? (comparePrice - regularPrice).toFixed(2) : null

  // Configure icon & theme by notification type
  const isError = notification.type === 'error'
  const isRemove = notification.type === 'remove'
  const isUpdate = notification.type === 'update'
  const isAdd = notification.type === 'add' || (!isError && !isRemove && !isUpdate)

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full overflow-hidden rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-2xl border transition-all duration-200 pointer-events-auto animate-toast-in ${
        isError
          ? 'border-red-200/90 dark:border-red-900/60'
          : isRemove
          ? 'border-amber-200/90 dark:border-amber-900/60'
          : 'border-neutral-200/90 dark:border-neutral-800'
      }`}
    >
      <div className="p-4 sm:p-4.5">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isError
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                  : isRemove
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  : isUpdate
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
            >
              {isError ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : isRemove ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : isUpdate ? (
                <ShoppingBag className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{notification.title}</span>
            </span>

            {/* Subtle pulse indicator for immediate feedback */}
            {isAdd && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 font-medium">Just now</span>
            <button
              type="button"
              id={`dismiss-toast-${notification.id}`}
              onClick={() => onDismiss(notification.id)}
              aria-label="Dismiss notification"
              title="Dismiss"
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Item Content */}
        {item ? (
          <div className="flex items-center gap-3.5 bg-neutral-50/90 dark:bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-700/60">
            {/* Image Thumbnail */}
            <div className="relative w-14 h-14 rounded-lg bg-white dark:bg-neutral-900 overflow-hidden flex-shrink-0 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="56px"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ShoppingBag className="w-6 h-6 text-neutral-400" />
              )}
            </div>

            {/* Item Details */}
            <div className="flex-1 min-w-0">
              <h5 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {item.title}
              </h5>

              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {item.variantTitle && item.variantTitle !== 'Default Title' && (
                  <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-200/70 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 truncate max-w-[140px]">
                    {item.variantTitle}
                  </span>
                )}
                <span className="inline-flex items-center text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Qty: {item.quantity}
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  ${item.price.amount}
                </span>

                {hasDiscount && savingsAmount && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    <Tag className="w-2.5 h-2.5" />
                    Save ${savingsAmount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-600 dark:text-neutral-300 py-1">
            {notification.message}
          </p>
        )}

        {/* Quick Actions Footer (Only for successful additions/updates) */}
        {!isError && (
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
              <span>Bag Total: </span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {subtotalFormatted}
              </span>
              <span className="text-neutral-400 dark:text-neutral-500">
                {' '}
                ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id={`toast-view-bag-btn-${notification.id}`}
                onClick={() => {
                  onDismiss(notification.id)
                  onOpenCart()
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
              >
                <span>View Bag</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  id={`toast-checkout-btn-${notification.id}`}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 transition-colors"
                >
                  <span>Checkout</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Animated Countdown Progress Bar */}
      {duration > 0 && (
        <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div
            className={`h-full animate-toast-progress ${
              isError
                ? 'bg-red-500'
                : isRemove
                ? 'bg-amber-500'
                : isUpdate
                ? 'bg-blue-500'
                : 'bg-emerald-500'
            }`}
            style={{
              animationDuration: `${duration}ms`,
              animationPlayState: isHovered ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </div>
  )
}

export const CartNotification: React.FC = () => {
  const {
    notifications,
    notification,
    dismissNotification,
    clearAllNotifications,
    openCart,
    totalQuantity,
    subtotalFormatted,
    checkoutUrl,
    pauseNotificationTimer,
    resumeNotificationTimer,
  } = useCart()

  // Support both notifications array and legacy fallback single notification
  const activeNotifications: CartNotificationType[] =
    notifications && notifications.length > 0
      ? notifications
      : notification
      ? [notification]
      : []

  // Close active toasts when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeNotifications.length > 0) {
        clearAllNotifications()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeNotifications.length, clearAllNotifications])

  if (activeNotifications.length === 0) return null

  return (
    <aside
      id="cart-notification-toast-portal"
      aria-label="Shopping bag notifications"
      className="fixed top-20 right-3 sm:right-6 z-[60] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
    >
      {activeNotifications.length > 1 && (
        <div className="flex justify-end pointer-events-auto px-1">
          <button
            type="button"
            id="dismiss-all-cart-toasts-btn"
            onClick={clearAllNotifications}
            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 bg-white/90 dark:bg-neutral-800/90 px-2.5 py-1 rounded-full shadow-xs border border-neutral-200/80 dark:border-neutral-700 transition-colors cursor-pointer"
          >
            Clear all ({activeNotifications.length})
          </button>
        </div>
      )}

      {activeNotifications.map((notif) => (
        <SingleToast
          key={notif.id}
          notification={notif}
          onDismiss={dismissNotification}
          onOpenCart={openCart}
          onPause={pauseNotificationTimer}
          onResume={resumeNotificationTimer}
          subtotalFormatted={subtotalFormatted}
          totalQuantity={totalQuantity}
          checkoutUrl={checkoutUrl}
        />
      ))}
    </aside>
  )
}

export default CartNotification
