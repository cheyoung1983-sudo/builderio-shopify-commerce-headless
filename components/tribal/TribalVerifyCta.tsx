'use client'

import React, { useCallback, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Mail, Phone, ShieldCheck } from 'lucide-react'
import {
  getTribalCtaLabel,
  TRIBAL_SUPPORT,
  type TribalVerificationMode,
} from '../../lib/tribal/verification-copy'

// The modal is heavy (signature pad, QR scanner, geofence logic) and only needed
// after the customer asks to start, so it is loaded on demand. Owned by the
// Stripe Identity PR; used here exactly as it exports.
const TribalVerificationModal = dynamic(
  () => import('./TribalVerificationModal').then((m) => m.TribalVerificationModal),
  { ssr: false }
)

export interface TribalVerifyCtaProps {
  mode: TribalVerificationMode
  customerEmail?: string
  className?: string
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700'

/**
 * Call-to-action for the verification flow. In manual mode there is no online
 * form, so it shows Call and Email buttons. Otherwise it opens the verification
 * modal. Render this only for signed-in customers (the verify API needs the
 * customer's account); the pages show a sign-in button to everyone else.
 */
export function TribalVerifyCta({ mode, customerEmail = '', className = '' }: TribalVerifyCtaProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    // Return focus to the control that opened the dialog.
    requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  if (mode === 'manual') {
    return (
      <div className={`flex flex-col sm:flex-row gap-3 ${className}`} data-testid="tribal-verify-cta" data-mode={mode}>
        <a
          href={TRIBAL_SUPPORT.phoneHref}
          className={`${buttonBase} border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50`}
        >
          <Phone aria-hidden="true" className="h-4 w-4" />
          <span>Call {TRIBAL_SUPPORT.phoneDisplay}</span>
        </a>
        <a
          href={TRIBAL_SUPPORT.emailHref}
          className={`${buttonBase} border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50`}
        >
          <Mail aria-hidden="true" className="h-4 w-4" />
          <span>Email {TRIBAL_SUPPORT.email}</span>
        </a>
      </div>
    )
  }

  return (
    <div className={className} data-testid="tribal-verify-cta" data-mode={mode}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`${buttonBase} bg-emerald-700 text-white hover:bg-emerald-800`}
      >
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        <span>{getTribalCtaLabel(mode)}</span>
      </button>
      {open && <TribalVerificationModal isOpen={open} onClose={close} customerEmail={customerEmail} />}
    </div>
  )
}

export default TribalVerifyCta
