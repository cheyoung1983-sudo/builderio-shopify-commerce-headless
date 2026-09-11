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
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-s22-burgundy-oem',
            title: 'Burgundy / OEM Refurbished (Grade A+)',
            availableForSale: true,
            sku: 'DCP-S22U-BUR-OEM',
            price: { amount: '194.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '259.99', currencyCode: 'USD' },
            selectedOptions: [
              { name: 'Frame Color', value: 'Burgundy' },
              { name: 'Grade', value: 'OEM Refurbished (Grade A+)' },
            ],
            image: {
              url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1000&q=80',
              altText: 'Burgundy S22 Ultra Screen Assembly',
              width: 1000,
              height: 1000,
            },
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-s22-black-service',
            title: 'Phantom Black / Service Pack Original',
            availableForSale: true,
            sku: 'DCP-S22U-BLK-SP',
            price: { amount: '219.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '279.99', currencyCode: 'USD' },
            selectedOptions: [
              { name: 'Frame Color', value: 'Phantom Black' },
              { name: 'Grade', value: 'Service Pack Original' },
            ],
            image: {
              url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1000&q=80',
              altText: 'Service Pack Original S22 Ultra Screen Assembly',
              width: 1000,
              height: 1000,
            },
          },
        },
      ],
    },
  },
  {
    id: 'gid://shopify/Product/demo-galaxy-s21-5g',
    handle: 'galaxy-s21-5g-dynamic-amoled-display',
    title: 'Samsung Galaxy S21 5G Dynamic AMOLED 2X Display with Digitizer',
    description:
      'Replacement AMOLED display panel and glass digitizer assembly for Samsung Galaxy S21 5G (SM-G991U / SM-G991B). Restores full touch responsiveness, vivid color contrast, 120Hz refresh speed, and ultrasonic in-display fingerprint compatibility.',
    descriptionHtml:
      '<p>Replacement AMOLED display panel and glass digitizer assembly for Samsung Galaxy S21 5G (SM-G991U / SM-G991B). Restores full touch responsiveness, vivid color contrast, 120Hz refresh speed, and in-display fingerprint compatibility.</p>',
    availableForSale: true,
    productType: 'Screen Replacement',
    vendor: 'DisplayCellPros',
    tags: ['Samsung', 'Galaxy S21', 'AMOLED', 'Screen Replacement', 'Display', 'OEM'],
    priceRange: {
      minVariantPrice: { amount: '129.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '149.99', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '169.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '189.99', currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1000&q=80',
      altText: 'Samsung Galaxy S21 5G Dynamic AMOLED 2X Display',
      width: 1000,
      height: 1000,
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1000&q=80',
            altText: 'Samsung Galaxy S21 Display Module',
            width: 1000,
            height: 1000,
          },
        },
      ],
    },
    options: [
      {
        id: 'opt-color-s21',
        name: 'Color',
        values: ['Phantom Gray', 'Phantom Violet', 'Phantom White'],
      },
    ],
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-s21-gray',
            title: 'Phantom Gray',
            availableForSale: true,
            sku: 'DCP-S21-GRY',
            price: { amount: '129.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '169.99', currencyCode: 'USD' },
            selectedOptions: [{ name: 'Color', value: 'Phantom Gray' }],
            image: {
              url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1000&q=80',
              altText: 'Phantom Gray S21 Display',
              width: 1000,
              height: 1000,
            },
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-s21-violet',
            title: 'Phantom Violet',
            availableForSale: true,
            sku: 'DCP-S21-VLT',
            price: { amount: '134.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '174.99', currencyCode: 'USD' },
            selectedOptions: [{ name: 'Color', value: 'Phantom Violet' }],
            image: {
              url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1000&q=80',
              altText: 'Phantom Violet S21 Display',
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
    title: 'Samsung Galaxy S23 Ultra Dynamic AMOLED Replacement Screen',
    description:
      'Premium OEM replacement screen for Samsung Galaxy S23 Ultra (SM-S918U/B). Features 3088 x 1440 resolution, 1750 nits peak brightness, Corning Gorilla Glass Victus 2, and seamless S-Pen touch layer integration.',
    descriptionHtml:
      '<p>Premium OEM replacement screen for Samsung Galaxy S23 Ultra (SM-S918U/B). Features 3088 x 1440 resolution, 1750 nits peak brightness, and Corning Gorilla Glass Victus 2.</p>',
    availableForSale: true,
    productType: 'Screen Replacement',
    vendor: 'DisplayCellPros',
    tags: ['Samsung', 'Galaxy S23', 'OLED', 'Screen Replacement', 'Ultra', 'OEM'],
    priceRange: {
      minVariantPrice: { amount: '229.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '249.99', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '299.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '319.99', currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80',
      altText: 'Samsung Galaxy S23 Ultra Replacement Screen',
      width: 1000,
      height: 1000,
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80',
            altText: 'Samsung Galaxy S23 Ultra Display Panel',
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
  {
    id: 'gid://shopify/Product/demo-galaxy-note-20-ultra',
    handle: 'galaxy-note-20-ultra-oled-display-assembly',
    title: 'Samsung Galaxy Note 20 Ultra 5G OLED Display with Digitizer',
    description:
      'Replacement curved Dynamic AMOLED display and glass digitizer assembly for Samsung Galaxy Note 20 Ultra 5G (SM-N986U). Complete with 120Hz smooth scrolling and S-Pen low-latency gesture recognition.',
    descriptionHtml:
      '<p>Replacement curved Dynamic AMOLED display and glass digitizer assembly for Samsung Galaxy Note 20 Ultra 5G (SM-N986U). Complete with 120Hz smooth scrolling and S-Pen recognition.</p>',
    availableForSale: true,
    productType: 'Screen Replacement',
    vendor: 'DisplayCellPros',
    tags: ['Samsung', 'Galaxy Note 20', 'OLED', 'Screen Replacement', 'Display', 'Ultra'],
    priceRange: {
      minVariantPrice: { amount: '169.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '189.99', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '219.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '239.99', currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80',
      altText: 'Samsung Galaxy Note 20 Ultra OLED Screen Assembly',
      width: 1000,
      height: 1000,
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80',
            altText: 'Samsung Galaxy Note 20 Ultra Display',
            width: 1000,
            height: 1000,
          },
        },
      ],
    },
    options: [
      {
        id: 'opt-color-note20',
        name: 'Color',
        values: ['Mystic Bronze', 'Mystic Black'],
      },
    ],
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-note20-bronze',
            title: 'Mystic Bronze',
            availableForSale: true,
            sku: 'DCP-N20U-BRZ',
            price: { amount: '169.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '219.99', currencyCode: 'USD' },
            selectedOptions: [{ name: 'Color', value: 'Mystic Bronze' }],
            image: {
              url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80',
              altText: 'Mystic Bronze Note 20 Ultra Display',
              width: 1000,
              height: 1000,
            },
          },
        },
      ],
    },
  },
  {
    id: 'gid://shopify/Product/demo-iphone-14-pro-max',
    handle: 'iphone-14-pro-max-super-retina-xdr-display',
    title: 'iPhone 14 Pro Max Super Retina XDR OLED Display Assembly',
    description:
      'High-grade replacement OLED display for iPhone 14 Pro Max (A2894, A2651). Features ProMotion 120Hz technology, TrueTone programming support, 2000 nits outdoor peak brightness, and Dynamic Island cutout precision.',
    descriptionHtml:
      '<p>High-grade replacement OLED display for iPhone 14 Pro Max (A2894, A2651). Features ProMotion 120Hz technology, TrueTone programming support, and Dynamic Island cutout precision.</p>',
    availableForSale: true,
    productType: 'Screen Replacement',
    vendor: 'DisplayCellPros',
    tags: ['Apple', 'iPhone 14', 'OLED', 'Screen Replacement', 'Pro Max', 'Display'],
    priceRange: {
      minVariantPrice: { amount: '219.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '269.99', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '289.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '339.99', currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80',
      altText: 'iPhone 14 Pro Max Super Retina XDR OLED Display',
      width: 1000,
      height: 1000,
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80',
            altText: 'iPhone 14 Pro Max Screen Assembly',
            width: 1000,
            height: 1000,
          },
        },
      ],
    },
    options: [
      {
        id: 'opt-grade-ip14',
        name: 'Screen Type',
        values: ['Soft OLED (OEM Spec)', 'Hard OLED', 'Refurbished Original'],
      },
    ],
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-ip14-soft-oled',
            title: 'Soft OLED (OEM Spec)',
            availableForSale: true,
            sku: 'DCP-IP14PM-SOFT',
            price: { amount: '219.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '289.99', currencyCode: 'USD' },
            selectedOptions: [{ name: 'Screen Type', value: 'Soft OLED (OEM Spec)' }],
            image: {
              url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80',
              altText: 'iPhone 14 Pro Max Soft OLED',
              width: 1000,
              height: 1000,
            },
          },
        },
      ],
    },
  },
  {
    id: 'gid://shopify/Product/demo-google-pixel-7-pro',
    handle: 'pixel-7-pro-oled-display-digitizer-assembly',
    title: 'Google Pixel 7 Pro OLED Display Digitizer Assembly with Frame',
    description:
      'Original refurbished LTPO AMOLED display with front glass digitizer and aluminum chassis frame for Google Pixel 7 Pro (GE2AE, GP4BC). Includes camera alignment bracket and ear speaker dampener.',
    descriptionHtml:
      '<p>Original refurbished LTPO AMOLED display with front glass digitizer and chassis frame for Google Pixel 7 Pro. Restores smooth 120Hz fluid motion and optical fingerprint calibration.</p>',
    availableForSale: true,
    productType: 'Screen Replacement',
    vendor: 'DisplayCellPros',
    tags: ['Google', 'Pixel 7', 'OLED', 'Screen Replacement', 'Display', 'OEM'],
    priceRange: {
      minVariantPrice: { amount: '159.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '179.99', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '209.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '229.99', currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=80',
      altText: 'Google Pixel 7 Pro OLED Display Digitizer Assembly',
      width: 1000,
      height: 1000,
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=80',
            altText: 'Pixel 7 Pro Screen Assembly',
            width: 1000,
            height: 1000,
          },
        },
      ],
    },
    options: [
      {
        id: 'opt-color-px7',
        name: 'Color',
        values: ['Obsidian', 'Hazel', 'Snow'],
      },
    ],
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/demo-px7-obsidian',
            title: 'Obsidian',
            availableForSale: true,
            sku: 'DCP-PX7P-OBS',
            price: { amount: '159.99', currencyCode: 'USD' },
            compareAtPrice: { amount: '209.99', currencyCode: 'USD' },
            selectedOptions: [{ name: 'Color', value: 'Obsidian' }],
            image: {
              url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=80',
              altText: 'Obsidian Pixel 7 Pro Display',
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
