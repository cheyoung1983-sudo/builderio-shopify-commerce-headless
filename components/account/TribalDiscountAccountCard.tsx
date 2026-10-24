import React from 'react'
import { Award, AlertCircle } from 'lucide-react'

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
}

/**
 * Account-page tribal discount status. Verification is by manual review, and this
 * card cannot see a customer's verification status, so it never shows a
 * "verified" badge or a discount code.
 */
export const TribalDiscountAccountCard: React.FC<TribalDiscountAccountCardProps> = ({ customerEmail }) => {
  return (
    <div
      className="rounded-2xl border border-emerald-900/20 bg-linear-to-b from-emerald-50/60 via-white to-white p-6 sm:p-8 shadow-xs"
      data-testid="tribal-discount-account-card"
    >
      <div className="flex items-center justify-between border-b border-emerald-900/10 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Tribal Member Discount</h3>
            <p className="text-xs text-neutral-600">Account: {customerEmail || 'Authenticated Member'}</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 inline-flex items-center gap-1.5 border border-amber-300">
          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
          <span>Manual review</span>
        </span>
      </div>
      <p className="text-xs sm:text-sm text-neutral-600">
        Tribal enrollment is verified by our team, not online. If you would like your enrollment reviewed, use the
        contact options below. Once approved, the discount is applied to your account automatically.
      </p>
    </div>
  )
}

export default TribalDiscountAccountCard
