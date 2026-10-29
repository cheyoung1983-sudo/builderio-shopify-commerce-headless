import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Wrench,
  Package,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  HelpCircle,
  FileText,
} from 'lucide-react'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { MailInRepairRequestForm } from '../components/services/MailInRepairRequestForm'
import { RepairStatusTracker } from '../components/services/RepairStatusTracker'
import { MailInRepairEstimator } from '../components/services/MailInRepairEstimator'
import { PREPAID_SHIPPING_SPECS } from '../lib/repair-bridge'
import { MAIL_IN_TERMS } from '../lib/pricing/mail-in-policy'

export default function ServicesPage() {
  return (
    <>
      <Head>
        <title>Mail-In Repair Services | Certified Smartphone &amp; Screen Repair | DisplayCellPros</title>
        <meta
          name="description"
          content="Nationwide mail-in smartphone and tablet repair service. Shipping kit with a 2.0 lb box, certified technicians, 24-48h turnaround, and lifetime workmanship warranty."
        />
        <meta property="og:title" content="Mail-In Repair Services | DisplayCellPros" />
        <meta
          property="og:description"
          content="Ship your device for professional screen replacement, battery health service, and board repairs. Includes a shipping kit and real-time repair tracking. $40 diagnostic fee credited toward an approved repair."
        />
      </Head>

      <div className="min-h-screen bg-neutral-50/70 pb-24">
        {/* Breadcrumbs Navigation */}
        <div className="bg-white border-b border-neutral-200/80 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
          </div>
        </div>

        {/* Hero Section */}
        <header className="relative bg-white border-b border-neutral-200/80 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span>Certified White-Glove Mail-In Service</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Nationwide Mail-In Repair Service
              </h1>

              <p className="text-base text-neutral-600 leading-relaxed">
                Prefer professional installation over DIY? Send your device to our specialized Spokane repair facility. Every intake includes an electrostatic foam shipping box with{' '}
                <strong className="text-neutral-900">Prepaid Return Postage (rated up to {PREPAID_SHIPPING_SPECS.maxPackageWeightLbs.toFixed(1)} lbs / {PREPAID_SHIPPING_SPECS.maxPackageWeightOz} oz)</strong>, full transit insurance, and rapid 24–48h turnaround.
              </p>

              {/* Service Badges */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-xs font-medium text-neutral-800">
                  <Truck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>We Pay Return Shipping</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-xs font-medium text-neutral-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>UN3481 Li-Ion Ground Compliant</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-xs font-medium text-neutral-800">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>24–48 Hour Bench Turnaround</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 md:max-w-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <Package className="w-4 h-4 text-emerald-700" />
                <span>How Mail-In Repair Works</span>
              </div>

              <ol className="text-xs text-neutral-700 space-y-2 list-decimal list-inside font-medium">
                <li>Submit your device details and symptom below.</li>
                <li>We send a custom ESD mailer. {MAIL_IN_TERMS}</li>
                <li>Pack your phone and hand it to USPS or UPS.</li>
                <li>We complete repairs, test, and ship it back via Priority Air.</li>
              </ol>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                <Link
                  href="/services-faq"
                  className="text-emerald-800 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>View Services &amp; Tribal Tax FAQ</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Form Intake Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
          {/* Intake Form */}
          <section id="intake-form-section" className="scroll-mt-20">
            <MailInRepairRequestForm />
          </section>

          {/* Status Tracker Section */}
          <section id="status-tracker-section" className="space-y-4 scroll-mt-20">
            <div className="border-b border-neutral-200 pb-3">
              <h2 className="text-xl font-bold text-neutral-900">
                Track Existing Mail-In Repair
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Already sent in your device? Enter your Repair Management System (RMS) number to view live bench status.
              </p>
            </div>
            <RepairStatusTracker />
          </section>

          {/* Repair Cost & Turnaround Estimator */}
          <section id="estimator-section" className="scroll-mt-20">
            <MailInRepairEstimator />
          </section>
        </main>
      </div>
    </>
  )
}
