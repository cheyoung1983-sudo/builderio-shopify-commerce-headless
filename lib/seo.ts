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

export interface MetadataOptions {
  title?: string
  description?: string
  image?: string
  canonical?: string
  url?: string
  type?: 'website' | 'article' | 'book' | 'profile' | 'music.song' | 'video.movie'
  noindex?: boolean
  nofollow?: boolean
  keywords?: string | string[]
  publishedTime?: string
  authors?: string[]
}

export interface NextMetadata {
  title?: string
  description?: string
  keywords?: string[]
  metadataBase?: URL
  alternates?: {
    canonical?: string
  }
  openGraph?: {
    title?: string
    description?: string
    url?: string
    siteName?: string
    locale?: string
    type?: string
    images?: Array<{
      url: string
      width?: number
      height?: number
      alt?: string
    }>
    publishedTime?: string
    authors?: string[]
  }
  twitter?: {
    card?: string
    title?: string
    description?: string
    images?: string[]
    creator?: string
    site?: string
  }
  robots?: {
    index?: boolean
    follow?: boolean
    googleBot?: {
      index?: boolean
      follow?: boolean
      'max-video-preview'?: number
      'max-image-preview'?: string
      'max-snippet'?: number
    }
  }
  other?: Record<string, string | number | (string | number)[]>
}

export const DEFAULT_SITE_NAME = 'DisplayCellPros'
export const DEFAULT_OG_IMAGE =
  'https://cdn.shopify.com/s/files/1/1023/5428/9012/collections/display-cell-pros-homepage-hero.png'
export const DEFAULT_TITLE =
  'DisplayCellPros | Professional Screen & Display Replacements'
export const DEFAULT_DESCRIPTION =
  'Shop premium OEM and LCD replacement screens and repair components for smartphones and tablets with fast shipping and expert support.'

export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
  if (envUrl) {
    const trimmed = envUrl.trim()
    return trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed.replace(/\/$/, '')
      : `https://${trimmed.replace(/\/$/, '')}`
  }
  return 'https://displaycellpros.com'
}

/**
 * Strips HTML tags and collapses whitespace, trimming to max characters for meta descriptions
 */
export function cleanMetaDescription(text?: string | null, maxLength = 160): string {
  if (!text) return DEFAULT_DESCRIPTION
  const cleaned = text
    .replace(/<[^>]*>/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength - 1).trimEnd() + '…'
}

export function generateBreadcrumbJsonLd(
  items: Array<{ label: string; href?: string; isCurrent?: boolean }>,
  siteUrl?: string,
  fallbackUrl?: string
) {
  const baseUrl = siteUrl || getBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const targetUrl = item.href
        ? item.href.startsWith('http')
          ? item.href
          : `${baseUrl}${item.href}`
        : fallbackUrl || baseUrl

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: targetUrl,
      }
    }),
  }
}

