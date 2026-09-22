import React from 'react'
import NextHead from 'next/head'
import { useSafeRouter } from '@lib/hooks/useSafeRouter'
import {
  getBaseUrl,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_SITE_NAME,
  DEFAULT_OG_IMAGE,
  cleanMetaDescription,
  generateProductSeo,
  generatePageSeo,
  generateCollectionSeo,
  generateBreadcrumbJsonLd,
} from '@lib/seo'

export interface SEOMetadataProps {
  /**
   * Shopify product object or node — automatically extracts price, images,
   * title, description, vendor, inventory status, and Schema.org Product JSON-LD
   */
  product?: any

  /**
   * Builder.io page or content model — automatically extracts title, description,
   * featured image, and WebPage structured data
   */
  page?: any

  /**
   * Shopify collection object — automatically extracts collection metadata
   * and CollectionPage structured data
   */
  collection?: any

  /**
   * Page title override (e.g., "Screen Replacement | DisplayCellPros")
   */
  title?: string

  /**
   * Meta description override (aim for 120–160 characters)
   */
  description?: string

  /**
   * Canonical URL override (defaults to current pathname)
   */
  canonical?: string

  /**
   * Explicit page URL (defaults to canonical)
   */
  url?: string

  /**
   * Primary image URL for Open Graph and Twitter cards
   */
  image?: string

  /**
   * Open Graph type: 'website' | 'product' | 'article'
   */
  type?: 'website' | 'product' | 'article'

  /**
   * Site branding name
   */
  siteName?: string

  /**
   * Keywords for meta tag
   */
  keywords?: string | string[]

  /**
   * Prevent search engine indexing
   */
  noindex?: boolean

  /**
   * Prevent following links on this page
   */
  nofollow?: boolean

  /**
   * Custom Open Graph attributes override
   */
  openGraph?: {
    type?: string
    title?: string
    description?: string
    url?: string
    siteName?: string
    locale?: string
    images?: Array<{
      url: string
      width?: number
      height?: number
      alt?: string
    }>
    product?: {
      price?: {
        amount?: string | number
        currency?: string
      }
      availability?: string
      brand?: string
      condition?: string
    }
  }

  /**
   * Custom Twitter Card attributes override
   */
  twitter?: {
    card?: string
    title?: string
    description?: string
    image?: string
    site?: string
    creator?: string
  }

  /**
   * Breadcrumb navigation items to automatically generate BreadcrumbList JSON-LD
   */
  breadcrumbs?: Array<{ label: string; href?: string; isCurrent?: boolean }>

  /**
   * Custom Schema.org JSON-LD object or array of objects
   */
  jsonLd?: Record<string, any> | Array<Record<string, any>>
}

/**
 * Reusable SEO metadata component that dynamically injects page-specific
 * titles, descriptions, canonical URLs, OpenGraph tags, Twitter Cards,
 * and Schema.org structured data for Products, Collections, and CMS pages.
 */
