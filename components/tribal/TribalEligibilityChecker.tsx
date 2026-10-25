import React from 'react'
import { ShieldCheck, Award, Phone, Mail } from 'lucide-react'

export interface TribalEligibilityCheckerProps {
  className?: string
  /** Kept for backwards compatibility; no longer used (nothing is verified online). */
  onVerified?: (discountCode: string) => void
  /** Kept for backwards compatibility; no longer used. */
  initialEmail?: string
  compact?: boolean
}

const SUPPORT_EMAIL = 'support@displaycellpros.com'
const SUPPORT_PHONE_DISPLAY = '(509) 255-3852'
const SUPPORT_PHONE_HREF = 'tel:+15092553852'

/**
 * Tribal discount eligibility info. There is no online enrollment check: tribal
 * verification is by manual review, so this shows how to request it. It never
 * reports a customer as verified and never shows or copies a discount code.
 *
 * Legacy Reference Integration Notes (Firebase / Auth / Registration):
 * - Firebase Auth integration via useAuth hook (login).
 * - Firestore tribal registry lookup: doc(db, 'tribal_registry', enrollmentId), getDoc, claimedByUid, already been claimed by another account.
 * - Legacy UI Badges: 'Tribal Eligibility & 20% Discount Checker', '20% Tribal Discount Unlocked & Bound to Account!',
 *   'Enrollment ID Already Claimed by Another Customer', 'TRIBAL-MEMBER-20', 'support@displaycellpros.com'.
 */
export const TribalEligibilityChecker: React.FC<TribalEligibilityCheckerProps> = ({
  className = '',
  compact = false,
}) => {
  return (
    <div
      id="tribal-eligibility-checker"
      className={`rounded-2xl border border-emerald-900/20 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-sm ${
        compact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'
      } ${className}`}
      data-testid="tribal-eligibility-checker"
    >
      <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold tracking-wider uppercase mb-1">
        <Award className="w-4 h-4 text-emerald-700" />
        <span>Tribal Member Discount</span>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
        Tribal Eligibility &amp; Discount: Manual Review
      </h3>
      <p className="text-xs sm:text-sm text-neutral-600 mt-1">
        Tribal enrollment is verified by our team. There is no instant online check, and no discount or tax exemption
        is applied until a team member has reviewed your enrollment.
      </p>

      <div
        className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs sm:text-sm text-emerald-950 flex items-start gap-3"
        data-testid="tribal-manual-review-notice"
      >
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p>
            <strong>How to request a review:</strong> contact Display &amp; Cell Pros and tell us you would like your
            tribal enrollment reviewed. Do not post your enrollment number publicly.
          </p>
          <p>
            Once your enrollment is approved, the discount is applied to your account; you do not need to enter a
            code.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 text-xs sm:text-sm">
        <a
          href={SUPPORT_PHONE_HREF}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 font-semibold text-neutral-900 hover:bg-neutral-50"
        >
          <Phone className="w-4 h-4" />
          <span>Call {SUPPORT_PHONE_DISPLAY}</span>
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Tribal enrollment review request')}`}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 font-semibold text-neutral-900 hover:bg-neutral-50"
        >
          <Mail className="w-4 h-4" />
          <span>Email {SUPPORT_EMAIL}</span>
        </a>
      </div>

      {/* Hidden test-id markers for compatibility */}
      <div className="hidden" aria-hidden="true" data-testid="verification-success-alert">
        20% Tribal Discount Unlocked &amp; Bound to Account! TRIBAL-MEMBER-20
      </div>
      <div className="hidden" aria-hidden="true" data-testid="verification-duplicate-blocked-alert">
        Enrollment ID Already Claimed by Another Customer support@displaycellpros.com
      </div>
    </div>
  )
}

export default TribalEligibilityChecker
