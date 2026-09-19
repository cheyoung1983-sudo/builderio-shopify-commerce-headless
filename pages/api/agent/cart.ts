import type { NextApiRequest, NextApiResponse } from 'next'
import { createStorefrontCart } from '../../../services/shopify'

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    const rawLines = req.body?.lines ?? (req.body?.merchandiseId ? [req.body] : [])

    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return res.status(400).json({
        ok: false,
        error:
          'Invalid cart input. Please provide a "lines" array with merchandiseId and quantity. Example: {"lines": [{"merchandiseId": "gid://shopify/ProductVariant/123", "quantity": 1}]}',
      })
    }

    const formattedLines = rawLines.map((line: any) => {
      const merchandiseId = String(line?.merchandiseId || line?.variantId || '').trim()
      const quantity = Math.max(parseInt(String(line?.quantity || 1), 10) || 1, 1)
      return {
        merchandiseId,
        quantity,
      }
    }).filter((line) => Boolean(line.merchandiseId))

    if (formattedLines.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'No valid merchandiseId found in lines array.',
      })
    }

    const result = await createStorefrontCart(formattedLines)

    if (!result.ok || result.errors?.length) {
      return res.status(500).json({
        ok: false,
        error: result.errors?.[0]?.message || 'Failed to create Shopify cart',
        details: result.errors,
      })
    }

    const cartCreate = result.data?.cartCreate
    const userErrors = cartCreate?.userErrors || []

    if (userErrors.length > 0) {
      return res.status(400).json({
        ok: false,
        error: userErrors[0]?.message || 'Shopify cart creation error',
        userErrors,
      })
    }

    const cart = cartCreate?.cart

    if (!cart) {
      return res.status(500).json({
        ok: false,
        error: 'Cart was not returned by Shopify Storefront API',
      })
    }

    return res.status(200).json({
      ok: true,
      cartId: cart.id,
      checkoutUrl: cart.checkoutUrl,
      totalQuantity: cart.totalQuantity,
      subtotal: cart.cost?.subtotalAmount
        ? `${cart.cost.subtotalAmount.amount} ${cart.cost.subtotalAmount.currencyCode}`
        : null,
      total: cart.cost?.totalAmount
        ? `${cart.cost.totalAmount.amount} ${cart.cost.totalAmount.currencyCode}`
        : null,
    })
  } catch (error: any) {
    console.error('[API /api/agent/cart] Error creating cart:', error)
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to create cart',
    })
  }
}