export const SEOMetadata: React.FC<SEOMetadataProps> = ({
  product,
  page,
  collection,
  title: propTitle,
  description: propDescription,
  canonical: propCanonical,
  url: propUrl,
  image: propImage,
  type: propType,
  siteName = DEFAULT_SITE_NAME,
  keywords,
  noindex = false,
  nofollow = false,
  openGraph: propOpenGraph,
  twitter: propTwitter,
  breadcrumbs,
  jsonLd: propJsonLd,
}) => {
  const router = useSafeRouter()
  const baseUrl = getBaseUrl()

  // Compute base route path safely
  const rawPath = router.asPath ? router.asPath.split('?')[0] : ''
  const currentPath = !rawPath || rawPath === '' ? '/' : rawPath.startsWith('/') ? rawPath : `/${rawPath}`

  // Derive automated SEO from product, page, or collection
  let autoSeo: any = {}
  if (product) {
    autoSeo = generateProductSeo(product, baseUrl)
  } else if (page) {
    autoSeo = generatePageSeo(page, baseUrl, currentPath)
  } else if (collection) {
    autoSeo = generateCollectionSeo(collection, baseUrl)
  }

  // Resolve final title
  const resolvedTitle = propTitle
    ? propTitle.includes(siteName)
      ? propTitle
      : `${propTitle} | ${siteName}`
    : autoSeo.title || DEFAULT_TITLE

  // Resolve final description
  const resolvedDescription = propDescription
    ? cleanMetaDescription(propDescription, 158)
    : autoSeo.description || DEFAULT_DESCRIPTION

  // Resolve canonical and page URL
  const resolvedUrl =
    propCanonical ||
    propUrl ||
    autoSeo.canonical ||
    autoSeo.openGraph?.url ||
    `${baseUrl}${currentPath === '/' ? '' : currentPath}`

  // Resolve Open Graph type
  const resolvedOgType =
    propType ||
    propOpenGraph?.type ||
    autoSeo.openGraph?.type ||
    (product ? 'product' : 'website')

  // Resolve primary image
  const resolvedImage =
    propImage ||
    propOpenGraph?.images?.[0]?.url ||
    autoSeo.openGraph?.images?.[0]?.url ||
    propTwitter?.image ||
    autoSeo.twitter?.image ||
    DEFAULT_OG_IMAGE

  const imageAlt =
    propOpenGraph?.images?.[0]?.alt ||
    autoSeo.openGraph?.images?.[0]?.alt ||
    resolvedTitle

  const imageWidth =
    propOpenGraph?.images?.[0]?.width ||
    autoSeo.openGraph?.images?.[0]?.width ||
    (resolvedOgType === 'product' ? 1024 : 1200)

  const imageHeight =
    propOpenGraph?.images?.[0]?.height ||
    autoSeo.openGraph?.images?.[0]?.height ||
    (resolvedOgType === 'product' ? 1024 : 630)

  // Product specific Open Graph data
  const productOg = propOpenGraph?.product || autoSeo.openGraph?.product

  // Robots meta value
  const robotsParts: string[] = []
  robotsParts.push(noindex ? 'noindex' : 'index')
  robotsParts.push(nofollow ? 'nofollow' : 'follow')
  const robotsValue = robotsParts.join(', ')

  // Consolidated JSON-LD list
  const structuredDataList: Array<Record<string, any>> = []

  if (autoSeo.jsonLd) {
    if (Array.isArray(autoSeo.jsonLd)) {
      structuredDataList.push(...autoSeo.jsonLd)
    } else {
      structuredDataList.push(autoSeo.jsonLd)
    }
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    structuredDataList.push(generateBreadcrumbJsonLd(breadcrumbs, baseUrl, resolvedUrl))
  }

  if (propJsonLd) {
    if (Array.isArray(propJsonLd)) {
      structuredDataList.push(...propJsonLd)
    } else {
      structuredDataList.push(propJsonLd)
    }
  }

  return (
    <NextHead>
      {/* Standard Meta Tags */}
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="robots" content={robotsValue} />
      <link rel="canonical" href={resolvedUrl} />

      {keywords && (
        <meta
          name="keywords"
          content={Array.isArray(keywords) ? keywords.join(', ') : keywords}
        />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={propOpenGraph?.title || resolvedTitle} />
      <meta
        property="og:description"
        content={propOpenGraph?.description || resolvedDescription}
      />
      <meta property="og:url" content={propOpenGraph?.url || resolvedUrl} />
      <meta property="og:type" content={resolvedOgType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={propOpenGraph?.locale || 'en_US'} />

      {/* Open Graph Image */}
      {resolvedImage && (
        <>
          <meta property="og:image" content={resolvedImage} />
          <meta property="og:image:secure_url" content={resolvedImage} />
          <meta property="og:image:alt" content={imageAlt} />
          <meta property="og:image:width" content={String(imageWidth)} />
          <meta property="og:image:height" content={String(imageHeight)} />
        </>
      )}

      {/* Product Specific Open Graph Tags */}
      {resolvedOgType === 'product' && productOg && (
        <>
          {productOg.price?.amount && (
            <meta
              property="product:price:amount"
              content={String(productOg.price.amount)}
            />
          )}
          {productOg.price?.currency && (
            <meta
              property="product:price:currency"
              content={productOg.price.currency}
            />
          )}
          {productOg.availability && (
            <meta
              property="product:availability"
              content={productOg.availability}
            />
          )}
          {productOg.brand && (
            <meta property="product:brand" content={productOg.brand} />
          )}
          {productOg.condition && (
            <meta property="product:condition" content={productOg.condition} />
          )}
        </>
      )}

      {/* Twitter Cards */}
      <meta
        name="twitter:card"
        content={propTwitter?.card || autoSeo.twitter?.card || 'summary_large_image'}
      />
      <meta
        name="twitter:title"
        content={propTwitter?.title || autoSeo.twitter?.title || resolvedTitle}
      />
      <meta
        name="twitter:description"
        content={
          propTwitter?.description ||
          autoSeo.twitter?.description ||
          resolvedDescription
        }
      />
      {resolvedImage && (
        <>
          <meta name="twitter:image" content={resolvedImage} />
          <meta name="twitter:image:alt" content={imageAlt} />
        </>
      )}
      {(propTwitter?.site || autoSeo.twitter?.site) && (
        <meta
          name="twitter:site"
          content={propTwitter?.site || autoSeo.twitter?.site}
        />
      )}

      {/* JSON-LD Structured Data */}
      {structuredDataList.map((item, index) => (
        <script
          key={`ldjson-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </NextHead>
  )
}

export const DynamicSEO = SEOMetadata
export type DynamicSEOProps = SEOMetadataProps
export default SEOMetadata
