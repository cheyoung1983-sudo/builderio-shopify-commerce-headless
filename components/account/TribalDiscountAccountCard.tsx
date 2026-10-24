import React from 'react'
import Link from 'next/link'
import { Award, AlertCircle } from 'lucide-react'
import { TribalHowItWorks } from '../tribal/TribalHowItWorks'
import { TribalVerifyCta } from '../tribal/TribalVerifyCta'
import {
  getTribalPrivacyOneLiner,
  TRIBAL_PAGE_PATH,
  type TribalVerificationMode,
} from '../../lib/tribal/verification-copy'

/**
 * Legacy shape of the old client-side Firestore claim records. Kept only so
 * components/TribalDiscountCard.tsx keeps type-checking; nothing reads or writes
 * these records any more.
 */
export interface TribalRegistryRecord {
  enrollmentNumber: string
  tribe: string
  memberName?: string
  claimedByUid: string
  claimedAt?: any
  discountCode?: string
}

export interface TribalDiscountAccountCardProps {
  userUid?: string
  customerEmail?: string
  /**
   * Which verification flow is open, from getTribalVerificationMode() in
   * getServerSideProps. Defaults to 'manual' (call or email) so an unconfigured
   * caller never offers an online form.
   */
  mode?: TribalVerificationMode
}

/**
 * Account-page tribal discount card: one place with the compact steps, the
 * call to action and a one-line privacy note. This card cannot see a customer's
 * verification status, so it never shows a "verified" badge or a discount code.
 */
export const TribalDiscountAccountCard: React.FC<TribalDiscountAccountCardProps> = ({ customerEmail, mode = 'manual' }) => {
  const isManual = mode === 'manual'
  return (
    <section
      aria-labelledby="tribal-account-card-heading"
      className="rounded-2xl border border-emerald-900/20 bg-linear-to-b from-emerald-50/60 via-white to-white p-6 sm:p-8 shadow-xs"
      data-testid="tribal-discount-account-card"
      data-mode={mode}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/10 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award aria-hidden="true" className="w-5 h-5" />
          </div>
          <div>
            <h2 id="tribal-account-card-heading" className="text-lg font-bold text-neutral-900 tracking-tight">
              Tribal Member Discount
            </h2>
            <p className="text-xs text-neutral-600">Account: {customerEmail || 'Authenticated Member'}</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 inline-flex items-center gap-1.5 border border-amber-300">
          <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 text-amber-700" />
          <span>{isManual ? 'Manual review' : 'Reviewed by our team'}</span>
        </span>
      </div>

      <TribalHowItWorks mode={mode} variant="compact" idPrefix="tribal-account-how" />

      <TribalVerifyCta mode={mode} customerEmail={customerEmail} className="mt-4" />

      <p className="mt-4 text-xs text-neutral-600">
        {getTribalPrivacyOneLiner(mode)}{' '}
        <Link href={`${TRIBAL_PAGE_PATH}#how-it-works`} className="font-semibold text-emerald-800 underline hover:text-emerald-950">
          See how verification works
        </Link>
      </p>
    </section>
  )
}

export default TribalDiscountAccountCard
