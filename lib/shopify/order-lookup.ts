/**
 * Real order lookup via the Shopify Admin API (server-only).
 *
 * Finds an order by order number (e.g. "#1042" or "1042") and only returns it
 * when the supplied email matches the order's email (case-insensitive). No
 * demo/fallback data: if Admin isn't configured or the order isn't found, the
 * caller gets an explicit status instead.
 *
 * Admin scopes needed: read_orders (plus read_all_orders for orders older than
 * 60 days) and protected customer data access for email, name and address.
 */

import { shopifyAdminFetch, isShopifyAdminConfigured } from '../../services/shopify-admin.ts'
import type {
  OrderTrackingData,
  TrackedItem,
  TrackingMilestone,
} from '../../services/shopify-orders.ts'

if (typeof window !== 'undefined') {
  throw new Error('lib/shopify/order-lookup is server-only and must not be bundled for the browser.')
}

export type OrderLookupOutcome =
  | { status: 'found'; order: OrderTrackingData }
  | { status: 'not_found' }
  | { status: 'invalid'; message: string }
  | { status: 'not_configured'; message: string }
  | { status: 'error'; message: string }

const ORDER_NUMBER_RE = /^[A-Za-z0-9-]{1,32}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const ORDER_LOOKUP_QUERY = `
query OrderLookup($query: String!) {
  orders(first: 5, query: $query, sortKey: CREATED_AT, reverse: true) {
    nodes {
      id
      name
      email
      createdAt
      cancelledAt
      displayFinancialStatus
      displayFulfillmentStatus
      currentSubtotalPriceSet { shopMoney { amount currencyCode } }
      totalShippingPriceSet { shopMoney { amount currencyCode } }
      currentTotalTaxSet { shopMoney { amount currencyCode } }
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      shippingLine { title }
      shippingAddress { name address1 address2 city province zip country }
      lineItems(first: 50) {
        nodes {
          id
          title
          variantTitle
          sku
          quantity
          originalUnitPriceSet { shopMoney { amount currencyCode } }
        }
      }
      fulfillments(first: 10) {
        status
        displayStatus
        createdAt
        inTransitAt
        deliveredAt
        estimatedDeliveryAt
        trackingInfo(first: 1) { company number url }
      }
    }
  }
}
`

