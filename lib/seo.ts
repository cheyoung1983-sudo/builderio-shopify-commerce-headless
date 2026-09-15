export interface SeoProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'product' | 'article'
  price?: string
  currency?: string
  availability?: boolean
  siteName?: string
}

export function getBaseUrl() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://displaycellpros.com'
}

export function generateBreadcrumbJsonLd(items: Array<{ label: string; href: string }>, siteUrl?: string) {
  const baseUrl = siteUrl || getBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.label,
      'item': item.href.startsWith('http') ? item.href : `${baseUrl}${item.href}`,
    })),
  }
}

export function generateProductSeo(product: any, siteUrl?: string) {
  if (!product) return {}
  const baseUrl = siteUrl || getBaseUrl()
  const title = product.title ? `${product.title} | DisplayCellPros` : 'Product | DisplayCellPros'
  const description = product.description || product.descriptionHtml?.replace(/<[^>]*>?/gm, '') || 'Shop professional replacement parts and accessories.'
  const image = product.images?.[0]?.src || product.images?.[0]?.url || 'https://cdn.shopify.com/s/files/1/1023/5428/9012/collections/display-cell-pros-homepage-hero.png'
  const url = `${baseUrl}/product/${product.handle}`
  const price = product.variants?.[0]?.price?.amount || product.priceV2?.amount
  const currency = product.variants?.[0]?.price?.currencyCode || product.priceV2?.currencyCode || 'USD'
  const available = product.availableForSale ?? product.variants?.[0]?.available ?? true

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    ...(product.productType
      ? [
          {
            label: product.productType,
            href: `/products?category=${encodeURIComponent(product.productType)}`,
          },
        ]
      : []),
    { label: product.title || 'Product', href: `/product/${product.handle}` },
  ]

  return {
    title,
    description,
    openGraph: {
      type: 'product',
      title,
      description,
      url,
      images: [
        {
          url: image,
          width: 1024,
          height: 1024,
          alt: product.title,
        },
      ],
      product: {
        price: {
          amount: price,
          currency: currency,
        },
        availability: available ? 'in stock' : 'out of stock',
      },
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image,
    },
    jsonLd: [
      {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.title,
        image: [image],
        description: description,
        sku: product.variants?.[0]?.sku || product.id,
        brand: {
          '@type': 'Brand',
          name: product.vendor || 'DisplayCellPros',
        },
        offers: {
          '@type': 'Offer',
          url: url,
          priceCurrency: currency,
          price: price,
          availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
      generateBreadcrumbJsonLd(breadcrumbItems, siteUrl),
    ],
  }
}

export function generateCollectionSeo(collection: any, siteUrl?: string) {
  if (!collection) return {}
  const baseUrl = siteUrl || getBaseUrl()
  const title = collection.title ? `${collection.title} | DisplayCellPros` : 'Collection | DisplayCellPros'
  const description = collection.description || 'Browse our curated collection of professional repair parts and displays.'
  const image = collection.image?.src || 'https://cdn.shopify.com/s/files/1/1023/5428/9012/collections/display-cell-pros-homepage-hero.png'
  const url = `${baseUrl}/collection/${collection.handle}`

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: collection.title || 'Collection', href: `/collection/${collection.handle}` },
  ]

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: collection.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image,
    },
    jsonLd: [
      {
        '@context': 'https://schema.org/',
        '@type': 'CollectionPage',
        name: collection.title,
        description: description,
        url: url,
        image: image,
      },
      generateBreadcrumbJsonLd(breadcrumbItems, siteUrl),
    ],
  }
}
