import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Link from 'next/link'
import { BuilderComponent, builder } from '@builder.io/react'
import { useThemeUI } from '@theme-ui/core'
import { ProductGrid } from '@components/products/ProductGrid'
import { FAQAccordion } from '@components/common/FAQAccordion'
import { DynamicSEO } from '@components/common/DynamicSEO'
import { resolveBuilderContent } from '@lib/resolve-builder-content'
import { getLayoutProps } from '@lib/get-layout-props'
import { fetchAllAvailableProducts, ShopifyProductNode } from '@services/shopify'
import builderConfig from '@config/builder'
import { isMaintenanceMode, sendMaintenanceResponse } from '@lib/maintenance'

const MAINTENANCE_HTML_PATH = join(process.cwd(), 'content', 'maintenance-homepage.html')
const builderModel = 'page'

if (builderConfig.apiKey) {
  builder.init(builderConfig.apiKey)
}

const FALLBACK_MAINTENANCE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Temporarily Unavailable | DisplayCellPros</title></head><body><main><h1>We’ll be back soon</h1><p>Our website is temporarily unavailable. Call or text us at <a href="tel:+15092553852">(509) 255-3852</a> for help.</p></main></body></html>`

export const getServerSideProps: GetServerSideProps = async ({ res, locale }) => {
  if (isMaintenanceMode()) {
    let html = FALLBACK_MAINTENANCE_HTML
    try {
      html = readFileSync(MAINTENANCE_HTML_PATH, 'utf8')
    } catch (error) {
      console.error('[homepage] Could not read maintenance page:', error)
    }
    sendMaintenanceResponse(res, html)
    return { props: { isMaintenance: true } }
  }

  const [page, layoutProps] = await Promise.all([
    resolveBuilderContent(builderModel, locale, { urlPath: '/' }).catch((error) => {
      console.error('[homepage] Could not load Builder page:', error)
      return null
    }),
    getLayoutProps().catch(() => ({ theme: null })),
  ])

  let fallbackProducts: ShopifyProductNode[] = []
  if (!page) {
    try {
      const result = await fetchAllAvailableProducts({ batchSize: 16, onlyAvailable: false })
      fallbackProducts = result.products
    } catch (error) {
      console.error('[homepage] Could not load fallback products:', error)
    }
  }

  return { props: { isMaintenance: false, page, fallbackProducts, ...layoutProps } }
}

export default function Homepage({
  isMaintenance,
  page,
  fallbackProducts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { theme } = useThemeUI()

  if (isMaintenance) return null

  if (page) {
    return (
      <>
        <DynamicSEO page={page} />
        <BuilderComponent
          key={page.id || 'page'}
          options={{ enrich: true }}
          model={builderModel}
          data={{ theme }}
          content={page}
        />
      </>
    )
  }

  return (
    <>
      <DynamicSEO
        title="Fast On-Site Screen & Device Repair in Spokane | DisplayCellPros"
        description="Professional OEM & premium repairs for smartphones, gaming consoles, and computers—done on-site with expert support in Spokane."
      />
      <main className="min-h-screen bg-neutral-50/50 py-10">
        <section className="w-full max-w-7xl mx-auto px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Fast On-Site Screen &amp; Device Repair in Spokane
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Professional OEM &amp; premium repairs for smartphones, gaming consoles, and computers—done on-site with expert support.
          </p>
          <Link
            href="/products"
            className="mt-7 inline-flex rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
          >
            Browse all products
          </Link>
          <Link
            href="/diagnosis"
            className="mt-7 ml-3 inline-flex rounded-md border border-emerald-700 px-5 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Get a diagnosis
          </Link>
        </section>
        <section className="w-full max-w-7xl mx-auto mt-12 px-4 sm:px-6 lg:px-8">
          <ProductGrid
            initialProducts={fallbackProducts}
            title="Featured Repairs & Replacement Parts"
            subtitle="Explore our top on-site repair services and replacement assemblies in Spokane."
            showControls
          />
        </section>
        <FAQAccordion
          id="homepage-faq"
          title="Repair Warranties & Timelines FAQ"
          subtitle="Clear answers on our 1-year replacement warranty, same-day Spokane on-site dispatches, and turnaround times."
        />
      </main>
    </>
  )
}