/** "#1042" / " 1042 " -> "1042"; returns '' when the value isn't a plausible order number. */
export function normalizeOrderNumber(raw: string): string {
  const value = String(raw || '').trim().replace(/^#/, '').trim()
  return ORDER_NUMBER_RE.test(value) ? value : ''
}

export function isPlausibleEmail(raw: string): boolean {
  const value = String(raw || '').trim()
  return value.length <= 254 && EMAIL_RE.test(value)
}

function money(set: any): string {
  const amount = set?.shopMoney?.amount
  return amount === undefined || amount === null ? '0.00' : String(amount)
}

function formatTimestamp(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Stage = OrderTrackingData['status']

const STAGE_LABELS: Record<Stage, { label: string; message: string }> = {
  processing: { label: 'Processing', message: 'We received your order and are getting it ready.' },
  confirmed: { label: 'Confirmed', message: 'Your order is paid and confirmed.' },
  shipped: { label: 'Shipped', message: 'Your order has shipped.' },
  out_for_delivery: { label: 'Out for Delivery', message: 'Your order is out for delivery.' },
  delivered: { label: 'Delivered', message: 'Your order was delivered.' },
  cancelled: { label: 'Cancelled', message: 'This order was cancelled.' },
}

/** Maps an Admin API order node to the tracking shape used by the UI. Exported for tests. */
export function mapAdminOrderToTracking(node: any): OrderTrackingData {
  const fulfillments: any[] = Array.isArray(node?.fulfillments) ? node.fulfillments : []
  const activeFulfillments = fulfillments.filter((f) => !['CANCELLED', 'ERROR', 'FAILURE'].includes(f?.status))
  const latest = activeFulfillments[activeFulfillments.length - 1] || null
  const tracking = latest?.trackingInfo?.[0] || null
  const deliveredAt = activeFulfillments.find((f) => f?.deliveredAt)?.deliveredAt || null
  const outForDelivery = activeFulfillments.some((f) => f?.displayStatus === 'OUT_FOR_DELIVERY')
  const inTransitAt = activeFulfillments.find((f) => f?.inTransitAt)?.inTransitAt || null
  const shippedAt = latest?.createdAt || null
  const financial = String(node?.displayFinancialStatus || '')
  const fulfillmentStatus = String(node?.displayFulfillmentStatus || '')
  const isPaid = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(financial)

  let status: Stage
  if (node?.cancelledAt) status = 'cancelled'
  else if (deliveredAt || activeFulfillments.some((f) => f?.displayStatus === 'DELIVERED')) status = 'delivered'
  else if (outForDelivery) status = 'out_for_delivery'
  else if (activeFulfillments.length > 0 || ['FULFILLED', 'PARTIALLY_FULFILLED'].includes(fulfillmentStatus))
    status = 'shipped'
  else if (isPaid) status = 'confirmed'
  else status = 'processing'

  const order = ['processing', 'confirmed', 'shipped', 'out_for_delivery', 'delivered']
  const reached = status === 'cancelled' ? 0 : order.indexOf(status)
  const milestoneState = (index: number): TrackingMilestone['status'] =>
    status === 'cancelled' ? (index === 0 ? 'completed' : 'pending') : index < reached ? 'completed' : index === reached ? 'current' : 'pending'

  const timeline: TrackingMilestone[] = [
    {
      id: 'order_placed',
      title: 'Order placed',
      description: 'Your order was received.',
      timestamp: formatTimestamp(node?.createdAt),
      status: status === 'processing' ? 'current' : 'completed',
      iconType: 'order_placed',
    },
    {
      id: 'confirmed',
      title: 'Payment confirmed',
      description: isPaid ? 'Payment received.' : 'Waiting for payment confirmation.',
      timestamp: '',
      status: milestoneState(1),
      iconType: 'confirmed',
    },
    {
      id: 'shipped',
      title: 'Shipped',
      description: tracking?.company ? `Handed to ${tracking.company}.` : 'Not shipped yet.',
      timestamp: formatTimestamp(inTransitAt || shippedAt),
      status: milestoneState(2),
      iconType: 'shipped',
    },
    {
      id: 'out_for_delivery',
      title: 'Out for delivery',
      description: outForDelivery ? 'Out for delivery today.' : 'Not out for delivery yet.',
      timestamp: '',
      status: milestoneState(3),
      iconType: 'out_for_delivery',
    },
    {
      id: 'delivered',
      title: 'Delivered',
      description: deliveredAt ? 'Delivered.' : 'Not delivered yet.',
      timestamp: formatTimestamp(deliveredAt),
      status: status === 'delivered' ? 'completed' : milestoneState(4),
      iconType: 'delivered',
    },
  ]
  if (status === 'cancelled') {
    timeline.forEach((m) => {
      if (m.id !== 'order_placed') m.status = 'pending'
    })
  }

  const items: TrackedItem[] = (node?.lineItems?.nodes || []).map((li: any) => ({
    id: String(li?.id || ''),
    title: String(li?.title || 'Item'),
    variantTitle: li?.variantTitle || undefined,
    sku: li?.sku || undefined,
    quantity: Number(li?.quantity) || 0,
    price: money(li?.originalUnitPriceSet),
  }))

  const address = node?.shippingAddress || {}
  const stage = STAGE_LABELS[status]

  return {
    orderId: String(node?.id || ''),
    orderNumber: String(node?.name || ''),
    email: String(node?.email || ''),
    orderDate: String(node?.createdAt || ''),
    estimatedDeliveryDate: formatDate(latest?.estimatedDeliveryAt) || 'Not available yet',
    status,
    statusLabel: stage.label,
    statusMessage: stage.message,
    financialStatus: financial || undefined,
    fulfillmentStatus: fulfillmentStatus || undefined,
    carrier: {
      name: tracking?.company || (status === 'processing' || status === 'confirmed' ? 'Not shipped yet' : 'Carrier not provided'),
      code: String(tracking?.company || '').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      trackingNumber: tracking?.number || 'Not assigned yet',
      trackingUrl: tracking?.url || '#',
    },
    shippingAddress: {
      name: String(address.name || ''),
      address1: String(address.address1 || ''),
      address2: address.address2 || undefined,
      city: String(address.city || ''),
      province: String(address.province || ''),
      zip: String(address.zip || ''),
      country: String(address.country || ''),
    },
    timeline,
    items,
    subtotal: money(node?.currentSubtotalPriceSet),
    shippingCost: money(node?.totalShippingPriceSet),
    tax: money(node?.currentTotalTaxSet),
    total: money(node?.currentTotalPriceSet),
    currency: node?.currentTotalPriceSet?.shopMoney?.currencyCode || 'USD',
    shippingMethod: node?.shippingLine?.title || 'Not specified',
    isDemo: false,
    isVerified: true,
  }
}

/** Looks up a real order by number + email. Never returns placeholder data. */
export async function lookupOrderByNumberAndEmail(params: {
  orderNumber: string
  email: string
}): Promise<OrderLookupOutcome> {
  const orderNumber = normalizeOrderNumber(params.orderNumber)
  const email = String(params.email || '').trim().toLowerCase()

  if (!orderNumber) {
    return { status: 'invalid', message: 'Please enter a valid order number (e.g., #1042).' }
  }
  if (!isPlausibleEmail(email)) {
    return { status: 'invalid', message: 'Please enter the email address used when placing the order.' }
  }

  if (!isShopifyAdminConfigured()) {
    return {
      status: 'not_configured',
      message: 'Online order tracking is temporarily unavailable. Please contact us with your order number and we will look it up for you.',
    }
  }

  const result = await shopifyAdminFetch<{ orders?: { nodes?: any[] } }>({
    query: ORDER_LOOKUP_QUERY,
    variables: { query: `name:#${orderNumber} OR name:${orderNumber}` },
  })

  if (result.notConfigured) {
    return {
      status: 'not_configured',
      message: 'Online order tracking is temporarily unavailable. Please contact us with your order number and we will look it up for you.',
    }
  }

  const nodes = result.data?.orders?.nodes
  if (!Array.isArray(nodes)) {
    // Log only the Admin error messages (no customer data, no token).
    console.error(
      '[order-lookup] Shopify Admin order query failed:',
      (result.errors || []).map((e) => e.message).join('; ') || 'no data returned'
    )
    return { status: 'error', message: 'We could not look up your order right now. Please try again shortly.' }
  }

  const match = nodes.find(
    (node) =>
      String(node?.name || '').replace(/^#/, '').toLowerCase() === orderNumber.toLowerCase() &&
      String(node?.email || '').trim().toLowerCase() === email
  )

  if (!match) return { status: 'not_found' }
  return { status: 'found', order: mapAdminOrderToTracking(match) }
}
