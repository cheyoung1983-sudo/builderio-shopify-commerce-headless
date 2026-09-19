import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  return res.status(200).json({
    name: 'DisplayCellPros Agent Integration API',
    description:
      'Backend endpoints providing Shopify Storefront catalog and cart integration along with Builder.io content access for Google AI Studio agents.',
    endpoints: {
      searchProducts: {
        method: 'POST / GET',
        url: '/api/agent/search',
        parameters: {
          query: 'string (e.g. "screen replacement", "Samsung Galaxy S22")',
          first: 'number (optional, default 5, max 25)',
        },
      },
      createCart: {
        method: 'POST',
        url: '/api/agent/cart',
        parameters: {
          lines: 'array of { merchandiseId: string, quantity: number }',
        },
      },
      getContent: {
        method: 'POST / GET',
        url: '/api/agent/content',
        parameters: {
          model: 'string (e.g. "page", "faq", "announcement-bar")',
          query: 'string (optional name filter)',
        },
      },
    },
    tools: [
      {
        name: 'search_products',
        description:
          'Searches the DisplayCellPros product and repair service catalog via Shopify Storefront GraphQL API.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description:
                'Product category, device model, or search term (e.g., "iPhone 13 screen replacement", "OLED display")',
            },
            first: {
              type: 'INTEGER',
              description: 'Number of products to return (default: 5, max: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_cart',
        description:
          'Creates a Shopify checkout cart with specified product variant IDs and quantities, returning a direct checkout URL.',
        parameters: {
          type: 'OBJECT',
          properties: {
            lines: {
              type: 'ARRAY',
              description: 'Items to add to checkout cart',
              items: {
                type: 'OBJECT',
                properties: {
                  merchandiseId: {
                    type: 'STRING',
                    description: 'Shopify Variant GID (e.g. "gid://shopify/ProductVariant/123456789")',
                  },
                  quantity: {
                    type: 'INTEGER',
                    description: 'Quantity of items to purchase',
                  },
                },
                required: ['merchandiseId', 'quantity'],
              },
            },
          },
          required: ['lines'],
        },
      },
      {
        name: 'get_builder_content',
        description:
          'Fetches CMS content, warranty guides, or announcement entries from Builder.io.',
        parameters: {
          type: 'OBJECT',
          properties: {
            model: {
              type: 'STRING',
              description: 'Builder.io model name (e.g. "page", "faq", "announcement-bar")',
            },
            query: {
              type: 'STRING',
              description: 'Optional entry name or keyword to filter',
            },
          },
          required: ['model'],
        },
      },
    ],
  })
}
