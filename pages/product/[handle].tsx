import type {
  GetStaticPathsContext,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import { useSafeRouter } from '@lib/hooks/useSafeRouter'
import Head from 'next/head'
import { BuilderComponent, builder, useIsPreviewing } from '@builder.io/react'
import { resolveBuilderContent } from '@lib/resolve-builder-content'
import '../../blocks/ProductView/ProductView.builder'
import builderConfig from '@config/builder'
import { getLayoutProps } from '@lib/get-layout-props'
import {
  fetchStorefrontProductByHandle,
  fetchAllAvailableProducts,
  ShopifyProductDetailNode,
} from '../../services/shopify'
import { ProductDetail } from '../../components/products/ProductDetail'
import { ProductDetailSkeleton } from '../../components/products/ProductDetailSkeleton'
import { Breadcrumbs, formatProductBreadcrumbs } from '../../components/common/Breadcrumbs'
import DynamicSEO from '../../components/DynamicSEO'

if (builderConfig.apiKey) {
  builder.init(builderConfig.apiKey)
}

const builderModel = 'product-page'

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ handle: string }>) {
  const handle = params?.handle || ''

  try {
    // Fetch product directly from Shopify Storefront API using the handle
    const res = await fetchStorefrontProductByHandle(handle)
    const storefrontProduct = res.ok && res.data?.product ? res.data.product : null

    // Optionally resolve Builder CMS content if configured
    const page = await resolveBuilderContent(builderModel, locale, {
      productHandle: handle,
    }).catch((err) => {
      console.warn(`[pages/product] Error resolving Builder content for handle "${handle}":`, err)
      return null
    })

    // If neither product nor builder page exists, return 404
    if (!storefrontProduct && !page) {
      return {
        notFound: true,
        revalidate: 30,
      }
    }

    const layoutProps = await getLayoutProps().catch((err) => {
      console.warn(`[pages/product] Error resolving layout props for handle "${handle}":`, err)
      return { theme: null }
    })

    return {
      revalidate: 30,
      props: {
        page: page,
        storefrontProduct: storefrontProduct,
        ...layoutProps,
      },
    }
  } catch (error) {
    console.error(`[pages/product] Unexpected error in getStaticProps for handle "${handle}":`, error)
    return {
      notFound: true,
      revalidate: 30,
    }
  }
}

export async function getStaticPaths({ locales }: GetStaticPathsContext) {
  try {
    const res = await fetchAllAvailableProducts({ maxProducts: 50, onlyAvailable: false })
    const paths = res.products.map((p) => `/product/${p.handle}`)
    return {
      paths: paths.length > 0 ? paths : [],
      fallback: true,
    }
  } catch (err) {
    console.error('Failed to get static paths for products:', err)
    return {
      paths: [],
      fallback: true,
    }
  }
}

export default function Handle({
  page,
  storefrontProduct,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useSafeRouter()
  const isLive = !useIsPreviewing()

  // Derive dynamic breadcrumbs path (Home > Category > Product)
  const categoryParam = typeof router.query.category === 'string' ? router.query.category : null
  const fromCollection = typeof router.query.collection === 'string' ? router.query.collection : null
  const productHandle = typeof router.query.handle === 'string' ? router.query.handle : storefrontProduct?.handle

  const breadcrumbItems = storefrontProduct
    ? formatProductBreadcrumbs({
        product: storefrontProduct,
        categoryOverride: categoryParam,
        collectionOverride: fromCollection,
        includeProductsRoot: false,
      })
    : [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        {
          label: productHandle
            ? productHandle.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            : 'Product Details',
          isCurrent: true,
        },
      ]

  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto mb-4">
          <Breadcrumbs
            id="product-fallback-top-breadcrumbs"
            variant="contained"
            showHomeIcon={true}
            showBackOnMobile={true}
            productHandle={productHandle}
            categoryOverride={categoryParam}
            collectionOverride={fromCollection}
            items={[
              { label: 'Home', href: '/' },
              { label: 'Products', href: '/products' },
              { label: 'Loading product...', isCurrent: true },
            ]}
          />
        </div>
        <ProductDetailSkeleton asModal={false} className="shadow-md" />
      </div>
    )
  }

  // If Builder.io content exists for this page, render via BuilderComponent
  if (page) {
    return (
      <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8">
        <DynamicSEO product={storefrontProduct} breadcrumbs={breadcrumbItems} />
        <div className="w-full max-w-7xl mx-auto mb-4">
          <Breadcrumbs
            id="product-builder-top-breadcrumbs"
            variant="contained"
            showHomeIcon={true}
            showBackOnMobile={true}
            product={storefrontProduct}
            productHandle={productHandle}
            categoryOverride={categoryParam}
            collectionOverride={fromCollection}
            items={breadcrumbItems}
          />
        </div>
        <BuilderComponent
          key={storefrontProduct?.id || 'product'}
          model={builderModel}
          options={{ enrich: true }}
          data={{ product: storefrontProduct }}
          content={page}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <DynamicSEO product={storefrontProduct} breadcrumbs={breadcrumbItems} />

      {/* Dynamic Breadcrumb Navigation above Product Details */}
      <div className="w-full max-w-7xl mx-auto mb-4">
        <Breadcrumbs
          id="product-page-top-breadcrumbs"
          variant="contained"
          showHomeIcon={true}
          showBackOnMobile={true}
          product={storefrontProduct}
          productHandle={productHandle}
          categoryOverride={categoryParam}
          collectionOverride={fromCollection}
          items={breadcrumbItems}
        />
      </div>

      <ProductDetail
        handle={(router.query.handle as string) || storefrontProduct?.handle}
        initialProduct={storefrontProduct}
        asModal={false}
        showBreadcrumbs={false}
        onBackToGrid={() => {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
          } else {
            router.push('/products')
          }
        }}
        className="shadow-md"
      />
    </div>
  )
}

