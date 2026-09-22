import React from 'react'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { DynamicSEO } from '../components/common/DynamicSEO'
import { useSafeRouter } from '../lib/hooks/useSafeRouter'
import { ProductGrid } from '../components/products/ProductGrid'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { fetchAllAvailableProducts, ShopifyProductNode } from '../services/shopify'
import { getLayoutProps } from '../lib/get-layout-props'

export async function getStaticProps(context: GetStaticPropsContext) {
  let initialProducts: ShopifyProductNode[] = []
  try {
    const res = await fetchAllAvailableProducts({
      batchSize: 50,
      onlyAvailable: false,
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
  const categoryParam = typeof router.query.category === 'string' ? router.query.category : ''

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

  // Determine breadcrumb items dynamically based on route params
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...(categoryParam
      ? [
          { label: 'Products', href: '/products' },
          {
            label: categoryParam,
            isCurrent: !qParam,
            ...(qParam ? { href: `/products?category=${encodeURIComponent(categoryParam)}` } : {}),
          },
          ...(qParam ? [{ label: `Search: "${qParam}"`, isCurrent: true }] : []),
        ]
      : qParam
      ? [
          { label: 'Products', href: '/products' },
          { label: `Search: "${qParam}"`, isCurrent: true },
        ]
      : [
          {
            label: 'All Products',
            isCurrent: true,
            count: initialProducts?.length,
          },
        ]),
  ]

  const pageTitle = categoryParam
    ? `${categoryParam} Replacement Screens | DisplayCellPros`
    : qParam
    ? `Search Results for "${qParam}" | DisplayCellPros`
    : 'All Products & Replacement Screens | DisplayCellPros'

  const pageDescription = categoryParam
    ? `Explore our premium selection of ${categoryParam} screen assemblies and repair components with fast shipping.`
    : qParam
    ? `Search results for "${qParam}". Browse available smartphone displays and repair components in our inventory.`
    : 'Explore all available OEM and LCD replacement screen assemblies and repair accessories for Samsung Galaxy and modern devices.'

  return (
    <>
      <DynamicSEO
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={breadcrumbItems}
      />

      <main className="min-h-screen bg-neutral-50/50 py-6">
        {/* Breadcrumb Navigation above product listing */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <Breadcrumbs
            id="products-page-breadcrumbs"
            items={breadcrumbItems}
            variant="contained"
            showHomeIcon={true}
            showBackOnMobile={true}
          />
        </div>

        <ProductGrid
          initialProducts={initialProducts}
          title="Catalog & Screen Replacements"
          subtitle="Explore genuine OEM and premium device replacement screens, gaming repair parts, and on-site diagnostic services."
          showControls={true}
          initialQuery={qParam}
          initialCategory={categoryParam}
          onSearchChange={handleSearchChange}
        />
      </main>
    </>
  )
}
