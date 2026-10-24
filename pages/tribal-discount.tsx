import React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { Award, LifeBuoy, Lock, ShieldCheck } from 'lucide-react'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { TribalHowItWorks } from '../components/tribal/TribalHowItWorks'
import { TribalVerifyCta } from '../components/tribal/TribalVerifyCta'
import { getSignedInCustomer } from '../lib/shopify/customer-account/session'
import { getTribalVerificationMode } from '../lib/tribal/verification-mode'
import {
  getTribalPrivacyPoints,
  TRIBAL_DISCOUNT_LINE,
  TRIBAL_ELIGIBILITY_LINE,
  TRIBAL_PRIVACY_HEADING,
  TRIBAL_SIGN_IN_HREF,
  TRIBAL_SUPPORT,
  TRIBAL_TAX_LINK,
  TRIBAL_TAX_NOTE,
  TRIBAL_TROUBLE_HEADING,
  TRIBAL_TROUBLE_TEXT,
  type TribalVerificationMode,
} from '../lib/tribal/verification-copy'

interface TribalDiscountPageProps {
  mode: TribalVerificationMode
  signedIn: boolean
  customerEmail: string
}

export const getServerSideProps: GetServerSideProps<TribalDiscountPageProps> = async ({ req, res }) => {
  // Only the mode, a signed-in flag and the customer's own email reach the client.
  const mode = getTribalVerificationMode()
  const customer = await getSignedInCustomer(req, res)
  return {
    props: {
      mode,
      signedIn: Boolean(customer),
      customerEmail: customer?.emailAddress?.emailAddress || '',
    },
  }
}

export default function TribalDiscountPage({ mode, signedIn, customerEmail }: TribalDiscountPageProps) {
  const privacyPoints = getTribalPrivacyPoints(mode)

  return (
    <>
      <Head>
        <title>Tribal Member 20% Discount | How Verification Works | DisplayCellPros</title>
        <meta
          name="description"
          content="A fixed 20% discount for enrolled members of any USA federally recognized tribe. See how verification works, what we collect, and how to start."
        />
        <meta property="og:title" content="Tribal Member 20% Discount | DisplayCellPros" />
        <meta
          property="og:description"
          content="A fixed 20% discount for enrolled members of any USA federally recognized tribe. See how verification works."
        />
      </Head>

      <div className="min-h-screen bg-neutral-50/70 pb-24">
        <div className="bg-white border-b border-neutral-200/80 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Tribal Member Discount', isCurrent: true },
              ]}
            />
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-12">
          <header className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800">
              <Award aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Tribal Member Discount</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900">
              20% off for tribal members
            </h1>
            <p className="text-base text-neutral-800 font-medium">{TRIBAL_ELIGIBILITY_LINE}</p>
            <p className="text-sm sm:text-base text-neutral-700 max-w-2xl">{TRIBAL_DISCOUNT_LINE}</p>
            <p className="text-sm">
              <a href="#verify" className="font-semibold text-emerald-800 underline hover:text-emerald-950">
                Jump to verification
              </a>
            </p>
          </header>

          <div id="how-it-works" className="scroll-mt-24 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs">
            <TribalHowItWorks mode={mode} variant="full" idPrefix="tribal-page-how" />
          </div>

          <section id="verify" aria-labelledby="tribal-verify-heading" className="scroll-mt-24 rounded-2xl border border-emerald-900/20 bg-white p-6 sm:p-8 shadow-xs">
            <h2 id="tribal-verify-heading" className="text-2xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-6 w-6 text-emerald-700" />
              <span>{mode === 'manual' ? 'Request a review' : 'Start verification'}</span>
            </h2>

            {mode === 'manual' ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-neutral-700">
                  You don&apos;t need to sign in. Contact us and tell us you would like your tribal enrollment reviewed.
                </p>
                <TribalVerifyCta mode={mode} />
              </div>
            ) : signedIn ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-neutral-700">
                  You&apos;re signed in{customerEmail ? ` as ${customerEmail}` : ''}. You&apos;ll see the full notice and be asked for your consent
                  before anything is sent.
                </p>
                <TribalVerifyCta mode={mode} customerEmail={customerEmail} />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-neutral-700">Sign in to your account to start. We bring you back to this spot afterwards.</p>
                { }
                <a
                  href={TRIBAL_SIGN_IN_HREF}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900"
                >
                  <Lock aria-hidden="true" className="h-4 w-4" />
                  <span>Sign in to start</span>
                </a>
              </div>
            )}
          </section>

          <section aria-labelledby="tribal-privacy-heading" className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 id="tribal-privacy-heading" className="text-xl font-bold text-neutral-900">
              {TRIBAL_PRIVACY_HEADING}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
              {privacyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="tribal-trouble-heading"
            className="rounded-2xl border border-amber-300 bg-amber-50/60 p-6 sm:p-8"
            data-testid="tribal-trouble-box"
          >
            <h2 id="tribal-trouble-heading" className="text-xl font-bold text-amber-950 flex items-center gap-2">
              <LifeBuoy aria-hidden="true" className="h-5 w-5" />
              <span>{TRIBAL_TROUBLE_HEADING}</span>
            </h2>
            <p className="mt-2 text-sm text-amber-950">{TRIBAL_TROUBLE_TEXT}</p>
            <p className="mt-3 text-sm text-amber-950">
              Call{' '}
              <a href={TRIBAL_SUPPORT.phoneHref} className="font-semibold underline">
                {TRIBAL_SUPPORT.phoneDisplay}
              </a>{' '}
              or email{' '}
              <a href={TRIBAL_SUPPORT.emailHref} className="font-semibold underline">
                {TRIBAL_SUPPORT.email}
              </a>
              .
            </p>
          </section>

          <section aria-labelledby="tribal-tax-heading" className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 id="tribal-tax-heading" className="text-xl font-bold text-neutral-900">
              Tax exemption is separate
            </h2>
            <p className="mt-2 text-sm text-neutral-700">{TRIBAL_TAX_NOTE}</p>
            <p className="mt-3 text-sm">
              <Link href={TRIBAL_TAX_LINK.href} className="font-semibold text-emerald-800 underline hover:text-emerald-950">
                {TRIBAL_TAX_LINK.label}
              </Link>
            </p>
          </section>
        </main>
      </div>
    </>
  )
}
