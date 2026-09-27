import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import {
  ExternalLink,
  QrCode,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Wrench,
  Truck,
  FileCheck,
} from 'lucide-react'

export interface CheckoutCartItem {
  id?: string
  quantity: number
  variantTitle?: string
  productTitle?: string
  price?: string
  image?: string
}

export interface CheckoutHandoffCardProps {
  cartId: string
  initialCheckoutUrl: string
  items: CheckoutCartItem[]
  subtotal?: string
  total?: string
  currency?: string
  serviceType?: string
  deviceModel?: string
  repairIssue?: string
  tribalExemptionRequested?: boolean
  customerName?: string
  customerPhone?: string
  onCheckoutClick?: () => void
}

export const CheckoutHandoffCard: React.FC<CheckoutHandoffCardProps> = ({
  cartId,
  initialCheckoutUrl,
  items,
  total,
  currency = 'USD',
  serviceType = 'Spokane On-Site',
  deviceModel,
  repairIssue,
  tribalExemptionRequested,
  customerName,
  customerPhone,
  onCheckoutClick,
}) => {
  const [checkoutUrl, setCheckoutUrl] = useState<string>(initialCheckoutUrl)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [showQrCode, setShowQrCode] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  // Refresh single-session checkoutUrl on demand
  const handleRefreshCheckout = useCallback(async () => {
    if (!cartId || isRefreshing) return
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/agent/refresh-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId }),
      })
      const data = await res.json()
      if (data.success && data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl)
        setLastRefreshed(new Date())
      }
    } catch (err) {
      console.warn('Failed to refresh checkoutUrl:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [cartId, isRefreshing])

  const handleCopyLink = () => {
    if (!checkoutUrl) return
    navigator.clipboard?.writeText(checkoutUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isMailIn = serviceType?.toLowerCase().includes('mail')

  return (
    <div className="w-full bg-slate-900/95 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-xl backdrop-blur-md transition-all my-3 font-sans">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            {isMailIn ? <Truck className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight">
              {serviceType} Repair Order
            </h4>
            <p className="text-[11px] text-slate-400">
              Ready for Hosted Shopify Checkout
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cart Reserved</span>
        </div>
      </div>

      {/* Repair Metadata Chips */}
      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-3.5 space-y-2">
        {deviceModel && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Device Model</span>
            <span className="font-medium text-white">{deviceModel}</span>
          </div>
        )}
        {repairIssue && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Repair Diagnosis</span>
            <span className="font-medium text-slate-200 text-right max-w-[220px] truncate">
              {repairIssue}
            </span>
          </div>
        )}
        {customerName && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Customer</span>
            <span className="font-medium text-slate-200">
              {customerName} {customerPhone ? `(${customerPhone})` : ''}
            </span>
          </div>
        )}

        {/* Tribal Tax Exemption Banner */}
        {tribalExemptionRequested && (
          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-start gap-2 bg-amber-950/30 border-amber-800/40 rounded-lg p-2 text-amber-200 text-[11px]">
            <FileCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Tribal Exemption Request Tagged:</span>
              <p className="text-amber-200/90 leading-tight mt-0.5">
                Exemption attribute is attached for Shopify Flow & Avalara post-order verification.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cart Line Items */}
      <div className="space-y-2 mb-4">
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="flex items-center justify-between gap-3 text-xs py-1.5 px-2.5 rounded-lg bg-slate-950/40 border border-slate-800/50"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {item.image ? (
                <div className="w-8 h-8 rounded-md bg-slate-800 overflow-hidden relative shrink-0">
                  <Image
                    src={item.image}
                    alt={item.productTitle || 'Product thumbnail'}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-white truncate max-w-[180px] sm:max-w-[220px]">
                  {item.productTitle || 'Replacement Screen & Labor'}
                </p>
                {item.variantTitle && (
                  <p className="text-[10px] text-slate-400 truncate">{item.variantTitle}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-emerald-400 font-semibold tabular-nums">
                {item.price ? `$${parseFloat(item.price).toFixed(2)}` : '$--'}
              </span>
              <span className="text-slate-400 text-[10px] ml-1">× {item.quantity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Breakdown & Total */}
      <div className="border-t border-slate-800 pt-3 mb-4 flex items-baseline justify-between">
        <div>
          <span className="text-xs text-slate-400">Total Due at Checkout</span>
          <p className="text-[10px] text-emerald-400/80">Includes parts & on-site labor</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-white tabular-nums tracking-tight">
            ${total ? parseFloat(total).toFixed(2) : '0.00'} {currency}
          </span>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-col gap-2.5">
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onCheckoutClick}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-colors cursor-pointer"
        >
          <span>Proceed to Hosted Checkout</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Secondary Tool Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowQrCode(!showQrCode)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-300" />
            <span>{showQrCode ? 'Hide QR Code' : 'Scan on Mobile'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            title="Copy checkout link to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshCheckout}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            title={`Refresh checkout token (last updated ${lastRefreshed.toLocaleTimeString()})`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Scannable QR Code */}
      {showQrCode && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-800 flex flex-col items-center justify-center bg-slate-950/80 rounded-xl p-4 text-center animate-fadeIn">
          <div className="p-2.5 bg-white rounded-xl shadow-md inline-block">
            <QRCodeSVG
              value={checkoutUrl}
              size={140}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-xs font-semibold text-white mt-2.5">
            Scan to pay with Apple Pay / Shop Pay
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400">
              URL refreshed {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              type="button"
              onClick={handleRefreshCheckout}
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Security Footer */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Shopify PCI Level 1 Certified • 256-Bit SSL Encryption</span>
      </div>
    </div>
  )
}

export default CheckoutHandoffCard
