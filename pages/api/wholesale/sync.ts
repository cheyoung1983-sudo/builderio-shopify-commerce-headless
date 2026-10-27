import type { NextApiRequest, NextApiResponse } from 'next'
import { MOCK_SUPPLIER_CATALOG } from '../../../lib/wholesale/supplier-simulator'
import { transformSupplierProduct, DEFAULT_TARGET_MARGIN, DEFAULT_SHIPPING_FEE, DEFAULT_SAFETY_BUFFER } from '../../../lib/wholesale/middleware'
import { TransformedShopifyVariant } from '../../../lib/wholesale/types'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  try {
    const targetMargin = req.body?.targetMargin ? parseFloat(req.body.targetMargin) : DEFAULT_TARGET_MARGIN
    const shippingFee = req.body?.shippingFee ? parseFloat(req.body.shippingFee) : DEFAULT_SHIPPING_FEE
    const safetyBuffer = req.body?.safetyBuffer ? parseInt(req.body.safetyBuffer, 10) : DEFAULT_SAFETY_BUFFER

    const transformedVariants: TransformedShopifyVariant[] = MOCK_SUPPLIER_CATALOG.map((item) =>
      transformSupplierProduct(item, targetMargin, shippingFee, safetyBuffer)
    )

    return res.status(200).json({
      success: true,
      syncedAt: new Date().toISOString(),
      totalProducts: transformedVariants.length,
      variants: transformedVariants,
      governance: {
        mapFloorEnforced: true,
        safetyBufferApplied: safetyBuffer,
        targetMarginPercentage: targetMargin * 100,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to sync supplier catalog.' })
  }
}
