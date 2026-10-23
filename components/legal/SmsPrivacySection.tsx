import React from 'react'
import Link from 'next/link'
import { BUSINESS_INFO } from '@lib/business-info'

/**
 * Text-messaging privacy terms required for Twilio A2P 10DLC campaign
 * approval. Rendered on /policies/privacy-policy in addition to the policy
 * text managed in Shopify, so it is always present even if that text changes.
 */
export function SmsPrivacySection() {
  return (
    <section
      id="sms-privacy"
      aria-labelledby="sms-privacy-heading"
      className="mt-10 rounded-2xl border border-border-subtle bg-white p-6 text-sm sm:text-base leading-relaxed text-neutral-700 space-y-4"
    >
      <h2 id="sms-privacy-heading" className="text-xl font-semibold text-neutral-900">
        Text messaging (SMS) privacy
      </h2>
      <p>
        <strong>
          We do not share, sell, rent or trade your mobile phone number or your SMS opt-in data and consent with
          third parties or affiliates for their marketing or promotional purposes.
        </strong>{' '}
        Text messaging originator opt-in data and consent are never shared with any third party, except with the
        service providers that deliver our messages on our behalf (for example, our SMS delivery provider), and
        only to send those messages.
      </p>
      <h3 className="text-lg font-semibold text-neutral-900">What we collect</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Your mobile phone number, when you give it to us on our repair intake form, by phone or in person.</li>
        <li>Whether you agreed to receive texts from us, and the date and time you agreed or opted out.</li>
        <li>Details you share about your repair, such as your device model and what is wrong with it.</li>
        <li>Basic records of the messages we send you, such as delivery status.</li>
      </ul>
      <h3 className="text-lg font-semibold text-neutral-900">How we use it</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>To text you your booking link and updates on the status of your repair, only if you opted in.</li>
        <li>To answer you when you reply HELP, and to honor STOP requests.</li>
        <li>To keep a record of your consent, as required by phone carriers.</li>
      </ul>
      <p>
        You can opt out at any time by replying <strong>STOP</strong>. Reply <strong>HELP</strong> for help, or call{' '}
        <a className="font-semibold text-neutral-900 underline" href={BUSINESS_INFO.phoneHref}>
          {BUSINESS_INFO.phoneDisplay}
        </a>
        . See our{' '}
        <Link href="/sms-terms" className="font-semibold text-neutral-900 underline">
          SMS Terms
        </Link>{' '}
        for full program details.
      </p>
    </section>
  )
}

/** Fallback general privacy policy shown only when the Shopify privacy policy is empty. */
export function FallbackPrivacyPolicy() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-white p-6 text-sm sm:text-base leading-relaxed text-neutral-700 space-y-4">
      <p>
        This policy explains what information {BUSINESS_INFO.legalName} (&quot;{BUSINESS_INFO.name}&quot;, &quot;we&quot;)
        collects through displaycellpros.com, triage.displaycellpros.com, by phone and by text, and how we use it.
      </p>
      <h2 className="text-xl font-semibold text-neutral-900">Information we collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Contact details you give us, such as your name, phone number and email address.</li>
        <li>Repair details, such as your device model and the problem you describe.</li>
        <li>Order details when you buy from our store (processed by Shopify and its payment providers).</li>
        <li>Basic technical and usage data, such as pages visited, collected through cookies and analytics.</li>
      </ul>
      <h2 className="text-xl font-semibold text-neutral-900">How we use it</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>To diagnose, quote, schedule and complete your repair, and to fulfill orders.</li>
        <li>To contact you about your repair or order, including by text if you opted in.</li>
        <li>To run, secure and improve our website.</li>
      </ul>
      <p>
        We do not sell your personal information. We share it only with service providers that help us run our
        business (such as hosting, payments and message delivery) and only as needed for those services, or when
        required by law.
      </p>
      <p>
        Questions or requests about your data: email{' '}
        <a className="font-semibold text-neutral-900 underline" href={`mailto:${BUSINESS_INFO.email}`}>
          {BUSINESS_INFO.email}
        </a>{' '}
        or call{' '}
        <a className="font-semibold text-neutral-900 underline" href={BUSINESS_INFO.phoneHref}>
          {BUSINESS_INFO.phoneDisplay}
        </a>
        .
      </p>
    </div>
  )
}
