import React from 'react'
import NextHead from 'next/head'

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  openGraph?: {
    type?: string
    title?: string
    description?: string
    url?: string
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
    }
  }
  twitter?: {
    card?: string
    title?: string
    description?: string
    image?: string
  }
  jsonLd?: Record<string, any>
}

export const SEO: React.FC<SEOProps> = ({
  title = 'DisplayCellPros | Professional Display & Screen Replacements',
  description = 'High-grade replacement screens and professional repair components for smartphones and tablets.',
  canonical,
  openGraph,
  twitter,
  jsonLd,
}) => {
  const ogImage = openGraph?.images?.[0]?.url

  return (
    <NextHead>
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={openGraph?.title || title} />
      <meta property="og:description" content={openGraph?.description || description} />
      {openGraph?.url && <meta property="og:url" content={openGraph.url} />}
      <meta property="og:type" content={openGraph?.type || 'website'} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {openGraph?.images?.[0]?.width && (
        <meta property="og:image:width" content={String(openGraph.images[0].width)} />
      )}
      {openGraph?.images?.[0]?.height && (
        <meta property="og:image:height" content={String(openGraph.images[0].height)} />
      )}
      {openGraph?.images?.[0]?.alt && (
        <meta property="og:image:alt" content={openGraph.images[0].alt} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitter?.card || 'summary_large_image'} />
      <meta name="twitter:title" content={twitter?.title || title} />
      <meta name="twitter:description" content={twitter?.description || description} />
      {twitter?.image && <meta name="twitter:image" content={twitter.image} />}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        Array.isArray(jsonLd) ? (
          jsonLd.map((item, index) => (
            <script
              key={index}
              type="application/ld+json"
              // Escape "<" so a title/description containing "</script>" can't
              // break out of this script tag (standard JSON-LD injection
              // mitigation — matches Breadcrumbs.tsx's jsonLd script).
              dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\\u003c') }}
            />
          ))
        ) : (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
          />
        )
      )}
    </NextHead>
  )
}

export default SEO
