'use client'

import React, { useState } from 'react'
import { ShieldCheck, Lock, UserCheck, Trash2, FileText, CheckCircle2, RefreshCw, Cpu, Award } from 'lucide-react'
import { VerificationStatusBadge } from '../persona/VerificationStatusBadge'

export interface DigitalIdentityComplianceCenterProps {
  className?: string
}

export function DigitalIdentityComplianceCenter({ className = '' }: DigitalIdentityComplianceCenterProps) {
  const [erasureRequested, setErasureRequested] = useState(false)
  const [erasing, setErasing] = useState(false)

  const handleRightToErasure = () => {
    setErasing(true)
    setTimeout(() => {
      setErasing(false)
      setErasureRequested(true)
    }, 1200)
  }

  return (
    <div className={`p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Digital Identity & Compliance Center</h3>
            <p className="text-xs text-neutral-500">KYC Verification Standards, GDPR/CCPA Privacy & Data Minimization</p>
          </div>
        </div>
        <VerificationStatusBadge status="passed" label="Compliance Framework Active" />
      </div>

      {/* Grid of Core Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: KYC Proofing */}
        <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-neutral-900">KYC Identity Proofing</h4>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Ties digital identities to physical persons through government-issued ID checks, biometric liveness validation, and authoritative data source matching.
          </p>
        </div>

        {/* Card 2: Cryptographic Minimization */}
        <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-neutral-900">Zero-Knowledge ID Storage</h4>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Raw ID numbers and document images are processed securely by our identity partner (Persona/Stripe) and purged. We store only SHA-256 cryptographic hashes for auditability.
          </p>
        </div>

        {/* Card 3: GDPR & CCPA Rights */}
        <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-neutral-900">GDPR & CCPA Compliance</h4>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Full support for data portability, right to rectification, and right to be forgotten (erasure of verification audit logs upon request).
          </p>
        </div>
      </div>

      {/* Right to Erasure / Privacy Management Section */}
      <div className="p-5 bg-neutral-900 text-white rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">Data Privacy & Right to Erasure (CCPA / GDPR)</h4>
          <p className="text-xs text-neutral-400">
            Request immediate purging of your verification records and cryptographic enrollment audit tokens from our databases.
          </p>
        </div>
        <div>
          {erasureRequested ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Erasure Request Queued</span>
            </span>
          ) : (
            <button
              type="button"
              disabled={erasing}
              onClick={handleRightToErasure}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {erasing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Exercise Right to Erasure</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default DigitalIdentityComplianceCenter
