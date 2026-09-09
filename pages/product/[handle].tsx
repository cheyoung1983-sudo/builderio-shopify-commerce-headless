import type {
  GetStaticPathsContext,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import { useRouter } from 'next/router'
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
import { Breadcrumbs } from '../../components/common/Breadcrumbs'

if (builderConfig.apiKey) {
  builder.init(builderConfig.apiKey)
}

const builderModel = 'product-page'

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ handle: string }>) {
  try {
    const handle = params?.handle || ''

    // Fetch product directly from Shopify Storefront API using the handle
    const res = await fetchStorefrontProductByHandle(handle)
    const storefrontProduct = res.ok && res.data?.product ? res.data.product : null

    // Optionally resolve Builder CMS content if configured
    const page = await resolveBuilderContent(builderModel, locale, {
      productHandle: handle,
    })

    // If neither product nor builder page exists, return 404
    if (!storefrontProduct && !page) {
      return {
        notFound: true,
        revalidate: 30,
      }
    }

    return {
      revalidate: 30,
      props: {
        page: page || null,
        storefrontProduct: storefrontProduct || null,
        ...(await getLayoutProps()),
      },
    }
  } catch (err) {
    console.error('getStaticProps error in product:', err)
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
  const router = useRouter()
  const isLive = !useIsPreviewing()

  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8">
        <ProductDetailSkeleton asModal={false} className="shadow-md" />
      </div>
    )
  }

  // If Builder.io content exists for this page, render via BuilderComponent
  if (page) {
    return (
      <BuilderComponent
        key={storefrontProduct?.id || 'product'}
        model={builderModel}
        options={{ enrich: true }}
        data={{ product: storefrontProduct }}
        content={page}
      />
    )
  }

  const title = storefrontProduct?.title
    ? `${storefrontProduct.title} | DisplayCellPros`
    : 'Product Details | DisplayCellPros'
  const description =
    storefrontProduct?.description ||
    'Shop replacement screens and repair parts with professional installation included.'

  return (
    <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {storefrontProduct?.featuredImage?.url && (
          <meta property="og:image" content={storefrontProduct.featuredImage.url} />
        )}
      </Head>

      {/* Breadcrumb Navigation */}
      <div className="max-w-6xl mx-auto mb-3.5">
        <Breadcrumbs
          id="product-page-top-breadcrumbs"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/' },
            ...(storefrontProduct?.productType
              ? [
                  {
                    label: storefrontProduct.productType,
                    href: `/?category=${encodeURIComponent(
                      storefrontProduct.productType
                    )}`,
                  },
                ]
              : []),
            {
              label: storefrontProduct?.title || 'Product Details',
              isCurrent: true,
            },
          ]}
        />
      </div>

      <ProductDetail
        handle={(router.query.handle as string) || storefrontProduct?.handle}
        initialProduct={storefrontProduct}
        asModal={false}
        onBackToGrid={() => router.push('/')}
        className="shadow-md"
      />
    </div>
  )
}

