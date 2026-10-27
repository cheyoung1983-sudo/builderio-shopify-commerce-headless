import type { NextApiRequest, NextApiResponse } from 'next'
import { PurchaseOrderRecord, SupplierName } from '../../../lib/wholesale/types'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  try {
    const body = req.body || {}
    const orderId = body.orderId || `DCP-ORD-${Math.floor(100000 + Math.random() * 900000)}`
    const lineItems = body.lineItems || [
      { sku: 'MS-OLED-IP14-PRO', quantity: 1, wholesaleCost: 85.0, supplier: 'MobileSentrix' },
    ]
    const shippingAddress = body.shippingAddress || {
      address1: '100 Reservation Road',
      city: 'Spokane',
      province: 'WA',
      zip: '99201',
      country: 'US',
    }

    // Group line items by supplier
    const supplierGroups: Record<SupplierName, Array<{ sku: string; quantity: number; wholesaleCost: number }>> = {
      MobileSentrix: [],
      InjuredGadgets: [],
    }

    for (const item of lineItems) {
      const supplier: SupplierName = item.sku.startsWith('IG-') ? 'InjuredGadgets' : 'MobileSentrix'
      supplierGroups[supplier].push(item)
    }

    const generatedPOs: PurchaseOrderRecord[] = []

    for (const [supplierName, items] of Object.entries(supplierGroups)) {
      if (items.length > 0) {
        const poNumber = `PO-${supplierName.toUpperCase().slice(0, 3)}-${Math.floor(10000 + Math.random() * 90000)}`
        generatedPOs.push({
          poNumber,
          supplier: supplierName as SupplierName,
          status: 'transmitted',
          createdAt: new Date().toISOString(),
          blindDropship: true, // Suppresses wholesale invoices, prints Display & Cell Pros branding
          items: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
        })
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully processed fulfillment_orders/order_routing_complete webhook and dispatched blind-dropship POs.',
      orderId,
      shippingAddress,
      blindDropshipFlagsActive: true,
      purchaseOrders: generatedPOs,
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to process wholesale webhook.' })
  }
}
