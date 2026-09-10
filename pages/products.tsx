import React from 'react'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import Head from 'next/head'
import { useSafeRouter } from '../lib/hooks/useSafeRouter'
import { ProductGrid } from '../components/products/ProductGrid'
import { fetchAllAvailableProducts, ShopifyProductNode } from '../services/shopify'
import { getLayoutProps } from '../lib/get-layout-props'

export async function getStaticProps(context: GetStaticPropsContext) {
  let initialProducts: ShopifyProductNode[] = []
  try {
    const res = await fetchAllAvailableProducts({
      batchSize: 50,
      onlyAvailable: true,
    })
    initialProducts = res.products
  } catch (err) {
    console.error('[pages/products] Error pre-fetching products:', err)
  }

  const layoutProps = await getLayoutProps()

  return {
    props: {
      initialProducts,
      ...layoutProps,
    },
    revalidate: 60,
  }
}

export default function ProductsPage({
  initialProducts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useSafeRouter()
  const qParam = typeof router.query.q === 'string' ? router.query.q : ''

  const handleSearchChange = (query: string) => {
    const currentQ = router.query.q || ''
    if (query !== currentQ) {
      router.replace(
        {
          pathname: '/products',
          query: query ? { q: query } : {},
        },
        undefined,
        { shallow: true }
      )
    }
  }

  return (
    <>
      <Head>
        <title>All Products | DisplayCellPros Storefront</title>
        <meta
          name="description"
          content="Explore all available OEM and LCD replacement screen assemblies for Samsung Galaxy and other devices."
        />
      </Head>

      <main className="min-h-screen bg-neutral-50/50 py-6">
        <ProductGrid
          initialProducts={initialProducts}
          title="Catalog & Screen Replacements"
          subtitle="Real-time available inventory fetched directly from the Shopify Storefront API."
          showControls={true}
          initialQuery={qParam}
          onSearchChange={handleSearchChange}
        />
      </main>
    </>
  )
}
