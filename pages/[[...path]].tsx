import type {
  GetStaticPathsContext,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import {
  BuilderComponent,
  Builder,
  builder,
  useIsPreviewing,
} from '@builder.io/react'
import builderConfig from '@config/builder'
import DefaultErrorPage from 'next/error'
import Head from 'next/head'
import { resolveBuilderContent } from '@lib/resolve-builder-content'
import { ProductGrid } from '../components/products/ProductGrid'
import { HeroBanner } from '../components/common/HeroBanner'
import { AgenticShopAssistant } from '../components/trends/AgenticShopAssistant'

if (builderConfig.apiKey) {
  builder.init(builderConfig.apiKey)
}
import '../blocks/ProductGrid/ProductGrid.builder'
import '../blocks/CollectionView/CollectionView.builder'
import { useThemeUI } from '@theme-ui/core'
import { getLayoutProps } from '@lib/get-layout-props'
import { useAddItemToCart } from '@lib/shopify/storefront-data-hooks'
import { useUI } from '@components/common/context'
import Link from '@components/common/Link'
import { Box, Heading, Text, Button } from 'theme-ui'

const isProduction = process.env.NODE_ENV === 'production'

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ path: string[] }>) {
  const path = params?.path || []
  const isRoot = path.length === 0
  const page = await resolveBuilderContent('page', locale, {
    urlPath: '/' + path.join('/'),
  })
  return {
    props: {
      page,
      locale,
      path,
      isRoot,
      ...(await getLayoutProps()),
    },
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 5 seconds
    revalidate: 5,
  }
}

export async function getStaticPaths({ locales }: GetStaticPathsContext) {
  return {
    paths: [{ params: { path: [] } }],
    fallback: true,
  }
}

export default function Path({
  page,
  locale,
  path = [],
  isRoot = false,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter()
  const { theme } = useThemeUI()
  const addToCart = useAddItemToCart()
  const isPreviewing = useIsPreviewing()
  const { openSidebar } = useUI()
  if (router.isFallback) {
    return <h1>Loading...</h1>
  }

  // If no page content from Builder and not previewing
  if (!page && !isPreviewing) {
    const isRootRoute =
      isRoot ||
      path.length === 0 ||
      !router.asPath ||
      router.asPath === '/' ||
      router.asPath === '/[[...path]]'
    if (isRootRoute) {
      return (
        <div className="min-h-screen bg-canvas py-4 sm:py-6">
          <Head>
            <title>DisplayCellPros | Precision Screen Replacements & OEM Parts</title>
            <meta
              name="description"
              content="Shop high quality OEM and LCD replacement screens for Samsung Galaxy and modern smartphones."
            />
          </Head>
          <HeroBanner />

          {/* Agentic Shopping Assistant Bar (Trend 04 Integration) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-8">
            <AgenticShopAssistant />
          </div>

          <div id="catalog">
            <ProductGrid
              title="All Screen Replacements & Parts"
              subtitle="Explore our live inventory of smartphone display assemblies and parts fetched directly via the Shopify Storefront API."
              showControls={true}
            />
          </div>
        </div>
      )
    }
    return (
      <>
        <Head>
          <meta name="robots" content="noindex" />
          <meta name="title"></meta>
        </Head>
        <DefaultErrorPage statusCode={404} />
      </>
    )
  }

  const { title, description, image } = page?.data! || {}
  return (
    <div>
      {title && (
        <NextSeo
          title={title}
          description={description}
          openGraph={{
            type: 'website',
            title,
            description,
            locale,
            ...(image && {
              images: [
                {
                  url: image,
                  width: 800,
                  height: 600,
                  alt: title,
                },
              ],
            }),
          }}
        />
      )}
      <BuilderComponent
        options={{ enrich: true }}
        model="page"
        data={{ theme }}
        context={{
          productBoxService: {
            addToCart,
            navigateToCart() {
              openSidebar()
            },
            navigateToProductPage(product: { handle: string }) {
              router.push(`/product/${product.handle}`)
            },
          },
        }}
        renderLink={(props: any) => {
          // nextjs link doesn't handle hash links well if it's on the same page (starts with #)
          if (props.target === '_blank' || props.href?.startsWith('#')) {
            return <Link as="a" {...props} />
          }
          return <Link {...props} as={Link} />
        }}
        {...(page && { content: page })}
      />
    </div>
  )
}
