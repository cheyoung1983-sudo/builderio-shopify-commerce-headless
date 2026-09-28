import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getShopifyDomain,
  getStorefrontAccessToken,
  getShopifyApiVersion,
} from '@config/shopify'
import {
  applyCors,
  handleOptions,
  isAllowedOrigin,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '@lib/api-security'

export interface CartActionRequest {
  action: 'check_inventory' | 'get_pricing' | 'create_cart' | 'add_lines' | 'refresh_checkout'
  // Common parameters
  variantId?: string
  productId?: string
  handle?: string
  quantity?: number
  cartId?: string
  // Repair & Customer metadata
  customerEmail?: string
  customerPhone?: string
  customerName?: string
  serviceType?: 'Spokane On-Site' | 'Mail-In Kit' | 'Walk-In Diagnostic' | string
  deviceModel?: string
  repairIssue?: string
  imeiSerial?: string
  preferredTimeWindow?: string
  tribalExemptionRequested?: boolean
  taxExemptionId?: string
  notes?: string
  lines?: Array<{ variantId: string; quantity: number }>
}

async function executeStorefrontGraphQL(query: string, variables: Record<string, any> = {}) {
  const domain = getShopifyDomain()
  const token = getStorefrontAccessToken()
  const apiVersion = getShopifyApiVersion()

  if (!token) {
    throw new Error('Shopify Storefront Access Token is not configured.')
  }

  const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Shopify Storefront API returned HTTP ${res.status}: ${errorText}`)
  }

  const json = await res.json()
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((e: any) => e.message).join(', '))
  }

  return json.data
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) {
    return
  }

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ success: false, error: 'Origin not allowed' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` })
  }

  try {
    const body: CartActionRequest = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { action } = body

    if (!action) {
      return res.status(400).json({ success: false, error: 'Missing required "action" parameter' })
    }

    switch (action) {
      case 'check_inventory': {
        const { handle, variantId } = body
        if (!handle && !variantId) {
          return res.status(400).json({
            success: false,
            error: 'Must provide either "handle" or "variantId" to check inventory',
          })
        }

        if (handle) {
          const query = `
            query CheckProductInventory($handle: String!) {
              product(handle: $handle) {
                id
                title
                availableForSale
                totalInventory
                variants(first: 20) {
                  edges {
                    node {
                      id
                      title
                      availableForSale
                      quantityAvailable
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          `
          const data = await executeStorefrontGraphQL(query, { handle })
          const product = data?.product

          if (!product) {
            return res.status(404).json({ success: false, error: `Product not found: ${handle}` })
          }

          return res.status(200).json({
            success: true,
            action: 'check_inventory',
            product: {
              id: product.id,
              title: product.title,
              availableForSale: product.availableForSale,
              totalInventory: product.totalInventory,
              variants: product.variants.edges.map(({ node }: any) => ({
                id: node.id,
                title: node.title,
                availableForSale: node.availableForSale,
                quantityAvailable: node.quantityAvailable,
                price: node.price?.amount,
                currencyCode: node.price?.currencyCode || 'USD',
              })),
            },
          })
        }

        // Check single variant by ID
        const query = `
          query CheckVariantInventory($id: ID!) {
            node(id: $id) {
              ... on ProductVariant {
                id
                title
                availableForSale
                quantityAvailable
                price {
                  amount
                  currencyCode
                }
                product {
                  id
                  title
                  handle
                }
              }
            }
          }
        `
        const data = await executeStorefrontGraphQL(query, { id: variantId })
        const variant = data?.node

        if (!variant) {
          return res.status(404).json({ success: false, error: `Variant not found: ${variantId}` })
        }

        return res.status(200).json({
          success: true,
          action: 'check_inventory',
          variant: {
            id: variant.id,
            title: variant.title,
            availableForSale: variant.availableForSale,
            quantityAvailable: variant.quantityAvailable,
            price: variant.price?.amount,
            currencyCode: variant.price?.currencyCode || 'USD',
            productTitle: variant.product?.title,
            productHandle: variant.product?.handle,
          },
        })
      }

      case 'get_pricing': {
        const { handle, variantId } = body
        const query = handle
          ? `
            query GetPricingByHandle($handle: String!) {
              product(handle: $handle) {
                id
                title
                handle
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      compareAtPrice {
                        amount
                        currencyCode
                      }
                      availableForSale
                    }
                  }
                }
              }
            }
          `
          : `
            query GetPricingById($id: ID!) {
              node(id: $id) {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  availableForSale
                  product {
                    id
                    title
                    handle
                  }
                }
              }
            }
          `

        const data = await executeStorefrontGraphQL(query, handle ? { handle } : { id: variantId })
        return res.status(200).json({
          success: true,
          action: 'get_pricing',
          data: handle ? data?.product : data?.node,
        })
      }

      case 'create_cart': {
        const {
          variantId,
          quantity = 1,
          lines = [],
          customerEmail,
          customerPhone,
          customerName,
          serviceType = 'Spokane On-Site',
          deviceModel,
          repairIssue,
          imeiSerial,
          preferredTimeWindow,
          tribalExemptionRequested = false,
          taxExemptionId,
          notes,
        } = body

        // Prepare line items
        const cartLines: Array<{ merchandiseId: string; quantity: number }> = []
        if (variantId) {
          const boundedQuantity = Math.min(Math.max(parseInt(String(quantity || 1), 10) || 1, 1), 100)
          cartLines.push({ merchandiseId: String(variantId).trim().slice(0, 256), quantity: boundedQuantity })
        }
        if (Array.isArray(lines)) {
          lines.forEach((l) => {
            if (l.variantId) {
              const boundedQuantity = Math.min(Math.max(parseInt(String(l.quantity || 1), 10) || 1, 1), 100)
              cartLines.push({ merchandiseId: String(l.variantId).trim().slice(0, 256), quantity: boundedQuantity })
            }
          })
        }

        if (cartLines.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Cart must contain at least one line item (provide "variantId" or "lines")',
          })
        }

        if (cartLines.length > 50) {
          return res.status(400).json({
            success: false,
            error: 'Maximum 50 line items allowed per cart',
          })
        }

        // Custom attributes for downstream Shopify Flow and order processing
        const customAttributes: Array<{ key: string; value: string }> = [
          { key: '_source', value: 'ElevenLabs AI Customer Service Agent' },
          { key: '_service_type', value: String(serviceType) },
          { key: '_tribal_exemption_requested', value: tribalExemptionRequested ? 'true' : 'false' },
        ]

        if (deviceModel) customAttributes.push({ key: '_device_model', value: String(deviceModel) })
        if (repairIssue) customAttributes.push({ key: '_repair_issue', value: String(repairIssue) })
        if (imeiSerial) customAttributes.push({ key: '_imei_serial', value: String(imeiSerial) })
        if (customerPhone) customAttributes.push({ key: '_customer_phone', value: String(customerPhone) })
        if (customerName) customAttributes.push({ key: '_customer_name', value: String(customerName) })
        if (preferredTimeWindow) customAttributes.push({ key: '_preferred_time_window', value: String(preferredTimeWindow) })
        if (taxExemptionId) customAttributes.push({ key: '_tax_exemption_id', value: String(taxExemptionId) })
        if (notes) customAttributes.push({ key: '_repair_notes', value: String(notes) })

        const input: Record<string, any> = {
          lines: cartLines,
          attributes: customAttributes,
        }

        if (customerEmail) {
          input.buyerIdentity = { email: customerEmail }
        }

        const mutation = `
          mutation CreateRepairCart($input: CartInput!) {
            cartCreate(input: $input) {
              cart {
                id
                checkoutUrl
                totalQuantity
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                  subtotalAmount {
                    amount
                    currencyCode
                  }
                  totalTaxAmount {
                    amount
                    currencyCode
                  }
                }
                lines(first: 10) {
                  edges {
                    node {
                      id
                      quantity
                      merchandise {
                        ... on ProductVariant {
                          id
                          title
                          price {
                            amount
                            currencyCode
                          }
                          product {
                            id
                            title
                            handle
                            featuredImage {
                              url
                              altText
                            }
                          }
                        }
                      }
                    }
                  }
                }
                attributes {
                  key
                  value
                }
              }
              userErrors {
                field
                message
                code
              }
            }
          }
        `

        const data = await executeStorefrontGraphQL(mutation, { input })
        const payload = data?.cartCreate

        if (payload?.userErrors && payload.userErrors.length > 0) {
          const errMsg = payload.userErrors.map((e: any) => `${e.field}: ${e.message}`).join('; ')
          return res.status(400).json({ success: false, error: errMsg, userErrors: payload.userErrors })
        }

        const cart = payload?.cart
        if (!cart) {
          return res.status(500).json({ success: false, error: 'Shopify did not return a created cart' })
        }

        return res.status(200).json({
          success: true,
          action: 'create_cart',
          cart: {
            id: cart.id,
            checkoutUrl: cart.checkoutUrl,
            totalQuantity: cart.totalQuantity,
            subtotal: cart.cost?.subtotalAmount?.amount,
            total: cart.cost?.totalAmount?.amount,
            tax: cart.cost?.totalTaxAmount?.amount || '0.00',
            currency: cart.cost?.totalAmount?.currencyCode || 'USD',
            lines: cart.lines.edges.map(({ node }: any) => ({
              id: node.id,
              quantity: node.quantity,
              variantId: node.merchandise?.id,
              variantTitle: node.merchandise?.title,
              price: node.merchandise?.price?.amount,
              productTitle: node.merchandise?.product?.title,
              productHandle: node.merchandise?.product?.handle,
              image: node.merchandise?.product?.featuredImage?.url,
            })),
            attributes: cart.attributes,
          },
        })
      }

      case 'add_lines': {
        const { cartId, lines = [], variantId, quantity = 1 } = body
        if (!cartId) {
          return res.status(400).json({ success: false, error: 'Missing required "cartId" parameter' })
        }

        const cartLines: Array<{ merchandiseId: string; quantity: number }> = []
        if (variantId) {
          const boundedQuantity = Math.min(Math.max(parseInt(String(quantity || 1), 10) || 1, 1), 100)
          cartLines.push({ merchandiseId: String(variantId).trim().slice(0, 256), quantity: boundedQuantity })
        }
        if (Array.isArray(lines)) {
          lines.forEach((l) => {
            if (l.variantId) {
              const boundedQuantity = Math.min(Math.max(parseInt(String(l.quantity || 1), 10) || 1, 1), 100)
              cartLines.push({ merchandiseId: String(l.variantId).trim().slice(0, 256), quantity: boundedQuantity })
            }
          })
        }

        if (cartLines.length === 0) {
          return res.status(400).json({ success: false, error: 'No items provided to add to cart' })
        }

        if (cartLines.length > 50) {
          return res.status(400).json({ success: false, error: 'Maximum 50 line items allowed per cart request' })
        }

        const mutation = `
          mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart {
                id
                checkoutUrl
                totalQuantity
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `

        const data = await executeStorefrontGraphQL(mutation, { cartId, lines: cartLines })
        const payload = data?.cartLinesAdd

        if (payload?.userErrors && payload.userErrors.length > 0) {
          const errMsg = payload.userErrors.map((e: any) => e.message).join('; ')
          return res.status(400).json({ success: false, error: errMsg })
        }

        return res.status(200).json({
          success: true,
          action: 'add_lines',
          cart: payload?.cart,
        })
      }

      case 'refresh_checkout': {
        const { cartId } = body
        if (!cartId) {
          return res.status(400).json({ success: false, error: 'Missing required "cartId" parameter' })
        }

        const query = `
          query GetFreshCart($cartId: ID!) {
            cart(id: $cartId) {
              id
              checkoutUrl
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
                subtotalAmount {
                  amount
                  currencyCode
                }
              }
            }
          }
        `

        const data = await executeStorefrontGraphQL(query, { cartId })
        const cart = data?.cart

        if (!cart) {
          return res.status(404).json({ success: false, error: `Cart not found: ${cartId}` })
        }

        return res.status(200).json({
          success: true,
          action: 'refresh_checkout',
          cartId: cart.id,
          checkoutUrl: cart.checkoutUrl,
          totalQuantity: cart.totalQuantity,
          total: cart.cost?.totalAmount?.amount,
          currency: cart.cost?.totalAmount?.currencyCode || 'USD',
        })
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unrecognized action: ${action}. Allowed actions: check_inventory, get_pricing, create_cart, add_lines, refresh_checkout`,
        })
    }
  } catch (error: any) {
    console.error('Error in /api/agent/cart:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error processing cart action',
    })
  }
}
