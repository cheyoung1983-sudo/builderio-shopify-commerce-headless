import React from 'react'
import Link from 'next/link'
import type { GetStaticProps } from 'next'
import { DynamicSEO } from '@components/common/DynamicSEO'
import { Breadcrumbs } from '@components/common/Breadcrumbs'
import { getLayoutProps } from '@lib/get-layout-props'
import { getBaseUrl } from '@lib/seo'
import { BUSINESS_INFO } from '@lib/business-info'

/** SMS program terms required for Twilio A2P 10DLC campaign approval. */
export const SMS_PROGRAM_NAME = 'Display & Cell Pros repair updates'

export const getStaticProps: GetStaticProps = async () => ({
  props: { ...(await getLayoutProps()) },
  revalidate: 3600,
})

export default function SmsTermsPage() {
  const title = 'SMS Terms'
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: title, isCurrent: true },
  ]
  return (
    <>
      <DynamicSEO
        title={`${title} | DisplayCellPros`}
        description={`Text message terms for the ${SMS_PROGRAM_NAME} program from ${BUSINESS_INFO.name}.`}
        canonical={`${getBaseUrl()}/sms-terms`}
        breadcrumbs={breadcrumbItems}
      />
      <div className="min-h-screen bg-canvas py-4 sm:py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs id="sms-terms-breadcrumbs" items={breadcrumbItems} />
          <article id="sms-terms" className="mt-6 mb-16">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 mb-6">SMS Terms</h1>
            <div className="rounded-2xl border border-border-subtle bg-white p-6 text-sm sm:text-base leading-relaxed text-neutral-700 space-y-4">
              <p>
                <strong>Program name:</strong> {SMS_PROGRAM_NAME}
              </p>
              <p>
                <strong>What we send:</strong> When you opt in (for example, by checking the text-message box on our
                repair intake form), {BUSINESS_INFO.legalName} will text you your booking link and status updates
                about your repair. We do not send marketing messages through this program.
              </p>
              <p>
                <strong>Opting in is optional.</strong> You do not have to agree to receive texts to get a diagnosis
                or a repair.
              </p>
              <p>Message frequency varies.</p>
              <p>Msg &amp; data rates may apply.</p>
              <p className="font-bold text-neutral-900">Reply STOP to opt out, HELP for help.</p>
              <p>
                After you reply STOP, we will send one message confirming you are unsubscribed and no further texts.
                You can reply START to opt back in.
              </p>
              <p>
                <strong>Support:</strong> call{' '}
                <a className="font-semibold text-neutral-900 underline" href={BUSINESS_INFO.phoneHref}>
                  {BUSINESS_INFO.phoneDisplay}
                </a>{' '}
                or email{' '}
                <a className="font-semibold text-neutral-900 underline" href={`mailto:${BUSINESS_INFO.email}`}>
                  {BUSINESS_INFO.email}
                </a>
                .
              </p>
              <p>Carriers are not liable for delayed or undelivered messages.</p>
              <p>
                <strong>Privacy:</strong> We never share or sell your mobile number or SMS opt-in data to third
                parties for marketing. See our{' '}
                <Link href="/policies/privacy-policy" className="font-semibold text-neutral-900 underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </article>
        </div>
      </div>
    </>
  )
}
