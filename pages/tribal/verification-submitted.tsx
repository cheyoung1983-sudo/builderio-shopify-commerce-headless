import React from 'react'
import Head from 'next/head'
import Link from 'next/link'

/**
 * Return page after the hosted Stripe Identity flow. It is informational only:
 * arriving here proves nothing (the URL is not trusted). Only the signed Stripe
 * webhook plus a human Approve in Slack changes anyone's status, so this page
 * never says "verified".
 */
export default function TribalVerificationSubmittedPage() {
  return (
    <>
      <Head>
        <title>Verification submitted | DisplayCellPros</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="min-h-screen bg-neutral-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900">Submitted for review</h1>
          <p className="mt-4 text-neutral-700">
            Thanks. Your tribal verification was submitted for review and we&apos;ll email you once a team member has looked at it.
            No discount or tax exemption has been applied yet.
          </p>
          <p className="mt-3 text-sm text-neutral-600">
            If you closed the Stripe window before finishing, you can start again later, or contact Display &amp; Cell Pros for manual review.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
            Back to the store
          </Link>
        </div>
      </main>
    </>
  )
}
