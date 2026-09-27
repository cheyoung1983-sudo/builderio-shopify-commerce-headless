import type { NextApiRequest, NextApiResponse } from 'next'
import {
  applyCors,
  handleOptions,
  isAllowedOrigin,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '@lib/api-security'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) {
    return
  }

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ error: 'Origin not allowed' })
  }

  const manifest = {
    service: 'Display & Cell Pros Shopify Headless Agent Middleware',
    version: '1.0.0',
    description:
      'Tool definitions for ElevenLabs Conversational AI Agent to query inventory, get repair pricing, build Shopify carts with custom repair attributes, and generate refreshable checkout URLs.',
    tools: [
      {
        name: 'check_inventory',
        description:
          'Check real-time stock availability and inventory levels for a specific device model, screen replacement, or repair part in the Shopify catalog.',
        parameters: {
          type: 'object',
          properties: {
            handle: {
              type: 'string',
              description: 'The product handle (slug) e.g., "iphone-14-pro-screen-replacement"',
            },
            variantId: {
              type: 'string',
              description: 'Optional Shopify GID for a specific variant e.g. "gid://shopify/ProductVariant/123456"',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_pricing',
        description:
          'Retrieve live retail pricing, compare-at pricing, and warranty terms for a device model or replacement screen variant.',
        parameters: {
          type: 'object',
          properties: {
            handle: {
              type: 'string',
              description: 'The product handle (slug) e.g., "iphone-13-screen-replacement"',
            },
            variantId: {
              type: 'string',
              description: 'Shopify Variant GID',
            },
          },
          required: [],
        },
      },
      {
        name: 'create_repair_cart',
        description:
          'Programmatically build a Shopify Cart with on-site Spokane labor or mail-in kit specifications, customer contact information, device IMEI/serial, and optional tribal tax-exemption verification flag. Returns a hosted checkoutUrl.',
        parameters: {
          type: 'object',
          properties: {
            variantId: {
              type: 'string',
              description: 'The Shopify ProductVariant GID to add to the cart',
            },
            quantity: {
              type: 'number',
              description: 'Number of units / repair services (default: 1)',
            },
            serviceType: {
              type: 'string',
              enum: ['Spokane On-Site', 'Mail-In Kit', 'Walk-In Diagnostic'],
              description: 'Type of repair fulfillment requested',
            },
            deviceModel: {
              type: 'string',
              description: 'Specific device model e.g. "iPhone 14 Pro Max"',
            },
            repairIssue: {
              type: 'string',
              description: 'Description of the damage or repair needed e.g. "Cracked OLED screen & touch failure"',
            },
            customerName: {
              type: 'string',
              description: 'Customer full name',
            },
            customerEmail: {
              type: 'string',
              description: 'Customer email address for order confirmation',
            },
            customerPhone: {
              type: 'string',
              description: 'Customer phone number for technician dispatch',
            },
            preferredTimeWindow: {
              type: 'string',
              description: 'Requested repair time window e.g. "Today between 2-4 PM"',
            },
            tribalExemptionRequested: {
              type: 'boolean',
              description: 'Set to true if customer requests tribal tax exemption (tagged in Shopify Flow for Avalara review)',
            },
            taxExemptionId: {
              type: 'string',
              description: 'Tribal or state tax exemption certificate number if provided',
            },
            notes: {
              type: 'string',
              description: 'Any special technician notes or gate code access instructions',
            },
          },
          required: ['variantId'],
        },
      },
      {
        name: 'refresh_checkout',
        description:
          'Generates a fresh, non-expired checkout URL for an existing cart ID prior to rendering desktop-to-mobile QR codes.',
        parameters: {
          type: 'object',
          properties: {
            cartId: {
              type: 'string',
              description: 'The Shopify Cart GID (e.g. "gid://shopify/Cart/c1-...")',
            },
          },
          required: ['cartId'],
        },
      },
    ],
  }

  return res.status(200).json(manifest)
}
