import { FC } from 'react'
import NextHead from 'next/head'
import { DefaultSeo } from 'next-seo'

/** Robots value used on every page that doesn't set its own. */
export const DEFAULT_ROBOTS = 'index,follow'

/*
 * Per-page robots overrides
 * -------------------------
 * next-seo's <DefaultSeo> always emits <meta name="robots" key="robots"
 * content="index,follow">. next/head only de-duplicates a *keyed* meta tag
 * against another tag with the same key, so pages that emit their own robots
 * tag without a key (DynamicSEO / SEOMetadata, e.g. the empty policy pages'
 * noindex, 404, _error) ended up with two conflicting robots tags.
 *
 * Fix, all within this component:
 * 1. Drop DefaultSeo's keyed robots tag. A later head element with the same
 *    key replaces it. We use the standard charset meta for that, so the
 *    rendered HTML is unchanged: next/head already de-duplicates charset
 *    against its built-in default.
 * 2. Emit the default robots tag *without* a key. next/head de-duplicates
 *    un-keyed meta tags by name and the tag rendered later in the tree wins,
 *    so any page-level robots tag (keyed or not: DynamicSEO noindex, NextSeo
 *    noindex, <meta name="robots" key="robots">) replaces this default. Pages
 *    that set nothing keep index,follow.
 */
const Head: FC<{ seoInfo: any; robots?: string }> = ({ seoInfo, robots }) => {
  return (
    <>
      <DefaultSeo {...seoInfo} />
      <NextHead>
        {/* (1) Replaces DefaultSeo's keyed robots tag; renders as the normal charset meta. */}
        <meta key="robots" charSet="utf-8" />
        {/* (2) Default robots, overridable by any page-level robots tag. Keep un-keyed. */}
        <meta name="robots" content={robots || DEFAULT_ROBOTS} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="manifest"
          href="/site.webmanifest"
          key="site-manifest"
          crossOrigin="use-credentials"
        />
        {/* Favicons (/favicon.svg, /favicon-32x32.png, /favicon.ico) are
            declared once in pages/_document.tsx. */}
      </NextHead>
    </>
  )
}

export default Head
