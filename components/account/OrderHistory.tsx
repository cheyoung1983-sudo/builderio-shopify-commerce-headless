import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Receipt,
  ShoppingBag,
  ArrowRight,
  Calendar,
  CreditCard,
  RotateCcw,
} from 'lucide-react'
import type { CustomerOrder } from '@services/shopify-customer-account'

export interface OrderHistoryProps {
  orders: CustomerOrder[]
  customerEmail?: string
  className?: string
}

// Fallback demo orders for testing and visualization
export const SAMPLE_ACCOUNT_ORDERS: CustomerOrder[] = [
  {
    id: 'gid://shopify/Order/1042',
    name: '#1042',
    number: 1042,
    processedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    fulfillmentStatus: 'IN_TRANSIT',
    financialStatus: 'PAID',
    totalPrice: {
      amount: '336.50',
      currencyCode: 'USD',
    },
    lineItems: {
      edges: [
        {
          node: {
            id: 'li-1',
            title: 'Samsung Galaxy S23 Ultra AMOLED Display Assembly',
            variantTitle: 'Phantom Black / OEM Grade',
            quantity: 1,
            price: { amount: '289.99', currencyCode: 'USD' },
            image: {
              url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=400&q=80',
              altText: 'Samsung Galaxy Display',
            },
          },
        },
        {
          node: {
            id: 'li-2',
            title: 'Precision Mobile Device Opening & Adhesive Kit',
            variantTitle: 'Pro Technician Pack',
            quantity: 1,
            price: { amount: '24.50', currencyCode: 'USD' },
            image: {
              url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
              altText: 'Adhesive Kit',
            },
          },
        },
      ],
    },
  },
  {
    id: 'gid://shopify/Order/1038',
    name: '#1038',
    number: 1038,
    processedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    fulfillmentStatus: 'FULFILLED',
    financialStatus: 'PAID',
    totalPrice: {
      amount: '346.12',
      currencyCode: 'USD',
    },
    lineItems: {
      edges: [
        {
          node: {
            id: 'li-3',
            title: 'iPhone 14 Pro Max Super Retina XDR OLED Screen',
            variantTitle: 'OEM Refurbished with Frame',
            quantity: 1,
            price: { amount: '319.00', currencyCode: 'USD' },
            image: {
              url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80',
              altText: 'iPhone OLED Screen',
            },
          },
        },
      ],
    },
  },
  {
    id: 'gid://shopify/Order/1045',
    name: '#1045',
    number: 1045,
    processedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    fulfillmentStatus: 'UNFULFILLED',
    financialStatus: 'PAID',
    totalPrice: {
      amount: '253.87',
      currencyCode: 'USD',
    },
    lineItems: {
      edges: [
        {
          node: {
            id: 'li-4',
            title: 'Google Pixel 8 Pro OLED Screen Assembly',
            variantTitle: 'Obsidian Black',
            quantity: 1,
            price: { amount: '229.00', currencyCode: 'USD' },
            image: {
              url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=400&q=80',
              altText: 'Pixel 8 Pro Screen',
            },
          },
        },
      ],
    },
  },
]

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  customerEmail = '',
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_TRANSIT' | 'FULFILLED' | 'UNFULFILLED'>('ALL')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [useSampleFallback, setUseSampleFallback] = useState(false)

  // Use real orders, or sample fallback if explicitly toggled or empty
  const activeOrdersList = useMemo(() => {
    if (orders && orders.length > 0) return orders
    if (useSampleFallback) return SAMPLE_ACCOUNT_ORDERS
    return []
  }, [orders, useSampleFallback])

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    return activeOrdersList.filter((order) => {
      const matchSearch =
        !searchTerm ||
        order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(order.number || '').includes(searchTerm) ||
        (order.lineItems?.edges || []).some((item) =>
          item.node.title.toLowerCase().includes(searchTerm.toLowerCase())
        )

      if (!matchSearch) return false

      if (statusFilter === 'ALL') return true

      const fStatus = (order.fulfillmentStatus || 'UNFULFILLED').toUpperCase()
      if (statusFilter === 'FULFILLED') {
        return fStatus === 'FULFILLED' || fStatus === 'DELIVERED'
      }
      if (statusFilter === 'IN_TRANSIT') {
        return fStatus === 'IN_TRANSIT' || fStatus === 'OUT_FOR_DELIVERY' || fStatus === 'PARTIALLY_FULFILLED'
      }
      if (statusFilter === 'UNFULFILLED') {
        return fStatus === 'UNFULFILLED' || fStatus === 'PROCESSING' || fStatus === 'ON_HOLD'
      }

      return true
    })
  }, [activeOrdersList, searchTerm, statusFilter])

  const toggleExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id)
  }

  const getFulfillmentBadge = (status?: string | null) => {
    const s = (status || 'UNFULFILLED').toUpperCase()
    switch (s) {
      case 'FULFILLED':
      case 'DELIVERED':
        return {
          label: 'Delivered',
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        }
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'In Transit',
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          dot: 'bg-blue-500 animate-pulse',
          icon: <Truck className="w-3.5 h-3.5 text-blue-600" />,
        }
      case 'UNFULFILLED':
      case 'PROCESSING':
      default:
        return {
          label: 'Processing QA',
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
        }
    }
  }

  const getFinancialBadge = (status?: string | null) => {
    const s = (status || 'PAID').toUpperCase()
    switch (s) {
      case 'PAID':
        return {
          label: 'Paid',
          bg: 'bg-neutral-100 border-neutral-200 text-neutral-700',
        }
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return {
          label: 'Refunded',
          bg: 'bg-purple-50 border-purple-200 text-purple-700',
        }
      default:
        return {
          label: s,
          bg: 'bg-neutral-100 border-neutral-200 text-neutral-600',
        }
    }
  }

  return (
    <div id="account-order-history-section" className={`space-y-6 ${className}`}>
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              Order History
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
              {activeOrdersList.length} {activeOrdersList.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            View your past component purchases, inspect invoices, and track live carrier milestones.
          </p>
        </div>

        {/* Search & Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="order-history-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order # or item..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
            <button
              type="button"
              id="filter-all-orders"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              id="filter-in-transit-orders"
              onClick={() => setStatusFilter('IN_TRANSIT')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'IN_TRANSIT'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              In Transit
            </button>
            <button
              type="button"
              id="filter-delivered-orders"
              onClick={() => setStatusFilter('FULFILLED')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'FULFILLED'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Delivered
            </button>
            <button
              type="button"
              id="filter-processing-orders"
              onClick={() => setStatusFilter('UNFULFILLED')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'UNFULFILLED'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Processing
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const fBadge = getFulfillmentBadge(order.fulfillmentStatus)
            const payBadge = getFinancialBadge(order.financialStatus)
            const lineItems = order.lineItems?.edges || []
            const totalQuantity = lineItems.reduce((sum, item) => sum + (item.node.quantity || 1), 0)
            const isExpanded = expandedOrderId === order.id
            const orderCleanNumber = order.name.replace(/^#/, '')
            const trackingHref = `/order-tracking?orderId=${encodeURIComponent(order.name)}${
              customerEmail ? `&email=${encodeURIComponent(customerEmail)}` : ''
            }`

            return (
              <div
                key={order.id}
                id={`order-card-${orderCleanNumber}`}
                className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs hover:border-neutral-300 transition-colors"
              >
                {/* Main Order Header Strip */}
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="p-3 rounded-xl bg-neutral-100 text-neutral-900 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-bold text-neutral-900">
                          {order.name}
                        </span>

                        {/* Status Badges */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${fBadge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${fBadge.dot}`} />
                          {fBadge.label}
                        </span>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${payBadge.bg}`}
                        >
                          {payBadge.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(order.processedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </span>
                        <span>•</span>
                        <span>{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</span>
                        <span>•</span>
                        <span className="font-semibold text-neutral-900">
                          ${parseFloat(order.totalPrice?.amount || '0').toFixed(2)}{' '}
                          {order.totalPrice?.currencyCode || 'USD'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Track Package CTA + Expand Details */}
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <Link
                      href={trackingHref}
                      id={`track-btn-${orderCleanNumber}`}
                      className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Track Details</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                    </Link>

                    <button
                      type="button"
                      id={`expand-order-${orderCleanNumber}`}
                      onClick={() => toggleExpand(order.id)}
                      className="p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title={isExpanded ? 'Hide items' : 'View order items'}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Line Items Preview Thumbnails Bar */}
                <div className="px-5 sm:px-6 pb-4 pt-0">
                  <div className="flex items-center gap-3 overflow-x-auto py-1">
                    {lineItems.map((item) => (
                      <div
                        key={item.node.id}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50/90 border border-neutral-200/70 shrink-0 max-w-xs"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 overflow-hidden relative shrink-0">
                          {item.node.image?.url ? (
                            <Image
                              src={item.node.image.url}
                              alt={item.node.image.altText || item.node.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 pr-1">
                          <p className="text-xs font-medium text-neutral-900 truncate max-w-[160px]">
                            {item.node.title}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            Qty: {item.node.quantity} • ${parseFloat(item.node.price?.amount || '0').toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expandable Order Detail Manifest */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-neutral-50/50 border-t border-border-subtle space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Purchased Line Items
                    </h4>

                    <div className="space-y-3">
                      {lineItems.map((item) => (
                        <div
                          key={item.node.id}
                          className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-neutral-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden relative shrink-0">
                              {item.node.image?.url ? (
                                <Image
                                  src={item.node.image.url}
                                  alt={item.node.image.altText || item.node.title}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-neutral-900">
                                {item.node.title}
                              </p>
                              {item.node.variantTitle && (
                                <p className="text-xs text-neutral-500">
                                  {item.node.variantTitle}
                                </p>
                              )}
                              <p className="text-xs text-neutral-600">
                                Quantity: <strong className="text-neutral-900">{item.node.quantity}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-neutral-900">
                              ${parseFloat(item.node.price?.amount || '0').toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-200 text-xs text-neutral-600">
                      <span>Order ID: <code className="font-mono text-neutral-800">{order.id}</code></span>
                      <Link
                        href={trackingHref}
                        className="font-semibold text-neutral-900 underline hover:text-neutral-700 inline-flex items-center gap-1"
                      >
                        <span>Open Full Delivery Tracking & Live Milestones</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div
          id="order-history-empty"
          className="bg-white border border-border-subtle rounded-2xl p-10 sm:p-14 text-center shadow-xs"
        >
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-600 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No matching orders found'
              : 'No order history yet'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto mb-6 leading-relaxed">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your search keywords or clearing your status filters.'
              : 'When you purchase replacement screens, batteries, or toolkits, your orders and tracking details will appear here.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {searchTerm || statusFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                }}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            ) : (
              <>
                <Link
                  href="/products"
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors"
                >
                  Browse Hardware Catalog
                </Link>

                <button
                  type="button"
                  id="preview-sample-orders-btn"
                  onClick={() => setUseSampleFallback(true)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold border border-neutral-200 transition-colors cursor-pointer"
                >
                  Preview Sample Order History
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderHistory
