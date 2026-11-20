import type { NextApiRequest, NextApiResponse } from 'next'
import { withWholesaleAuth } from '../../../lib/wholesale/middleware'
import { MOCK_SUPPLIER_CATALOG } from '../../../lib/wholesale/supplier-simulator'
import { TransformedShopifyVariant, SupplierName } from '../../../lib/wholesale/types'

export default withWholesaleAuth(async (req: any, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  try {
    const body = req.body || {}
    const targetMargin = typeof body.targetMargin === 'number' ? body.targetMargin : 0.4
    const shippingFee = typeof body.shippingFee === 'number' ? body.shippingFee : 5.99
    const safetyBuffer = typeof body.safetyBuffer === 'number' ? body.safetyBuffer : 5

    // Transform raw MobileSentrix and InjuredGadgets supplier catalog
    const variants: TransformedShopifyVariant[] = MOCK_SUPPLIER_CATALOG.map((raw) => {
      // Formula: RetailPrice = max(WholesaleCost / (1 - Margin) + Shipping, MAPPrice)
      const calculatedPrice = Number((raw.wholesale_cost / (1 - targetMargin) + shippingFee).toFixed(2))
      const retailPrice = Number(Math.max(calculatedPrice, raw.map_price).toFixed(2))
      const marginPercentage = Number(
        (((retailPrice - raw.wholesale_cost - shippingFee) / retailPrice) * 100).toFixed(1)
      )
      const shopifyAvailableQuantity = Math.max(0, raw.quantity_available - safetyBuffer)

      let status: 'active' | 'out_of_stock' | 'flagged_margin_exceeded' = 'active'
      if (shopifyAvailableQuantity === 0) {
        status = 'out_of_stock'
      } else if (marginPercentage < 25) {
        status = 'flagged_margin_exceeded'
      }

      const prefix = raw.supplier === 'MobileSentrix' ? 'MS' : 'IG'
      const sku = `${prefix}-${raw.vendor_sku}`

      return {
        sku,
        title: raw.name,
        supplier: raw.supplier as SupplierName,
        wholesaleCost: raw.wholesale_cost,
        mapPrice: raw.map_price,
        retailPrice,
        supplierQuantity: raw.quantity_available,
        safetyBuffer,
        shopifyAvailableQuantity,
        weightOz: raw.weight_oz,
        compatibility: raw.device_compatibility,
        marginPercentage,
        status,
      }
    })

    const governance = {
      targetMargin: targetMargin * 100,
      shippingFee,
      safetyBuffer,
      totalSuppliers: 2,
      supplierList: ['MobileSentrix', 'InjuredGadgets'],
      totalSkus: variants.length,
      activeSkus: variants.filter((v) => v.status === 'active').length,
      outOfStockSkus: variants.filter((v) => v.status === 'out_of_stock').length,
      flaggedSkus: variants.filter((v) => v.status === 'flagged_margin_exceeded').length,
      lastSyncTimestamp: new Date().toISOString(),
    }

    return res.status(200).json({
      success: true,
      message: 'Wholesale supplier catalog synchronized with pricing governance.',
      variants,
      governance,
    })
  } catch (err: any) {
    console.error('[api/wholesale/sync] Error:', err)
    return res.status(500).json({ success: false, error: err?.message || 'Failed to sync supplier catalog.' })
  }
})
