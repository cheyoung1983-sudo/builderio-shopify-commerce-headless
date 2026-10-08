import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  ShieldCheck,
  Package,
  Sparkles,
  Truck,
  ArrowRight,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Clock,
  Layers,
  Wrench,
  BatteryCharging,
  Info,
  HelpCircle,
} from 'lucide-react'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { TribalEligibilityChecker } from '../components/tribal/TribalEligibilityChecker'
import { TribalEligibilityCalculator } from '../components/services/TribalEligibilityCalculator'
import { MailInRepairRequestForm } from '../components/services/MailInRepairRequestForm'
import { RepairStatusTracker } from '../components/services/RepairStatusTracker'
import { MailInRepairEstimator } from '../components/services/MailInRepairEstimator'
import { ServicesFaqAccordion } from '../components/services/ServicesFaqAccordion'

export default function ServicesFaqPage() {
  return (
    <>
      <Head>
        <title>Services &amp; Discounts FAQ | Tribal Tax Exemption &amp; Mail-In Repair | DisplayCellPros</title>
        <meta
          name="description"
          content="Customer education hub and comprehensive FAQ for DisplayCellPros official 20% tribal discounts, statutory sales tax exemptions, and white-glove mail-in repair services."
        />
        <meta property="og:title" content="Services & Discounts FAQ | DisplayCellPros" />
        <meta
          property="og:description"
          content="Learn about our official 20% tribal member discount, on-reservation sales tax exemption compliance, and complimentary mail-in repair reverse logistics."
        />
      </Head>

      <div className="min-h-screen bg-neutral-50/70 pb-24">
        {/* Breadcrumb Bar */}
        <div className="bg-white border-b border-neutral-200/80 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
          </div>
        </div>

        {/* Page Hero */}
        <header className="relative bg-white border-b border-neutral-200/80 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300/80 text-neutral-800 text-xs font-semibold uppercase tracking-wider mb-4">
                <Layers className="w-3.5 h-3.5 text-neutral-600" />
                <span>Customer Education Hub &amp; Service Knowledge Base</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                Services, Discounts &amp; Compliance Hub
              </h1>

              <p className="mt-4 text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl">
                Explore comprehensive guidelines and answers for our dual-track <strong>Tribal Privileges</strong> (20% official commercial discount + statutory sales tax exemptions) and our <strong>White-Glove Mail-In Device Repair Program</strong> with complimentary reverse shipping.
              </p>

              {/* Jump anchors */}
              <div className="mt-6 flex flex-wrap gap-2.5">
                <a
                  href="#tribal-overview"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Tribal 20% Discount &amp; Tax Exemption</span>
                </a>
                <a
                  href="#mail-in-overview"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Mail-In Repair System</span>
                </a>
                <a
                  href="#interactive-tools"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Calculators</span>
                </a>
                <a
                  href="#faq-section"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Frequently Asked Questions</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-16">
          {/* Track 1: Tribal Tax Exemption & 20% Official Discount Highlights */}
          <section id="tribal-overview" className="space-y-6 scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-neutral-200 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Track 1 · Statutory Compliance &amp; Affinity Program
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
                  Tribal Tax Exemption &amp; Official 20% Commercial Discount
                </h2>
              </div>
              <span className="text-xs text-neutral-500 font-mono">
                Federal Indian Law &amp; State Revenue Statutes
              </span>
            </div>

            {/* Dual Track Summary Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: 20% Commercial Discount */}
              <div className="rounded-2xl border border-amber-200/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                      Commercial Identity Privilege
                    </span>
                    <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-bold">
                      20% OFF
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    Official 20% Discount for All Enrolled Tribal Members
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-4">
                    A discretionary affinity benefit to support electronics repair technicians, hobbyists, and community members across Indian Country.
                  </p>

                  <ul className="space-y-2 text-xs text-neutral-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Universal Applicability:</strong> Available on all replacement screens, batteries, and toolkits regardless of shipping address.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Zero-Party Verification:</strong> Instant 60-second verification via SheerID / ID.me or manual Tribal ID / CDIB review.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Automatic Checkout Application:</strong> Once verified, your account automatically receives 20% off with zero expired promo codes.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Delivery Location:</span>
                  <span className="font-semibold text-neutral-900">On or Off Reservation</span>
                </div>
              </div>

              {/* Card 2: Statutory Sales Tax Exemption */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                      Statutory Tax Preemption
                    </span>
                    <span className="rounded-md bg-emerald-100 text-emerald-900 px-2 py-0.5 text-xs font-bold">
                      100% TAX FREE
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    Statutory Sales Tax Exemption for On-Reservation Delivery
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-4">
                    Under constitutional federal Indian law, states are preempted from imposing retail sales taxes on enrolled tribal members inside Indian Country.
                  </p>

                  <ul className="space-y-2 text-xs text-neutral-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>3 Concurrent Criteria:</strong> Requires verified enrollment + physical delivery in Indian Country + title passage on reservation.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>State Specific Rules:</strong> Compliant with California CDTFA Reg 1616 (Form 146-RES), Washington WAC 458-20-192, and Arizona TPT 95-11.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>GIS Geofencing:</strong> Addresses verified against official US Census Bureau TIGER/Line reservation boundary shapefiles.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Delivery Location:</span>
                  <span className="font-semibold text-emerald-700">Reservation / Trust Lands Only</span>
                </div>
              </div>
            </div>

            {/* 4 Checkout Scenarios Reference Table */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <h3 className="text-base font-bold text-neutral-900 mb-3">
                The 4 Customer Checkout Scenarios
              </h3>
              <p className="text-xs text-neutral-600 mb-4">
                To eliminate tax audit exposure and guarantee compliance, our headless checkout evaluates every order against these four standardized scenarios:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-800 font-semibold">
                      <th className="py-2.5 px-3">Scenario</th>
                      <th className="py-2.5 px-3">Enrollment Status</th>
                      <th className="py-2.5 px-3">Delivery Destination</th>
                      <th className="py-2.5 px-3">Commercial Discount</th>
                      <th className="py-2.5 px-3">Sales Tax Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    <tr className="bg-amber-50/30">
                      <td className="py-3 px-3 font-semibold text-neutral-900">Scenario 1 (Maximum Savings)</td>
                      <td className="py-3 px-3">Verified Enrolled Member</td>
                      <td className="py-3 px-3">On-Reservation (Indian Country)</td>
                      <td className="py-3 px-3 font-bold text-amber-700">20% Off Parts</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">100% Tax Exempt (Entity Code C)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-neutral-900">Scenario 2 (Identity Privilege)</td>
                      <td className="py-3 px-3">Verified Enrolled Member</td>
                      <td className="py-3 px-3">Off-Reservation Address</td>
                      <td className="py-3 px-3 font-bold text-amber-700">20% Off Parts</td>
                      <td className="py-3 px-3 text-neutral-500">Standard State Tax Applied</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-neutral-900">Scenario 3 (Non-Enrolled on Res)</td>
                      <td className="py-3 px-3">Non-Enrolled Customer</td>
                      <td className="py-3 px-3">On-Reservation Address</td>
                      <td className="py-3 px-3 text-neutral-400">No Discount</td>
                      <td className="py-3 px-3 text-neutral-500">Standard State Tax Applied</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-neutral-900">Scenario 4 (Standard Retail)</td>
                      <td className="py-3 px-3">Non-Enrolled Customer</td>
                      <td className="py-3 px-3">Off-Reservation Address</td>
                      <td className="py-3 px-3 text-neutral-400">No Discount</td>
                      <td className="py-3 px-3 text-neutral-500">Standard State Tax Applied</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Track 2: White-Glove Mail-In Repair System */}
          <section id="mail-in-overview" className="space-y-6 scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-neutral-200 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Track 2 · Direct-to-Consumer Service Lifecycle
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
                  White-Glove Mail-In Repair &amp; Reverse Logistics
                </h2>
              </div>
              <span className="text-xs text-neutral-500 font-mono">
                Pay-On-Use API &amp; DOT UN3481 Compliance
              </span>
            </div>

            {/* 5-Stage Visual Workflow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-600 block">Stage 01</span>
                <h4 className="text-sm font-bold text-neutral-900">Digital Intake &amp; Order</h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Select your replacement part and labor bundle. A digital service ticket is created with active inventory reservation.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-600 block">Stage 02</span>
                <h4 className="text-sm font-bold text-neutral-900">Express Kit Dispatch</h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  We rush-ship a 32-ECT box with custom foam, ESD bag, UN3481 labels, and pre-addressed return label via UPS/FedEx Overnight.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-600 block">Stage 03</span>
                <h4 className="text-sm font-bold text-neutral-900">Inbound Reverse Transit</h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Place device inside and hand to courier. Scan-based Pay-On-Use shipping means $0 return cost to you.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-600 block">Stage 04</span>
                <h4 className="text-sm font-bold text-neutral-900">Bench Triage &amp; Repair</h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  High-res photo intake, bus diagnostics, component replacement at grounded ESD benches, and QA checklists.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-600 block">Stage 05</span>
                <h4 className="text-sm font-bold text-neutral-900">Insured Outbound Return</h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Your repaired hardware is sanitized, repackaged in custom foam, and dispatched back to your door with full tracking.
                </p>
              </div>
            </div>

            {/* Battery Safety & Pre-Shipment Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 p-6 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 text-xs font-bold uppercase tracking-wider">
                  <BatteryCharging className="w-4 h-4 text-blue-600" />
                  <span>DOT 49 CFR 173.185 &amp; IATA PI 967 Safety</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  Lithium-Ion Battery Transport Compliance
                </h3>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  Damaged devices shipped via air freight must maintain a State of Charge (SoC) under 30% to prevent thermal runaway. Outer mailer boxes are pre-labeled with weather-resistant UN3481 red-hatched markings and a 24/7 emergency response contact.
                </p>
                <div className="rounded-lg bg-white border border-blue-200 p-3 text-[11px] text-blue-950">
                  <strong>Swollen Battery Notice:</strong> Damaged, Defective, or Recalled (DDR) batteries are strictly forbidden from air freight. Notify us during intake for specialized fire-rated Ground Transit Only packaging.
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
                <div className="flex items-center gap-2 text-neutral-900 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Mandatory Customer Pre-Shipment SOP</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  Pre-Flight Checklist Before Packing
                </h3>
                <ul className="space-y-2 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-neutral-900">1.</span>
                    <span><strong>Data Backup:</strong> Back up all photos and files to cloud storage. Service centers cannot guarantee software integrity.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-neutral-900">2.</span>
                    <span><strong>Lock Removal:</strong> Disable Apple Find My, Google FRP, and device passcodes for technician diagnostic testing.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-neutral-900">3.</span>
                    <span><strong>Power Down:</strong> Turn off device with battery level discharged below 30%.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-neutral-900">4.</span>
                    <span><strong>Strip Accessories:</strong> Keep your cases, charging cables, SIM cards, and micro-SD cards at home.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Interactive Calculators */}
          <section id="interactive-tools" className="space-y-8 scroll-mt-20">
            <div className="border-b border-neutral-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Self-Service Interactive Suites
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
                Check Eligibility &amp; Request Mail-In Kit
              </h2>
            </div>

            {/* Interactive Tribal Enrollment Checker with Customer Lock */}
            <TribalEligibilityChecker />

            {/* Tribal Scenario & State Tax Calculator */}
            <TribalEligibilityCalculator />

            {/* Comprehensive Mail-In Repair Request & Shipping Kit Form */}
            <MailInRepairRequestForm />

            {/* Real-Time Live Repair Status Tracker */}
            <RepairStatusTracker initialRms="DCP-RMS-100001" />

            {/* Mail-In Repair Estimator Quick Guide */}
            <MailInRepairEstimator />
          </section>

          {/* Section 4: Categorized Dual-Tone FAQ Accordion */}
          <section id="faq-section" className="space-y-6 scroll-mt-20">
            <div className="border-b border-neutral-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Customer Support &amp; Knowledge Base
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                Find answers regarding statutory tribal exemptions, our official 20% discount, reverse logistics, and hazardous materials shipping protocols.
              </p>
            </div>

            <ServicesFaqAccordion />
          </section>

          {/* Bottom CTA Banner */}
          <section className="rounded-3xl border border-neutral-900 bg-neutral-950 text-white p-8 sm:p-10 shadow-lg text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Ready to Order Replacement Parts or Book a Repair?
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Browse our full catalog of OEM-grade OLED displays, tested batteries, and technician toolkits with same-day dispatch before 2 PM PT.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link
                href="/products"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-100 transition-colors text-center inline-flex items-center justify-center gap-2"
              >
                <span>Browse Product Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/order-tracking"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 text-white font-semibold text-xs border border-neutral-700 hover:bg-neutral-700 transition-colors text-center"
              >
                Track Active Order
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
