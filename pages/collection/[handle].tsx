import type {
  GetStaticPathsContext,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import { useSafeRouter } from '@lib/hooks/useSafeRouter'
import { BuilderComponent, builder, useIsPreviewing } from '@builder.io/react'
import { resolveBuilderContent } from '@lib/resolve-builder-content'
import builderConfig from '@config/builder'
import shopifyConfig from '@config/shopify'
import {
  getCollection,
  getAllCollectionPaths,
} from '@lib/shopify/storefront-data-hooks/src/api/operations'
import Head from 'next/head'
import { useThemeUI } from '@theme-ui/core'
import { getLayoutProps } from '@lib/get-layout-props'
import { Breadcrumbs, formatCollectionBreadcrumbs } from '../../components/common/Breadcrumbs'
import { ProductGrid } from '../../components/products/ProductGrid'
import { ProductGridSkeleton } from '../../components/products/ProductGridSkeleton'
import DynamicSEO from '../../components/DynamicSEO'

if (builderConfig.apiKey) {
  builder.init(builderConfig.apiKey)
}
const builderModel = 'collection-page'

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ handle: string }>) {
  const collection = await getCollection(shopifyConfig, {
    handle: params?.handle,
  })

  const page = await resolveBuilderContent(builderModel, locale, {
    collectionHandle: params?.handle,
  })

  return {
    notFound: !collection,
    revalidate: 30,
    props: {
      page: page,
      collection: collection,
      ...(await getLayoutProps()),
    },
  }
}

export async function getStaticPaths({ locales }: GetStaticPathsContext) {
  const paths = await getAllCollectionPaths(shopifyConfig)
  return {
    paths: paths.map((path) => `/collection/${path}`),
    fallback: 'blocking',
  }
}

export default function Handle({
  collection,
  page,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useSafeRouter()
  const isPreviewing = useIsPreviewing()
  const isLive = !isPreviewing
  const { theme } = useThemeUI()
  if (!collection && isLive) {
    return (
      <>
        <Head>
          <meta name="robots" content="noindex" />
          <meta name="title"></meta>
        </Head>
        <main>Page not found</main>
      </>
    )
  }

  const collectionHandle = (router.query.handle as string) || collection?.handle

  const breadcrumbItems = collection
    ? formatCollectionBreadcrumbs({
        collection,
        includeProductsRoot: true,
      })
    : [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        {
          label: collectionHandle
            ? collectionHandle.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            : 'Collection',
          isCurrent: true,
        },
      ]

  return router.isFallback && isLive ? (
    <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Breadcrumbs
          id="collection-fallback-breadcrumbs"
          variant="contained"
          showHomeIcon={true}
          collectionHandle={collectionHandle}
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            {
              label: collectionHandle
                ? collectionHandle.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                : 'Collection',
              isCurrent: true,
            },
          ]}
        />
        <ProductGridSkeleton count={8} showControls={true} showSidebar={true} />
      </div>
    </div>
  ) : (
    <div className="min-h-screen bg-neutral-50/50 py-6">
      <DynamicSEO collection={collection} breadcrumbs={breadcrumbItems} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <Breadcrumbs
          id="collection-page-top-breadcrumbs"
          variant="contained"
          showHomeIcon={true}
          showBackOnMobile={true}
          collection={collection}
          collectionHandle={collectionHandle}
          items={breadcrumbItems}
        />
      </div>
      {page ? (
        <BuilderComponent
          key={collection?.id || 'collection'}
          options={{ enrich: true }}
          model={builderModel}
          data={{ collection, theme }}
          content={page}
        />
      ) : (
        <ProductGrid
          initialProducts={collection?.products || []}
          title={collection?.title || 'Collection Products'}
          subtitle={collection?.description || `Browse items in ${collection?.title || 'this collection'}.`}
          showControls={true}
        />
      )}
    </div>
  )
}
