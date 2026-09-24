import type {
  ShopifyProductNode,
  ShopifyProductDetailNode,
  ShopifyVariantNode,
  ShopifyImageNode,
} from '../../services/shopify'

export const DEMO_PRODUCTS: ShopifyProductDetailNode[] = [
  {
    id: 'gid://shopify/Product/demo-galaxy-s22-ultra',
    handle: 'galaxy-s22-ultra-oled-screen-assembly',
    title: 'Samsung Galaxy S22 Ultra OLED Screen Assembly with Frame',
    description:
      'Genuine OEM refurbished Dynamic AMOLED 2X capacitive touchscreen digitizer assembly for Samsung Galaxy S22 Ultra (SM-S908U, SM-S908B). Includes pre-installed aluminum frame, volume/power button flex, and ear speaker mesh. Supports 120Hz refresh rate and HDR10+ with factory color calibration.',
    descriptionHtml:
      '<p>Genuine OEM refurbished <strong>Dynamic AMOLED 2X</strong> capacitive touchscreen digitizer assembly for Samsung Galaxy S22 Ultra (SM-S908U, SM-S908B). Includes pre-installed aluminum frame, volume/power button flex, and ear speaker mesh.</p><ul><li>Supports dynamic 120Hz refresh rate</li><li>HDR10+ with factory color calibration</li><li>High touch-sensitivity digitizer supporting S-Pen</li><li>1-year DisplayCellPros warranty</li></ul>',
    availableForSale: true,
    productType: 'Screen Replacement',
    vendor: 'DisplayCellPros',
    tags: ['Samsung', 'Galaxy S22', 'OLED', 'Screen Replacement', 'Display', 'OEM', 'Ultra'],
    priceRange: {
      minVariantPrice: { amount: '189.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '219.99', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '249.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '279.99', currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1000&q=80',
      altText: 'Samsung Galaxy S22 Ultra OLED Screen Assembly',
      width: 1000,
      height: 1000,
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1000&q=80',
            altText: 'Samsung Galaxy S22 Ultra OLED Front View',
            width: 1000,
            height: 1000,
          },
        },
        {
          node: {
            url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=80',
            altText: 'Samsung Galaxy S22 Ultra Frame and Connectors',
            width: 1000,
            height: 1000,
          },
        },
      ],
    },
    options: [
      {
        id: 'opt-color-s22',
        name: 'Frame Color',
        values: ['Phantom Black', 'Burgundy', 'Green', 'Phantom White'],
      },
      {
        id: 'opt-grade-s22',
        name: 'Grade',
        values: ['OEM Refurbished (Grade A+)', 'Service Pack Original'],
      },
    ],
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-s22-black-oem',
            title: 'Phantom Black / OEM Refurbished (Grade A+)',
            availableForSale: true,
            sku: 'DCP-S22U-BLK-OEM',
            price: { amount: '189.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '249.99', currencyCode: 'USD' },
            selectedOptions: [
              { name: 'Frame Color', value: 'Phantom Black' },
              { name: 'Grade', value: 'OEM Refurbished (Grade A+)' },
            ],
            image: {
              url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1000&q=80',
              altText: 'Phantom Black S22 Ultra Screen Assembly',
              width: 1000,
              height: 1000,
            },
          },
        },
      ],
    },
  },
  {
    id: 'gid://shopify/Product/demo-galaxy-s23-ultra',
    handle: 'galaxy-s23-ultra-dynamic-amoled-screen-assembly',
    title: 'Samsung Galaxy S23 Ultra Dynamic AMOLED 2X Screen with Frame',
    description:
      'Replacement AMOLED display panel with pre-installed frame for Samsung Galaxy S23 Ultra. Features 1750 nits peak brightness, Gorilla Glass Victus 2 protection, and enhanced color accuracy for pro-level repairs.',
    descriptionHtml:
      '<p>Replacement AMOLED display panel with pre-installed frame for Samsung Galaxy S23 Ultra.</p><ul><li>1750 nits peak brightness</li><li>Gorilla Glass Victus 2 protection</li><li>OEM grade color accuracy</li></ul>',
    availableForSale: true,
    productType: 'Screen Replacement',
    vendor: 'DisplayCellPros',
    tags: ['Samsung', 'Galaxy S23', 'OLED', 'Screen Replacement', 'Display', 'Ultra'],
    priceRange: {
      minVariantPrice: { amount: '229.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '259.99', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '299.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '329.99', currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80',
      altText: 'Samsung Galaxy S23 Ultra Screen Assembly',
      width: 1000,
      height: 1000,
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80',
            altText: 'Samsung Galaxy S23 Ultra Front',
            width: 1000,
            height: 1000,
          },
        },
      ],
    },
    options: [
      {
        id: 'opt-color-s23',
        name: 'Color',
        values: ['Phantom Black', 'Green', 'Cream'],
      },
    ],
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-s23-black',
            title: 'Phantom Black',
            availableForSale: true,
            sku: 'DCP-S23U-BLK',
            price: { amount: '229.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '299.99', currencyCode: 'USD' },
            selectedOptions: [{ name: 'Color', value: 'Phantom Black' }],
            image: {
              url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80',
              altText: 'Phantom Black S23 Ultra Screen',
              width: 1000,
              height: 1000,
            },
          },
        },
      ],
    },
  },
]

export interface GetDemoProductsFilter {
  query?: string
  sortKey?: string
  reverse?: boolean
  onlyAvailable?: boolean
  limit?: number
}

export function getDemoProducts(filter: GetDemoProductsFilter = {}): ShopifyProductNode[] {
  let products = [...DEMO_PRODUCTS]

  if (filter.onlyAvailable) {
    products = products.filter((p) => p.availableForSale)
  }

  if (filter.query && filter.query.trim()) {
    const q = filter.query.trim().toLowerCase()
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
        (p.productType && p.productType.toLowerCase().includes(q))
    )
  }

  if (filter.sortKey === 'PRICE') {
    products.sort((a, b) => {
      const priceA = parseFloat(a.priceRange.minVariantPrice.amount || '0')
      const priceB = parseFloat(b.priceRange.minVariantPrice.amount || '0')
      return filter.reverse ? priceB - priceA : priceA - priceB
    })
  } else if (filter.sortKey === 'TITLE') {
    products.sort((a, b) => {
      const cmp = a.title.localeCompare(b.title)
      return filter.reverse ? -cmp : cmp
    })
  }

  if (typeof filter.limit === 'number' && filter.limit > 0) {
    products = products.slice(0, filter.limit)
  }

  return products
}

export function getDemoProductByHandle(handle: string): ShopifyProductDetailNode | null {
  if (!handle) return null
  const normalized = handle.trim().toLowerCase()
  return (
    DEMO_PRODUCTS.find((p) => p.handle.toLowerCase() === normalized) ||
    DEMO_PRODUCTS.find((p) => p.handle.toLowerCase().includes(normalized)) ||
    null
  )
}
