import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Printer,
  RotateCcw,
  Mail,
  Hash,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ArrowRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react'
import { validateEmail } from '@lib/validate-email'
import type { OrderTrackingData, TrackingMilestone } from '../../pages/api/orders/track'

export interface OrderTrackingProps {
  initialOrderId?: string
  initialEmail?: string
  className?: string
  onOrderFound?: (order: OrderTrackingData) => void
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({
  initialOrderId = '',
  initialEmail = '',
  className = '',
  onOrderFound,
}) => {
  const [orderId, setOrderId] = useState(initialOrderId)
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderTrackingData | null>(null)
  const [copiedTracking, setCopiedTracking] = useState(false)
  const [showItems, setShowItems] = useState(true)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true)
  const [showSupportModal, setShowSupportModal] = useState(false)

  const handleLookup = useCallback(
    async (searchOrderId: string, searchEmail: string) => {
      const cleanId = searchOrderId.trim()
      const cleanEmail = searchEmail.trim()

      if (!cleanId) {
        setError('Please enter your Order ID or Order Number.')
        return
      }

      if (!cleanEmail) {
        setError('Please enter the email address used for this order.')
        return
      }

      const emailCheck = validateEmail(cleanEmail)
      if (!emailCheck.isValid) {
        setError(emailCheck.error || 'Please enter a valid email address.')
        setSuggestion(emailCheck.suggestion || null)
        return
      }

      setLoading(true)
      setError(null)
      setSuggestion(null)

      try {
        const response = await fetch('/api/orders/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: cleanId, email: cleanEmail }),
        })

        const data = await response.json()

        if (!response.ok || !data.success || !data.order) {
          setError(data.error || 'Could not find tracking details for this order. Please verify your info.')
          setSuggestion(data.suggestion || null)
          setOrder(null)
        } else {
          setOrder(data.order)
          if (onOrderFound) {
            onOrderFound(data.order)
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Network error occurred while looking up order. Please try again.')
        setOrder(null)
      } finally {
        setLoading(false)
      }
    },
    [onOrderFound]
  )

  // Auto-search if initial props are provided
  useEffect(() => {
    let isMounted = true
    if (initialOrderId && initialEmail) {
      const timer = setTimeout(() => {
        if (isMounted) {
          handleLookup(initialOrderId, initialEmail)
        }
      }, 0)
      return () => {
        isMounted = false
        clearTimeout(timer)
      }
    }
  }, [initialOrderId, initialEmail, handleLookup])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLookup(orderId, email)
  }

  const handleSampleClick = (sampleId: string, sampleEmail = 'customer@example.com') => {
    setOrderId(sampleId)
    setEmail(sampleEmail)
    handleLookup(sampleId, sampleEmail)
  }

