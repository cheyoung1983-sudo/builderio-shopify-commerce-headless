import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { OrderTracking } from '../components/orders'
import { RepairStatusTracker } from '../components/services/RepairStatusTracker'
import { ReservationMapOverlay } from '../components/tribal/ReservationMapOverlay'
import { Truck, ShieldCheck, Clock, Headphones, ShoppingBag, Wrench } from 'lucide-react'

export default function OrderTrackingPage() {
  const router = useRouter()
  const orderIdQuery = typeof router.query.orderId === 'string' ? router.query.orderId : ''
  const emailQuery = typeof router.query.email === 'string' ? router.query.email : ''
  const rmsQuery = typeof router.query.rms === 'string' ? router.query.rms : ''

  const [activeTab, setActiveTab] = useState<'parts' | 'repairs'>(rmsQuery ? 'repairs' : 'parts')

  useEffect(() => {
    if (rmsQuery && activeTab !== 'repairs') {
      const timer = setTimeout(() => {
        setActiveTab('repairs')
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [rmsQuery, activeTab])

  return (
    <>
      <Head>
        <title>Track Order &amp; Repair Status | DisplayCellPros</title>
        <meta
          name="description"
          content="Track your DisplayCellPros parts shipment or live mail-in repair cleanroom diagnostics in real-time."
        />
        <meta property="og:title" content="Track Order & Repair Status | DisplayCellPros" />
        <meta
          property="og:description"
          content="Track parts shipments or real-time mail-in repair status from DisplayCellPros cleanroom facility."
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
          {/* Tracking Mode Navigation Tabs */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex rounded-2xl bg-neutral-200/70 p-1.5 border border-neutral-300/60 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('parts')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer ${
                  activeTab === 'parts'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                <span>Replacement Parts Orders</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('repairs')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer ${
                  activeTab === 'repairs'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Wrench className="w-4 h-4 text-emerald-700" />
                <span>Mail-In Cleanroom Repairs</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2">
                  Live
                </span>
              </button>
            </div>
          </div>

          {/* Tab 1: Store Order Tracking */}
          {activeTab === 'parts' && (
            <div>
              <OrderTracking
                initialOrderId={orderIdQuery}
                initialEmail={emailQuery}
              />
            </div>
          )}

          {/* Tab 2: Mail-In Repair Status Tracker */}
          {activeTab === 'repairs' && (
            <div>
              <RepairStatusTracker
                initialRms={rmsQuery || 'DCP-RMS-100001'}
              />
            </div>
          )}

          {/* AIANA Reservation Boundary GIS Verification Map Overlay */}
          <div className="mt-8">
            <ReservationMapOverlay
              userAddress={{ state: 'CA', city: 'Hoopa', zip: '95546' }}
              reservationName="Hoopa Valley Indian Reservation"
              isOnReservation={true}
            />
          </div>

          {/* Value Pillars / Trust Highlights */}
          <div className="mt-16 pt-12 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border-subtle shadow-2xs">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                <Truck className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Tracked Courier</h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Full step-by-step telemetry via FedEx &amp; UPS Priority.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border-subtle shadow-2xs">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Cleanroom Bench QA</h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Screens and batteries are bench-tested before boxing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border-subtle shadow-2xs">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                <Clock className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">24-48h Bench TAT</h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Fast hardware turnaround with insured overnight return.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border-subtle shadow-2xs">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                <Headphones className="w-4 h-4 text-emerald-700" />
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
