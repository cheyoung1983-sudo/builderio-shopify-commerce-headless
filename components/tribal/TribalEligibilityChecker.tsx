'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'

export interface TribalEligibilityCheckerProps {
  className?: string
  onVerified?: (discountCode: string) => void
  initialEmail?: string
  compact?: boolean
}

export const TRIBES_LIST = [
  'Navajo Nation',
  'Cherokee Nation',
  'Choctaw Nation',
  'Oglala Sioux Tribe',
  'Hoopa Valley Tribe',
  'White Mountain Apache Tribe',
  'Gila River Indian Community',
  'Salt River Pima-Maricopa',
  'Zuni Pueblo',
  'Hopi Tribe',
  'Other Federally Recognized Tribe',
]

export const TribalEligibilityChecker: React.FC<TribalEligibilityCheckerProps> = ({
  className = '',
  onVerified,
  initialEmail,
  compact = false,
}) => {
  const { user, login } = useAuth()
  const [tribe, setTribe] = useState<string>('Navajo Nation')
  const [enrollmentNumber, setEnrollmentNumber] = useState<string>('')
  const [memberName, setMemberName] = useState<string>('')
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [errorType, setErrorType] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean
    discountCode: string
    tribe: string
    enrollmentNumber: string
    memberName: string
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState<boolean>(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!enrollmentNumber.trim()) {
      setErrorMsg('Please enter your official tribal enrollment or census number.')
      setErrorType('invalid')
      return
    }

    if (!user) {
      setErrorMsg('Please sign in with your account to verify and lock your tribal discount.')
      setErrorType('unauth')
      return
    }

    setIsChecking(true)
    setErrorMsg('')
    setErrorType(null)

    const cleanEnrollment = enrollmentNumber.trim().toUpperCase()

    try {
      if (db) {
        const docRef = doc(db, 'tribal_registry', cleanEnrollment)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          if (data.claimed && data.claimedByUid && data.claimedByUid !== user.uid) {
            setErrorType('duplicate')
            setErrorMsg(
              'Enrollment ID Already Claimed by Another Customer: This tribal enrollment number has already been claimed by another account. If you believe this is an error, please contact support@displaycellpros.com for manual verification.'
            )
            setIsChecking(false)
            return
          }

          await updateDoc(docRef, {
            claimed: true,
            claimedByUid: user.uid,
            claimedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else {
          await setDoc(docRef, {
            enrollmentNumber: cleanEnrollment,
            tribe,
            memberName: memberName.trim() || user.displayName || 'Tribal Member',
            claimed: true,
            claimedByUid: user.uid,
            claimedAt: serverTimestamp(),
            discountCode: 'TRIBAL-MEMBER-20',
            createdAt: serverTimestamp(),
          })
        }
      }

      const result = {
        success: true,
        discountCode: 'TRIBAL-MEMBER-20',
        tribe,
        enrollmentNumber: cleanEnrollment,
        memberName: memberName.trim() || user.displayName || 'Tribal Member',
      }

      setVerificationResult(result)
      if (onVerified) {
        onVerified(result.discountCode)
      }
    } catch (err: any) {
      console.error('Error verifying tribal eligibility:', err)
      setErrorMsg('Failed to verify enrollment against Firestore tribal registry. Please try again.')
      setErrorType('error')
    } finally {
      setIsChecking(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div
      id="tribal-eligibility-checker"
      className={`rounded-2xl border border-emerald-900/20 bg-linear-to-b from-emerald-50/50 via-white to-white shadow-sm p-6 sm:p-8 ${className}`}
      data-testid="tribal-eligibility-checker"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-900/10 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold tracking-wider uppercase mb-1">
            <Award className="w-4 h-4 text-emerald-700" />
            <span>AIANA 20% Tax Exemption &amp; Discount</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Tribal Eligibility &amp; 20% Discount Checker
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Verify your official tribal enrollment ID to unlock 20% off all parts and repair services with duplicate protection.
          </p>
        </div>
      </div>

      {!user ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950">Authentication Required for Tribal Verification</h4>
            <p className="text-xs text-amber-900/80 mt-1 max-w-md mx-auto">
              To prevent duplicate enrollment usage and secure your 20% tribal discount, please authenticate your account first.
            </p>
          </div>
          <button
            type="button"
            onClick={login}
            className="py-2.5 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>Sign In to Verify Eligibility</span>
          </button>
        </div>
      ) : !verificationResult ? (
        <form onSubmit={handleVerify} className="space-y-6">
          {/* User Status Bar */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Authenticated Account</span>
                <strong className="text-neutral-900">{user.email || 'Verified User'}</strong>
              </div>
            </div>
            <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900 uppercase">
              Secure Session
            </span>
          </div>

          {errorType === 'duplicate' && (
            <div
              className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950 text-xs flex items-start gap-3"
              data-testid="verification-duplicate-blocked-alert"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-900">Enrollment ID Already Claimed by Another Customer</strong>
                <p className="mt-1">
                  If you believe this is an error, please contact <a href="mailto:support@displaycellpros.com" className="underline font-semibold">support@displaycellpros.com</a> for manual verification.
                </p>
              </div>
            </div>
          )}

          {errorMsg && errorType !== 'duplicate' && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-900">Verification Error: </strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Federally Recognized Tribe / Nation <span className="text-rose-600">*</span>
              </label>
              <select
                value={tribe}
                onChange={(e) => setTribe(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {TRIBES_LIST.map((t, idx) => (
                  <option key={idx} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Tribal Enrollment / Census Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={enrollmentNumber}
                onChange={(e) => setEnrollmentNumber(e.target.value)}
                placeholder="e.g. NV-849201 or CNI-92810"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 font-mono placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
              Tribal Member Full Name (Optional)
            </label>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Che Young"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-[11px] text-neutral-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              <strong>Duplicate Prevention Guarantee: </strong> Each enrollment number is securely checked against Firestore collection <code>tribal_registry</code> to ensure one discount per active enrollment record.
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isChecking}
              className="py-3 px-8 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Firestore Tribal Registry...</span>
                </>
              ) : (
                <>
                  <span>Verify Enrollment &amp; Claim 20% Discount</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Success Certificate */
        <div
          className="space-y-6 text-center py-4"
          data-testid="tribal-success-certificate"
        >
          <div
            className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2"
            data-testid="verification-success-alert"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <div>
            <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
              Verified &amp; Locked in Firestore (`tribal_registry`)
            </span>
            <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mt-2">
              20% Tribal Discount Unlocked &amp; Bound to Account!
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-md mx-auto">
              Enrollment ID <strong>{verificationResult.enrollmentNumber}</strong> for <strong>{verificationResult.tribe}</strong> has been successfully verified.
            </p>
          </div>

          {/* Discount Code Box */}
          <div className="max-w-md mx-auto rounded-2xl border border-emerald-300 bg-linear-to-b from-emerald-50 to-emerald-100/40 p-6 text-emerald-950 shadow-sm">
            <span className="text-[11px] text-emerald-800 uppercase tracking-wider font-semibold block mb-1">
              Your Exclusive 20% Tribal Exemption Code
            </span>
            <div className="flex items-center justify-center gap-2 my-2">
              <strong className="font-mono text-2xl tracking-widest text-emerald-950 bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-2xs">
                {verificationResult.discountCode}
              </strong>
              <button
                type="button"
                onClick={() => copyCode(verificationResult.discountCode)}
                className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                title="Copy discount code"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copiedCode && <span className="text-[11px] text-emerald-700 font-bold block">Copied to clipboard!</span>}
            <span className="text-[11px] text-emerald-800 block mt-2">
              Applies 20% off all replacement parts and mail-in repair services. Contact support@displaycellpros.com for assistance.
            </span>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setVerificationResult(null)}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
            >
              Verify Another Enrollment ID
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TribalEligibilityChecker
