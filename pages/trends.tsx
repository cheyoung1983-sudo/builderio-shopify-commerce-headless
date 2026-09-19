import React from 'react'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { DynamicSEO } from '../components/common/DynamicSEO'
import { getLayoutProps } from '../lib/get-layout-props'
import { TrendsHub } from '../components/trends/TrendsHub'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

export async function getStaticProps(context: GetStaticPropsContext) {
  const layoutProps = await getLayoutProps()

  return {
    props: {
      ...layoutProps,
    },
    revalidate: 60,
  }
}

export default function TrendsPage(
  props: InferGetStaticPropsType<typeof getStaticProps>
) {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Design Trends 2026', isCurrent: true },
  ]

  return (
    <>
      <DynamicSEO
        title="Modern Web Development Styles & Trends 2026 | DisplayCellPros"
        description="Explore five defining web development styles and trends: Barely There UI, Tactile Maximalism, Nature Distilled, Agentic AI Interfaces, and Immersive 3D Glassmorphism 2.0."
        breadcrumbs={breadcrumbItems}
      />

      <div className="min-h-screen bg-canvas py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <Breadcrumbs
            id="trends-page-breadcrumbs"
            items={breadcrumbItems}
          />
        </div>

        <TrendsHub />
      </div>
    </>
  )
}
