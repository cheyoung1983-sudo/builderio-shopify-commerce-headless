import type {
  GetStaticPathsContext,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { BuilderComponent, builder, useIsPreviewing } from '@builder.io/react'
import { ProductGrid } from '@components/products/ProductGrid'
import type { ShopifyProductNode } from '@services/shopify'
import { fetchAllAvailableProducts } from '@services/shopify'
import { resolveBuilderContent } from '@lib/resolve-builder-content'
import { getLayoutProps } from '@lib/get-layout-props'
import builderConfig from '@config/builder'

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

  if (!page && urlPath !== '/') {
    return {
      notFound: true,
      revalidate: 5,
    }
  }

  let fallbackProducts: ShopifyProductNode[] = []
  if (!page) {
    try {
      const result = await fetchAllAvailableProducts({ batchSize: 50, onlyAvailable: true })
      fallbackProducts = result.products
    } catch (error) {
      console.error('[pages/[[...path]]] Failed to load fallback products:', error)
    }
  }

  return {
    props: {
      page,
      fallbackProducts,
      ...(await getLayoutProps()),
    },
    revalidate: 60,
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
  const isPreviewing = useIsPreviewing()

  if (page || isPreviewing) {
    return <BuilderComponent model={builderModel} content={page} />
  }

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
        <section className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
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
            className="mt-7 inline-flex rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
          >
            Browse all products
          </Link>
        </section>
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:px-8">
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
