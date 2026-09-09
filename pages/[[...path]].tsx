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
  const page = await resolveBuilderContent('page', locale, {
    urlPath: '/' + (params?.path?.join('/') || ''),
  })
  return {
    props: {
      page,
      locale,
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
    const isRoot = !router.asPath || router.asPath === '/' || router.asPath === ''
    if (isRoot) {
      return (
        <div className="min-h-screen bg-neutral-50/50 py-6">
          <Head>
            <title>DisplayCellPros | Quality Screen Replacements</title>
            <meta
              name="description"
              content="Shop high quality OEM and LCD replacement screens for Samsung Galaxy and modern smartphones."
            />
          </Head>
          <ProductGrid
            title="All Screen Replacements & Parts"
            subtitle="Explore our live inventory of smartphone display assemblies and parts fetched directly via the Shopify Storefront API."
            showControls={true}
          />
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
