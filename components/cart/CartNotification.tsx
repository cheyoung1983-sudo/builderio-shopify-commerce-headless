'use client'

import React from 'react'
import Image from 'next/image'
import { CheckCircle2, ShoppingBag, X, ArrowRight, AlertCircle } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useUniqueId } from '../../hooks/useUniqueId'

export const CartNotification: React.FC = () => {
  const { notification, dismissNotification, openCart, totalQuantity, subtotalFormatted } =
    useCart()
  const getId = useUniqueId('cart-notification')

  if (!notification) return null

  const item = notification.item
  const imageUrl = item?.image?.url || item?.image?.src

  const isError = notification.type === 'error'

  return (
    <aside
      id={getId('toast')}
      aria-label="Shopping bag notification"
      className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border ${
          isError ? 'border-red-200' : 'border-neutral-200/90'
        } p-4 text-neutral-900 overflow-hidden backdrop-blur-md`}
      >
        <div className="flex items-start gap-3.5">
          {/* Status Indicator Icon */}
          <div
            className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${
              isError
                ? 'bg-red-50 text-red-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                {notification.title}
              </p>
              <button
                type="button"
                id={getId('dismiss-btn')}
                onClick={dismissNotification}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Item Preview (if available) */}
            {item ? (
              <div className="mt-2.5 flex items-center gap-3 bg-neutral-50 p-2 rounded-xl border border-neutral-100">
                {imageUrl ? (
                  <div className="relative w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-neutral-200/60">
                    <Image
                      src={imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-400 flex-shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {item.variantTitle && item.variantTitle !== 'Default Title'
                      ? item.variantTitle
                      : `Qty: ${item.quantity}`}
                    {' • '}
                    <span className="font-semibold text-neutral-800">
                      ${item.price.amount}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-600 mt-1">{notification.message}</p>
            )}

            {/* Actions Bar */}
            {!isError && (
              <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                <div className="text-[11px] text-neutral-500">
                  <span>Bag total: </span>
                  <span className="font-bold text-neutral-900">{subtotalFormatted}</span>
                  <span className="text-neutral-400"> ({totalQuantity})</span>
                </div>

                <button
                  type="button"
                  id={getId('view-bag-btn')}
                  onClick={() => {
                    dismissNotification()
                    openCart()
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <span>View Bag</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default CartNotification
