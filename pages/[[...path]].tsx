import type {
  GetStaticPathsContext,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import { useSafeRouter } from '@lib/hooks/useSafeRouter'
import { BuilderComponent, builder, useIsPreviewing } from '@builder.io/react'
import { resolveBuilderContent } from '@lib/resolve-builder-content'
import { getLayoutProps } from '@lib/get-layout-props'
import builderConfig from '@config/builder'
import Head from 'next/head'
import Link from 'next/link'
import { useThemeUI } from '@theme-ui/core'
import { ProductGrid } from '@components/products/ProductGrid'
import { fetchAllAvailableProducts, ShopifyProductNode } from '@services/shopify'

if (builderConfig.apiKey) {
  builder.init(builderConfig.apiKey)
}

const builderModel = 'page'

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ path?: string[] }>) {
  const path = params?.path || []
  const urlPath = `/${path.join('/')}`.replace(/\/$/, '') || '/'
  const page = await resolveBuilderContent(builderModel, locale, { urlPath })

  // Unknown non-root paths with no Builder page genuinely 404.
  if (!page && urlPath !== '/') {
    return {
      notFound: true,
      revalidate: 30,
    }
  }

  // The homepage falls back to a live product listing instead of 404ing
  // when no Builder 'page' entry exists yet for '/'.
  let fallbackProducts: ShopifyProductNode[] = []
  if (!page) {
    try {
      const result = await fetchAllAvailableProducts({ batchSize: 50, onlyAvailable: true })
      fallbackProducts = result.products
    } catch (error) {
      console.error('[pages/[[...path]]] Failed to load fallback homepage products:', error)
    }
  }

  return {
    props: {
      page,
      fallbackProducts,
      ...(await getLayoutProps()),
    },
    revalidate: 30,
  }
}

export async function getStaticPaths({ locales }: GetStaticPathsContext) {
  return {
    paths: locales?.flatMap((locale) => [{ params: { path: [] }, locale }]) || [{ params: { path: [] } }],
    fallback: 'blocking',
  }
}

export default function Path({
  page,
  fallbackProducts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useSafeRouter()
  const isPreviewing = useIsPreviewing()
  const isLive = !isPreviewing
  const { theme } = useThemeUI()

  if (router.isFallback && isLive) {
    return <h1>Loading...</h1>
  }

  // Render via Builder whenever a page exists, or while previewing (so the
  // visual editor can still initialize against an empty page).
  if (page || isPreviewing) {
    return (
      <BuilderComponent
        key={page?.id || 'page'}
        options={{ enrich: true }}
        model={builderModel}
        data={{ theme }}
        content={page}
      />
    )
  }

  // Live homepage with no Builder 'page' entry yet: render a real homepage
  // backed by the live Shopify catalog instead of "Page not found".
  return (
    <>
      <Head>
        <title>DisplayCellPros | Replacement Screens and Repair Parts</title>
        <meta
          name="description"
          content="Shop replacement screens and repair parts with professional installation included."
        />
      </Head>
      <main className="min-h-screen bg-neutral-50/50 py-10">
        <section className="w-full max-w-7xl mx-auto px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            DisplayCellPros
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Quality replacement screens, ready to ship
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Browse OEM and premium replacement parts for popular devices, with expert support when you need it.
          </p>
          <Link
            href="/products"
            className="mt-7 inline-flex rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
          >
            Browse all products
          </Link>
        </section>
        <section className="w-full max-w-7xl mx-auto mt-12 px-4 sm:px-6 lg:px-8">
          <ProductGrid
            initialProducts={fallbackProducts}
            title="Featured replacement parts"
            subtitle="Live inventory from the Shopify catalog."
            showControls
          />
        </section>
      </main>
    </>
  )
}