export function generateProductSeo(product: any, siteUrl?: string) {
  if (!product) return {}
  const baseUrl = siteUrl || getBaseUrl()
  const rawTitle = product.seo?.title || product.title || 'Product'
  const title = rawTitle.includes('DisplayCellPros')
    ? rawTitle
    : `${rawTitle} | DisplayCellPros`

  const rawDescription =
    product.seo?.description ||
    product.description ||
    product.descriptionHtml ||
    ''
  const description = cleanMetaDescription(rawDescription, 158)

  // Resolve best image across Shopify schema variants
  const image =
    product.featuredImage?.url ||
    product.featuredImage?.src ||
    product.images?.edges?.[0]?.node?.url ||
    product.images?.[0]?.url ||
    product.images?.[0]?.src ||
    product.image?.url ||
    product.image?.src ||
    DEFAULT_OG_IMAGE

  const imageAlt =
    product.featuredImage?.altText ||
    product.images?.edges?.[0]?.node?.altText ||
    product.title ||
    'DisplayCellPros Replacement Part'

  const url = `${baseUrl}/product/${product.handle || ''}`

  // Resolve price and currency across different data structures
  const firstVariantNode = product.variants?.edges?.[0]?.node || product.variants?.[0]
  const price =
    firstVariantNode?.price?.amount ||
    product.priceRange?.minVariantPrice?.amount ||
    product.priceV2?.amount ||
    '0.00'
  const currency =
    firstVariantNode?.price?.currencyCode ||
    product.priceRange?.minVariantPrice?.currencyCode ||
    product.priceV2?.currencyCode ||
    'USD'

  const available =
    product.availableForSale ??
    firstVariantNode?.availableForSale ??
    firstVariantNode?.available ??
    true

  const sku = firstVariantNode?.sku || product.id || undefined
  const brand = product.vendor || DEFAULT_SITE_NAME

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
    { label: product.title || 'Product', href: `/product/${product.handle || ''}` },
  ]

  return {
    title,
    description,
    canonical: url,
    openGraph: {
      type: 'product',
      title,
      description,
      url,
      siteName: DEFAULT_SITE_NAME,
      images: [
        {
          url: image,
          width: 1024,
          height: 1024,
          alt: imageAlt,
        },
      ],
      product: {
        price: {
          amount: price,
          currency: currency,
        },
        availability: available ? 'in stock' : 'out of stock',
        brand,
        condition: 'new',
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
        description,
        sku,
        brand: {
          '@type': 'Brand',
          name: brand,
        },
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: currency,
          price: price,
          itemCondition: 'https://schema.org/NewCondition',
          availability: available
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      },
      generateBreadcrumbJsonLd(breadcrumbItems, siteUrl),
    ],
  }
}

export function generatePageSeo(page: any, siteUrl?: string, customPath?: string) {
  if (!page) return {}
  const baseUrl = siteUrl || getBaseUrl()
  const pageData = page.data || {}

  const rawTitle =
    pageData.title ||
    pageData.metaTitle ||
    page.name ||
    DEFAULT_TITLE
  const title = rawTitle.includes('DisplayCellPros')
    ? rawTitle
    : `${rawTitle} | DisplayCellPros`

  const description = cleanMetaDescription(
    pageData.description || pageData.metaDescription || pageData.subtitle,
    158
  )

  const image =
    pageData.image ||
    pageData.ogImage ||
    pageData.featuredImage ||
    DEFAULT_OG_IMAGE

  const pathname = customPath || pageData.url || page.url || ''
  const url = `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`

  return {
    title,
    description,
    canonical: url,
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: DEFAULT_SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image,
    },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url,
      publisher: {
        '@type': 'Organization',
        name: DEFAULT_SITE_NAME,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_OG_IMAGE,
        },
      },
    },
  }
}

