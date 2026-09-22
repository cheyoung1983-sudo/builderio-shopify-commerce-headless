import React from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { OrderTracking } from '../components/orders'
import { Truck, ShieldCheck, Clock, Headphones } from 'lucide-react'

export default function OrderTrackingPage() {
  const router = useRouter()
  const orderIdQuery = typeof router.query.orderId === 'string' ? router.query.orderId : ''
  const emailQuery = typeof router.query.email === 'string' ? router.query.email : ''

  return (
    <>
      <Head>
        <title>Track Order & Delivery Status | DisplayCellPros</title>
        <meta
          name="description"
          content="Track your DisplayCellPros shipment, view carrier milestones, and check estimated delivery times in real-time."
        />
        <meta property="og:title" content="Track Order & Delivery Status | DisplayCellPros" />
        <meta
          property="og:description"
          content="Track your DisplayCellPros shipment, view carrier milestones, and check estimated delivery times in real-time."
        />
      </Head>

      <div className="min-h-screen bg-neutral-50/60 pb-20">
        {/* Breadcrumb Navigation Bar */}
        <div className="bg-white border-b border-border-subtle py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
          </div>
        </div>

        {/* Main Content Area */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
          {/* Order Tracking Component */}
          <OrderTracking
            initialOrderId={orderIdQuery}
            initialEmail={emailQuery}
          />

          {/* Value Pillars / Trust Highlights */}
          <div className="mt-16 pt-12 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border-subtle shadow-2xs">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Tracked Courier</h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Full step-by-step telemetry via FedEx & USPS Priority.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border-subtle shadow-2xs">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Lab Tested First</h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Screens and batteries are bench-tested before boxing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border-subtle shadow-2xs">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Same-Day Dispatch</h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Orders before 2 PM EST ship out the same business day.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border-subtle shadow-2xs">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Technician Desk</h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Direct hardware support from certified repair specialists.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
