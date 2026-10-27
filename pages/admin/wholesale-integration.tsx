import React from 'react'
import Head from 'next/head'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { WholesaleDashboard } from '../../components/wholesale/WholesaleDashboard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function WholesaleIntegrationAdminPage() {
  return (
    <>
      <Head>
        <title>Automated Wholesale Parts Integration | Display &amp; Cell Pros</title>
        <meta
          name="description"
          content="Middleware integration hub for MobileSentrix and InjuredGadgets suppliers with dynamic margin rules and safety stock buffers."
        />
      </Head>

      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Breadcrumbs />
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Store
            </Link>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <WholesaleDashboard />
        </main>
      </div>
    </>
  )
}