export function generateCollectionSeo(collection: any, siteUrl?: string) {
  if (!collection) return {}
  const baseUrl = siteUrl || getBaseUrl()
  const rawTitle = collection.title ? `${collection.title} | DisplayCellPros` : 'Collection | DisplayCellPros'
  const title = rawTitle.includes('DisplayCellPros') ? rawTitle : `${rawTitle} | DisplayCellPros`
  const description = cleanMetaDescription(
    collection.description ||
      'Browse our curated collection of professional replacement screens and repair components.',
    158
  )
  const image =
    collection.image?.src ||
    collection.image?.url ||
    DEFAULT_OG_IMAGE
  const url = `${baseUrl}/collection/${collection.handle || ''}`

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: collection.title || 'Collection', href: `/collection/${collection.handle || ''}` },
  ]

  return {
    title,
    description,
    canonical: url,
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: DEFAULT_SITE_NAME,
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

/**
 * Constructs a Next.js Metadata configuration object with default fallbacks,
 * OpenGraph, Twitter Cards, robots rules, and canonical link definitions.
 */
export function constructMetadata({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  canonical,
  url,
  noindex = false,
  nofollow = false,
  keywords,
  publishedTime,
  authors,
}: MetadataOptions = {}): NextMetadata {
  const baseUrl = getBaseUrl()
  const resolvedTitle = title.includes(DEFAULT_SITE_NAME) ? title : `${title} | ${DEFAULT_SITE_NAME}`
  const resolvedDescription = cleanMetaDescription(description, 160)
  const resolvedUrl = canonical || url || baseUrl

  const keywordsArray = Array.isArray(keywords)
    ? keywords
    : typeof keywords === 'string'
      ? keywords.split(',').map((k) => k.trim())
      : undefined

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: keywordsArray,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: resolvedUrl,
    },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: resolvedUrl,
      siteName: DEFAULT_SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: resolvedTitle,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(authors ? { authors } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDescription,
      images: [image],
      creator: `@${DEFAULT_SITE_NAME.toLowerCase()}`,
      site: `@${DEFAULT_SITE_NAME.toLowerCase()}`,
    },
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

/**
 * Generates a dynamic Next.js Metadata object from a Shopify product
 */
export function generateProductMetadata(product: any, siteUrl?: string): NextMetadata {
  if (!product) return constructMetadata()
  const baseUrl = siteUrl || getBaseUrl()

  const rawTitle = product.seo?.title || product.title || 'Product'
  const title = rawTitle.includes(DEFAULT_SITE_NAME) ? rawTitle : `${rawTitle} | ${DEFAULT_SITE_NAME}`

  const rawDesc =
    product.seo?.description ||
    product.description ||
    product.descriptionHtml ||
    DEFAULT_DESCRIPTION
  const description = cleanMetaDescription(rawDesc, 160)

  const image =
    product.featuredImage?.url ||
    product.featuredImage?.src ||
    product.images?.edges?.[0]?.node?.url ||
    product.images?.[0]?.url ||
    product.images?.[0]?.src ||
    product.image?.url ||
    product.image?.src ||
    DEFAULT_OG_IMAGE

  const imageAlt =
    product.featuredImage?.altText ||
    product.images?.edges?.[0]?.node?.altText ||
    product.title ||
    DEFAULT_SITE_NAME

  const handle = product.handle || ''
  const canonicalUrl = `${baseUrl}/product/${handle}`

  const firstVariantNode = product.variants?.edges?.[0]?.node || product.variants?.[0]
  const price =
    firstVariantNode?.price?.amount ||
    product.priceRange?.minVariantPrice?.amount ||
    product.priceV2?.amount ||
    '0.00'
  const currency =
    firstVariantNode?.price?.currencyCode ||
    product.priceRange?.minVariantPrice?.currencyCode ||
    product.priceV2?.currencyCode ||
    'USD'

  const available =
    product.availableForSale ??
    firstVariantNode?.availableForSale ??
    firstVariantNode?.available ??
    true

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: DEFAULT_SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: image,
          width: 1024,
          height: 1024,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    other: {
      'product:price:amount': String(price),
      'product:price:currency': currency,
      'product:availability': available ? 'in stock' : 'out of stock',
      'product:brand': product.vendor || DEFAULT_SITE_NAME,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

/**
 * Generates a dynamic Next.js Metadata object from a Shopify collection
 */
export function generateCollectionMetadata(collection: any, siteUrl?: string): NextMetadata {
  if (!collection) return constructMetadata()
  const baseUrl = siteUrl || getBaseUrl()

  const rawTitle = collection.title ? `${collection.title} | ${DEFAULT_SITE_NAME}` : `Collection | ${DEFAULT_SITE_NAME}`
  const title = rawTitle.includes(DEFAULT_SITE_NAME) ? rawTitle : `${rawTitle} | ${DEFAULT_SITE_NAME}`

  const description = cleanMetaDescription(
    collection.description ||
      `Explore our ${collection.title || 'replacement parts'} collection. Premium screens and components at DisplayCellPros.`,
    160
  )

  const image =
    collection.image?.src ||
    collection.image?.url ||
    DEFAULT_OG_IMAGE

  const handle = collection.handle || ''
  const canonicalUrl = `${baseUrl}/collection/${handle}`

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: DEFAULT_SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: collection.title || DEFAULT_SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}