  const handleCopyTracking = (trackingNumber: string) => {
    if (!trackingNumber) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(trackingNumber).then(() => {
        setCopiedTracking(true)
        setTimeout(() => setCopiedTracking(false), 2000)
      })
    }
  }

  const handlePrintReceipt = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const handleReset = () => {
    setOrder(null)
    setError(null)
    setSuggestion(null)
  }

  const getStatusBadge = (status: OrderTrackingData['status']) => {
    switch (status) {
      case 'delivered':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        }
      case 'out_for_delivery':
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          dot: 'bg-blue-500 animate-pulse',
          icon: <Truck className="w-4 h-4 text-blue-600" />,
        }
      case 'shipped':
        return {
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
          dot: 'bg-indigo-500',
          icon: <Package className="w-4 h-4 text-indigo-600" />,
        }
      case 'processing':
      case 'confirmed':
      default:
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          icon: <Clock className="w-4 h-4 text-amber-600" />,
        }
    }
  }

  const getMilestoneIcon = (milestone: TrackingMilestone) => {
    if (milestone.status === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />
    }
    if (milestone.status === 'current') {
      return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
    }
    return <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
  }

  return (
    <div id="order-tracking-container" className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* Lookup Card (shown when no order loaded, or expandable) */}
      {!order ? (
        <div
          id="order-tracking-lookup-card"
          className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-10 shadow-xs"
        >
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-neutral-100 text-neutral-800 mb-4 shadow-2xs">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 mb-2">
              Track Your Delivery
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Enter your Order Number and the email address used during checkout to view live shipping milestones and courier details.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="max-w-xl mx-auto space-y-4" noValidate>
            <div>
              <label
                htmlFor="order-id-input"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Order Number / ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="order-id-input"
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. #1042 or 1042"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-neutral-50/70 border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="order-email-input"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="order-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-neutral-50/70 border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            {/* Error & Typo Alert */}
            {error && (
              <div
                id="order-tracking-error"
                role="alert"
                aria-live="polite"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs sm:text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p>{error}</p>
                  {suggestion && (
                    <p className="mt-1 text-xs text-red-600">
                      Did you mean{' '}
                      <button
                        type="button"
                        onClick={() => setEmail(suggestion)}
                        className="font-semibold underline hover:text-red-800"
                      >
                        {suggestion}
                      </button>
                      ?
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              id="order-tracking-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Looking up shipment...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Package</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Test Presets */}
          <div className="mt-8 pt-6 border-t border-border-subtle max-w-xl mx-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Quick Test Samples
              </span>
              <span className="text-[11px] text-neutral-400">Click to preview live states</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                id="sample-order-1042"
                onClick={() => handleSampleClick('1042')}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium border border-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>#1042 (Out for Delivery)</span>
              </button>
              <button
                type="button"
                id="sample-order-1038"
                onClick={() => handleSampleClick('1038')}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium border border-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>#1038 (Delivered)</span>
              </button>
              <button
                type="button"
                id="sample-order-1045"
                onClick={() => handleSampleClick('1045')}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium border border-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>#1045 (In QA Testing)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Order Details & Tracking Results View */
        <div id="order-tracking-results" className="space-y-6">
          {/* Header Bar with Reset / Search Again */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border-subtle rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-900 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                    Order {order.orderNumber}
                  </h2>
                  {order.isDemo && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md border border-neutral-200">
                      Sample Data
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  Placed on {new Date(order.orderDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })} • {order.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="order-tracking-toggle-display-btn"
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isDetailsExpanded
                    ? 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800'
                    : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400'
                }`}
                aria-expanded={isDetailsExpanded}
                aria-controls="order-tracking-details-content"
                title={isDetailsExpanded ? 'Collapse tracking details' : 'Expand tracking details'}
              >
                {isDetailsExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Collapse Details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Expand Details</span>
                  </>
                )}
              </button>
              <button
                type="button"
                id="order-tracking-print-btn"
                onClick={handlePrintReceipt}
                className="px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                title="Print delivery status"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Receipt</span>
              </button>
              <button
                type="button"
                id="order-tracking-reset-btn"
                onClick={handleReset}
                className="px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Track Another</span>
              </button>
            </div>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {!isDetailsExpanded ? (
              /* Collapsed Compact State Card with Smooth Entry */
              <motion.div
                key="compact-summary"
                id="order-tracking-compact-summary"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const badge = getStatusBadge(order.status)
                      return (
                        <div className={`p-3 rounded-xl border ${badge.bg} shrink-0`}>
                          {badge.icon}
                        </div>
                      )
                    })()}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          {order.statusLabel}
                        </span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-xs font-medium text-neutral-700">
                          {order.carrier.name} ({order.carrier.trackingNumber})
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-neutral-900">
                        {order.status === 'delivered'
                          ? 'Package Delivered'
                          : `Estimated: ${order.estimatedDeliveryDate}`}
                      </h3>
                      <p className="text-xs text-neutral-600 mt-0.5 line-clamp-1">
                        {order.statusMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
                    <button
                      type="button"
                      id="compact-toggle-expand-btn"
                      onClick={() => setIsDetailsExpanded(true)}
                      className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <span>Expand Tracking Details</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Expanded Full Details Section with Smooth Animation */
              <motion.div
                key="full-details"
                id="order-tracking-details-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 overflow-hidden"
              >
                {/* Primary Status Banner & Carrier Card */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Status Hero Block */}
                  <div className="md:col-span-7 bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Delivery Status
                        </span>
                        {(() => {
                          const badge = getStatusBadge(order.status)
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                              {order.statusLabel}
                            </span>
                          )
                        })()}
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mb-2">
                        {order.status === 'delivered' ? 'Package Delivered' : `Estimated: ${order.estimatedDeliveryDate}`}
                      </h3>
                      <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                        {order.statusMessage}
                      </p>
                    </div>

                    {/* Delivery Progress Bar */}
                    <div className="pt-4 border-t border-border-subtle">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 mb-2">
                        <span>Order Placed</span>
                        <span>Lab QA</span>
                        <span>In Transit</span>
                        <span>Out for Delivery</span>
                        <span>Delivered</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-500 ${
                            order.status === 'delivered'
                              ? 'w-full bg-emerald-500'
                              : order.status === 'out_for_delivery'
                              ? 'w-4/5 bg-blue-500'
                              : order.status === 'shipped'
                              ? 'w-3/5 bg-indigo-500'
                              : 'w-1/4 bg-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Carrier & Tracking Code Card */}
                  <div className="md:col-span-5 bg-neutral-50/80 border border-border-subtle rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Carrier Logistics
                        </span>
                        <div className="p-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-800">
                          <Truck className="w-4 h-4" />
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-neutral-900 mb-1">
                        {order.carrier.name}
                      </h4>
                      <p className="text-xs text-neutral-600 mb-4">
                        Service: <span className="font-medium text-neutral-800">{order.shippingMethod}</span>
                      </p>

                      <div className="p-3 bg-white border border-neutral-200 rounded-xl mb-3">
                        <span className="block text-[10px] uppercase font-semibold tracking-wider text-neutral-500 mb-1">
                          Tracking Number
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs sm:text-sm font-mono font-bold text-neutral-900 break-all">
                            {order.carrier.trackingNumber}
                          </code>
                          <button
                            type="button"
                            id="copy-tracking-button"
                            onClick={() => handleCopyTracking(order.carrier.trackingNumber)}
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors shrink-0 cursor-pointer"
                            title="Copy tracking number"
                            aria-label="Copy tracking number"
                          >
                            {copiedTracking ? (
                              <span className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {order.carrier.trackingUrl && order.carrier.trackingUrl !== '#' && (
                      <a
                        href={order.carrier.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <span>Track on {order.carrier.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Timeline Checkpoints */}
                <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs">
                  <h3 className="text-base font-bold text-neutral-900 mb-6 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-700" />
                    <span>Shipment Activity & Checkpoints</span>
                  </h3>

                  <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                    {order.timeline.map((item, idx) => (
                      <div key={item.id || idx} className="relative flex items-start gap-4 group">
                        <div
                          className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-white ${
                            item.status === 'completed'
                              ? 'text-emerald-600'
                              : item.status === 'current'
                              ? 'text-blue-600'
                              : 'text-neutral-300'
                          }`}
                        >
                          {getMilestoneIcon(item)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                            <h4
                              className={`text-sm font-bold ${
                                item.status === 'pending'
                                  ? 'text-neutral-400 font-medium'
                                  : 'text-neutral-900'
                              }`}
                            >
                              {item.title}
                            </h4>
                            <span className="text-xs text-neutral-500 shrink-0 font-medium">
                              {item.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                          {item.location && (
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-neutral-500 font-medium">
                              <MapPin className="w-3 h-3 text-neutral-400" />
                              <span>{item.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items & Shipping Destination Accordion/Card */}
                <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowItems(!showItems)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors cursor-pointer"
                    aria-expanded={showItems}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-neutral-100 text-neutral-800">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                          Items in this Shipment ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
                        </h3>
                        <p className="text-xs text-neutral-500">
                          Delivering to {order.shippingAddress.city}, {order.shippingAddress.province}
                        </p>
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600">
                      {showItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {showItems && (
                      <motion.div
                        key="items-details-panel"
                        id="order-tracking-items-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 border-t border-border-subtle">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
                            {/* Items List */}
                            <div className="lg:col-span-7 space-y-4">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80"
                                >
                                  <div className="w-14 h-14 rounded-lg bg-white border border-neutral-200 overflow-hidden relative shrink-0">
                                    {item.image ? (
                                      <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        sizes="56px"
                                        className="object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                        <Package className="w-6 h-6" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                                      {item.title}
                                    </h4>
                                    {item.variantTitle && (
                                      <p className="text-xs text-neutral-500 truncate">
                                        {item.variantTitle}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-neutral-600 mt-1">
                                      <span>Qty: <strong className="text-neutral-900">{item.quantity}</strong></span>
                                      {item.sku && <span>SKU: {item.sku}</span>}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-sm font-bold text-neutral-900">
                                      ${parseFloat(item.price).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Shipping Address & Order Summary */}
                            <div className="lg:col-span-5 bg-neutral-50/70 p-4 rounded-xl border border-neutral-200 space-y-4 text-xs">
                              <div>
                                <span className="block font-semibold uppercase tracking-wider text-neutral-500 text-[10px] mb-1">
                                  Shipping Address
                                </span>
                                <p className="font-semibold text-neutral-900">{order.shippingAddress.name}</p>
                                <p className="text-neutral-600">{order.shippingAddress.address1}</p>
                                {order.shippingAddress.address2 && (
                                  <p className="text-neutral-600">{order.shippingAddress.address2}</p>
                                )}
                                <p className="text-neutral-600">
                                  {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                                  {order.shippingAddress.zip}
                                </p>
                                <p className="text-neutral-600">{order.shippingAddress.country}</p>
                              </div>

                              <div className="pt-3 border-t border-neutral-200 space-y-1.5">
                                <div className="flex justify-between text-neutral-600">
                                  <span>Subtotal</span>
                                  <span>${parseFloat(order.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-neutral-600">
                                  <span>Shipping</span>
                                  <span>
                                    {parseFloat(order.shippingCost) === 0
                                      ? 'FREE'
                                      : `$${parseFloat(order.shippingCost).toFixed(2)}`}
                                  </span>
                                </div>
                                <div className="flex justify-between text-neutral-600">
                                  <span>Tax</span>
                                  <span>${parseFloat(order.tax).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1.5 border-t border-neutral-200">
                                  <span>Total Paid</span>
                                  <span>${parseFloat(order.total).toFixed(2)} {order.currency}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Help & Support Footer Card */}
                <div className="bg-white border border-border-subtle rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">
                        30-Day Hardware Replacement Guarantee
                      </h4>
                      <p className="text-xs text-neutral-600">
                        Questions about installation or delivery? Our certified technicians are available Mon–Fri.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSupportModal(true)}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Contact Support</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Support Contact Modal */}
      {showSupportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-neutral-700" />
                <span>Order Support</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              When contacting our technician support desk, please reference your Order Number:
            </p>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-center">
              <span className="text-xs text-neutral-500 font-semibold block">Order Reference</span>
              <strong className="text-lg text-neutral-900 font-mono">
                {order ? order.orderNumber : orderId || '#1042'}
              </strong>
            </div>

            <div className="space-y-2 text-xs text-neutral-700 pt-2">
              <div className="p-3 rounded-lg bg-neutral-50 flex items-center justify-between">
                <span>Direct Support Email:</span>
                <a
                  href={`mailto:support@displaycellpros.com?subject=Inquiry for Order ${order?.orderNumber || orderId}`}
                  className="font-semibold text-neutral-900 underline"
                >
                  support@displaycellpros.com
                </a>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 flex items-center justify-between">
                <span>Support Hours:</span>
                <span className="font-medium">Mon–Fri 8:00 AM – 6:00 PM EST</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderTracking
