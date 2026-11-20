import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Stethoscope, ListChecks, Gauge, AlertTriangle, Receipt, Phone, Mail, ArrowUpRight, Wrench, Package, ArrowRight } from 'lucide-react'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { VoiceNarrator } from '../components/voice/VoiceNarrator'
import { BUSINESS_INFO } from '../lib/business-info'

const TRIAGE_URL = 'https://triage.displaycellpros.com'
const PAGE_URL = `${BUSINESS_INFO.url}/diagnosis`
const TITLE = 'Get a Diagnosis | Display & Cell Pros'
const DESCRIPTION =
  'Describe what is wrong with your phone and get a suggested repair tier and next step from Display & Cell Pros. Board, liquid, no-power and unclear cases go straight to a technician.'

const TIERS = [
  {
    name: 'Tier 1: power and port',
    covers: 'Battery and charging port repairs.',
    outcome: 'Quotable. We can give you an estimate.',
  },
  {
    name: 'Tier 2: display',
    covers: 'Screen (aftermarket or OEM), camera and back glass.',
    outcome: 'Quotable. We can give you an estimate.',
  },
  {
    name: 'Tier 3: advanced',
    covers: 'Logic board, liquid or water damage, no power, data recovery, and anything unclear.',
    outcome: 'No price is quoted. Ryan reviews it and contacts you.',
  },
]

export default function DiagnosisPage() {
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
      </Head>

      <div className="min-h-screen bg-neutral-50/70 pb-24">
        <div className="bg-white border-b border-neutral-200/80 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
          </div>
        </div>

        <header className="bg-white border-b border-neutral-200/80 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-4">
              <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Free online triage</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Not sure what&apos;s wrong with your device?
            </h1>
            <p className="mt-4 text-lg text-neutral-600">
              Tell our diagnosis tool what&apos;s happening and it suggests which kind of repair you likely need and what to do next,
              before you book anything.
            </p>
            <a
              href={TRIAGE_URL}
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Start your diagnosis
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </a>
            <p className="mt-3 text-sm text-neutral-500">Opens our diagnosis tool at triage.displaycellpros.com.</p>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-8">
          <section aria-labelledby="what-it-asks" className="rounded-xl bg-white border border-neutral-200 p-6">
            <h2 id="what-it-asks" className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
              <ListChecks className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              What the tool asks
            </h2>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-neutral-700">
              <li>Your phone model (optional), for example &ldquo;iPhone 13&rdquo;.</li>
              <li>What is happening, in your own words, for example &ldquo;screen is cracked and touch stopped working&rdquo;.</li>
              <li>Not sure how to describe it? Pick screen, battery or button and answer a few quick questions instead.</li>
            </ul>
          </section>

          <section aria-labelledby="what-you-get" className="rounded-xl bg-white border border-neutral-200 p-6">
            <h2 id="what-you-get" className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
              <Gauge className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              What you get back
            </h2>
            <p className="mt-3 text-neutral-700">
              A suggested repair tier and next step, plus simple things you can try while you wait. It&apos;s a preliminary
              assessment, and a technician confirms the diagnosis and price.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {TIERS.map((tier) => (
                <li key={tier.name} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-neutral-900">{tier.name}</h3>
                    <VoiceNarrator text={`${tier.name}: ${tier.covers} ${tier.outcome}`} className="shrink-0" />
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{tier.covers}</p>
                  <p className="mt-2 text-sm font-medium text-emerald-800">{tier.outcome}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="about-pricing" className="rounded-xl bg-white border border-neutral-200 p-6">
            <h2 id="about-pricing" className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
              <Receipt className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              About estimates
            </h2>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-neutral-700">
              <li>Any price we give for a Tier 1 or Tier 2 repair is an estimate and does not include sales tax.</li>
              <li>For mobile, on-site service, a $25 trip fee is added as a separate line.</li>
            </ul>
            <p className="mt-4 flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Logic board, liquid damage, no-power, data recovery and unclear cases never get an automated price. They go
                to Ryan, who reviews the details and gets back to you.
              </span>
            </p>
          </section>

          <section aria-labelledby="need-parts" className="rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-6 shadow-md border border-neutral-700/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                  <Package className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Wholesale &amp; DIY Parts</span>
                </div>
                <h2 id="need-parts" className="text-xl font-bold tracking-tight text-white">
                  Need OEM or Premium Replacement Parts?
                </h2>
                <p className="text-sm text-neutral-300 max-w-xl">
                  Technicians, independent repair shops, and DIY customers can source verified displays, batteries, and charging ports through our direct wholesale portal with live inventory and trade discounts.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
                >
                  Parts Catalog
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/wholesale"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 transition"
                >
                  <Wrench className="w-4 h-4" />
                  Owner Wholesale Portal
                </Link>
              </div>
            </div>
          </section>

          <section aria-labelledby="talk-to-us" className="rounded-xl bg-white border border-neutral-200 p-6">
            <h2 id="talk-to-us" className="text-xl font-semibold text-neutral-900">Rather talk to a person?</h2>
            <ul className="mt-3 space-y-2 text-neutral-700">
              <li>
                <a href={BUSINESS_INFO.phoneHref} className="inline-flex items-center gap-2 font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline">
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  {BUSINESS_INFO.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${BUSINESS_INFO.email}`} className="inline-flex items-center gap-2 font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  {BUSINESS_INFO.email}
                </a>
              </li>
            </ul>
          </section>

          <div className="text-center">
            <a
              href={TRIAGE_URL}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Start your diagnosis
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
