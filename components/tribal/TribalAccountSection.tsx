'use client'

import React, { useState } from 'react'
import { ShieldCheck, Tag, MapPin, FileCheck, ExternalLink, RefreshCw } from 'lucide-react'
import { TribalVerificationModal } from './TribalVerificationModal'

interface TribalAccountSectionProps {
  customerId?: string
  customerEmail?: string
  initialVerified?: boolean
  initialTribalNation?: string
  initialEnrollmentIdMasked?: string
  initialTaxExempt?: boolean
  initialCertRef?: string
}

export function TribalAccountSection({
  customerId = 'guest',
  customerEmail = '',
  initialVerified = false,
  initialTribalNation = '',
  initialEnrollmentIdMasked = '',
  initialTaxExempt = false,
  initialCertRef = '',
}: TribalAccountSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [status, setStatus] = useState({
    isVerified: initialVerified,
    tribalNation: initialTribalNation,
    maskedEnrollmentId: initialEnrollmentIdMasked,
    taxExempt: initialTaxExempt,
    certRef: initialCertRef,
  })

  const handleVerified = (result: any) => {
    setStatus({
      isVerified: true,
      tribalNation: result.audit.tribalNation,
      maskedEnrollmentId: result.audit.maskedEnrollmentId,
      taxExempt: result.taxExemptionTrack.taxExempt,
      certRef: result.audit.certificateRef || '',
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Tribal Member Benefits & Tax Exemption
            </h3>
            <p className="text-xs text-slate-500">
              Enrolled member identity verification, commercial 20% discount, and on-reservation statutory tax exemptions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors self-start sm:self-auto"
        >
          {status.isVerified ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Update Verification / Certificate
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              Verify Tribal Enrollment
            </>
          )}
        </button>
      </div>

      {status.isVerified ? (
        <div className="space-y-3">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
                Verified Enrolled Member
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-1">
                {status.tribalNation || 'Federally Recognized Tribal Nation'}
              </h4>
              <p className="text-xs text-slate-600">
                Enrollment ID: <span className="font-mono">{status.maskedEnrollmentId || '••••Verified'}</span>
              </p>
            </div>
            {status.certRef && (
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                Cert: {status.certRef}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Track 1: 20% Commercial Discount
              </div>
              <p className="text-xs text-slate-600">
                Automatically applied to all orders for tag <code className="text-[11px] bg-slate-200 px-1 py-0.5 rounded font-mono">tribal-member-verified</code>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Track 2: On-Reservation Sales Tax
              </div>
              <p className="text-xs text-slate-600">
                {status.taxExempt
                  ? 'On-reservation statutory exemption active via AvaTax (Entity Use Code C).'
                  : 'Active for qualifying on-reservation deliveries with signed state certificate.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Are you an enrolled member of a federally recognized Native American or Alaskan Native tribe? Verify your enrollment to unlock your 20% member discount and on-reservation sales tax exemptions.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
          >
            Start Verification Process &rarr;
          </button>
        </div>
      )}

      {/* Verification Modal */}
      <TribalVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVerified={handleVerified}
        customerId={customerId}
        customerEmail={customerEmail}
      />
    </div>
  )
}
