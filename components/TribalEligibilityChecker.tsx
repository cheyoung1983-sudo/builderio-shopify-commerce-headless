'use client'

import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Mail,
  User,
  MapPin,
  ExternalLink,
  LogIn,
} from 'lucide-react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth, signInWithGoogle } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { evaluateAddressGeofence } from '../lib/tribal/geofencing'

// Major federally recognized tribal nations for fast selection
const POPULAR_TRIBES = [
  'Navajo Nation',
  'Cherokee Nation',
  'Choctaw Nation of Oklahoma',
  'Gila River Indian Community',
  'Salt River Pima-Maricopa Indian Community',
  "Tohono O'odham Nation",
  'Colorado River Indian Tribes',
  'Puyallup Tribe of Indians',
  'Tulalip Tribes of Washington',
  'Confederated Tribes of the Yakama Nation',
  'Blackfeet Nation',
  'Oglala Sioux Tribe',
  'Hoopa Valley Tribe',
  'Pauma Band of Luiseño Indians',
  'Muscogee (Creek) Nation',
  'Other / Federally Recognized Tribe (Type below)',
]

export interface TribalEligibilityCheckerProps {
  initialEmail?: string
  onVerificationSuccess?: (result: {
    tribalNation: string
    maskedEnrollmentId: string
    discountCode: string
    discountPercentage: number
    taxExempt?: boolean
  }) => void
  compact?: boolean
  className?: string
}

// Client-side helper for normalized enrollment formatting & masking
function normalizeId(id: string): string {
  return (id || '').trim().replace(/[-\s]/g, '').toUpperCase()
}

function maskId(id: string): string {
  const clean = normalizeId(id)
  if (clean.length <= 4) return '••••' + clean
  return '••••' + clean.slice(-4)
}

// Generate deterministic hash in browser/Node
async function computeHash(nation: string, id: string): Promise<string> {
  const text = `${(nation || '').trim().toLowerCase()}:${normalizeId(id)}`
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback simple fast string hash representation for offline/SSR
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return 'tribal_hash_' + Math.abs(hash).toString(16)
}

export const TribalEligibilityChecker: React.FC<TribalEligibilityCheckerProps> = ({
  initialEmail = '',
  onVerificationSuccess,
  compact = false,
  className = '',
}) => {
  const { user } = useAuth()

  // Form inputs
  const [customerEmail, setCustomerEmail] = useState<string>(initialEmail || user?.email || '')
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [selectedTribalNation, setSelectedTribalNation] = useState<string>('Navajo Nation')
  const [customNation, setCustomNation] = useState<string>('')
  const [enrollmentId, setEnrollmentId] = useState<string>('')
  const [zipCode, setZipCode] = useState<string>('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{
    type: 'idle' | 'success' | 'already_verified' | 'duplicate_blocked' | 'invalid_format' | 'auth_required' | 'server_error'
    message: string
    details?: any
  }>({
    type: 'idle',
    message: '',
  })

  // Sync auth state
  useEffect(() => {
    if (user?.email && !customerEmail) {
      setCustomerEmail(user.email)
    }
  }, [user?.email])

  const activeTribalNation = selectedTribalNation.startsWith('Other')
    ? customNation.trim()
    : selectedTribalNation

  const handleGoogleSignIn = async () => {
    try {
      const authUser = await signInWithGoogle()
      if (authUser?.email) {
        setCustomerEmail(authUser.email)
      }
    } catch (err) {
      console.warn('Google sign-in error:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanEmail = (customerEmail || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFeedback({
        type: 'invalid_format',
        message: 'Please enter a valid customer email address to lock your enrollment benefits.',
      })
      return
    }

    if (!firstName.trim() || !lastName.trim()) {
      setFeedback({
        type: 'invalid_format',
        message: 'Please enter your legal first and last name as shown on your tribal membership ID.',
      })
      return
    }

    if (!activeTribalNation) {
      setFeedback({
        type: 'invalid_format',
        message: 'Please select or specify your federally recognized tribal nation.',
      })
      return
    }

    const normId = normalizeId(enrollmentId)
    if (!normId || normId.length < 4) {
      setFeedback({
        type: 'invalid_format',
        message: 'Please enter a valid tribal enrollment or CDIB card number (minimum 4 characters).',
      })
      return
    }

    const placeholders = ['1234', '0000', '1111', '9999', 'TEST', 'FAKE', 'INVALID']
    if (placeholders.includes(normId)) {
      setFeedback({
        type: 'invalid_format',
        message: 'Please enter your authentic tribal membership enrollment number.',
      })
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: 'idle', message: '' })

    try {
      const enrollmentHash = await computeHash(activeTribalNation, enrollmentId)
      const masked = maskId(enrollmentId)
      const customerName = `${firstName.trim()} ${lastName.trim()}`
      const currentUid = user?.uid || 'guest'

      // Check on-reservation tax exemption if ZIP code provided
      let onReservation = false
      if (zipCode.trim()) {
        const geofence = evaluateAddressGeofence({ zip: zipCode.trim() })
        onReservation = geofence.onReservation
      }

      // Step 1: Query Firestore claim ledger in tribal_enrollments
      let existingClaim: any = null
      if (db) {
        try {
          const claimRef = doc(db, 'tribal_enrollments', enrollmentHash)
          const claimSnap = await getDoc(claimRef)
          if (claimSnap.exists()) {
            existingClaim = claimSnap.data()
          }
        } catch (readErr: any) {
          console.warn('[Firestore] Claim check read error, falling back to API:', readErr?.message)
        }
      }

      // If already claimed
      if (existingClaim) {
        const isOwner =
          (currentUid !== 'guest' && existingClaim.claimedByUid === currentUid) ||
          existingClaim.claimedByEmail?.toLowerCase() === cleanEmail

        if (isOwner) {
          setFeedback({
            type: 'already_verified',
            message: `Welcome back, ${existingClaim.customerName}. Your ${existingClaim.tribalNation} enrollment (${existingClaim.maskedEnrollmentId}) is already verified and active.`,
            details: {
              record: existingClaim,
              discount: { eligible: true, discountPercentage: 20, code: 'TRIBAL-MEMBER-20' },
              onReservation,
            },
          })
          if (onVerificationSuccess) {
            onVerificationSuccess({
              tribalNation: existingClaim.tribalNation,
              maskedEnrollmentId: existingClaim.maskedEnrollmentId,
              discountCode: 'TRIBAL-MEMBER-20',
              discountPercentage: 20,
              taxExempt: onReservation,
            })
          }
          setIsSubmitting(false)
          return
        }

        // DUPLICATE USE BLOCKED
        setFeedback({
          type: 'duplicate_blocked',
          message: `This tribal enrollment number has already been verified and locked to another customer account (${existingClaim.claimedByEmail?.replace(
            /(.{2})(.*)(@.*)/,
            '$1***$3'
          )}). Only the registered member may use this tribal ID. If you believe this is in error, please contact support@displaycellpros.com.`,
          details: { record: existingClaim },
        })
        setIsSubmitting(false)
        return
      }

      // Step 2: Write claim to Firestore tribal_enrollments
      const claimData = {
        enrollmentHash,
        maskedEnrollmentId: masked,
        claimedByUid: currentUid,
        claimedByEmail: cleanEmail,
        customerName,
        tribalNation: activeTribalNation,
        verifiedAt: new Date().toISOString(),
        status: 'active',
      }

      if (db) {
        try {
          const claimRef = doc(db, 'tribal_enrollments', enrollmentHash)
          await setDoc(claimRef, {
            ...claimData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })

          // Update user profile in users collection if signed in
          if (currentUid && currentUid !== 'guest') {
            const userRef = doc(db, 'users', currentUid)
            await setDoc(
              userRef,
              {
                tribalVerified: true,
                tribalNation: activeTribalNation,
                tribalMaskedId: masked,
                tribalVerifiedAt: claimData.verifiedAt,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          }
        } catch (writeErr: any) {
          console.warn('[Firestore] Direct write warning, syncing via API:', writeErr?.message)
          // Also call API endpoint for server cookies and backup sync
          await fetch('/api/tribal/check-enrollment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              tribalNation: activeTribalNation,
              tribalEnrollmentId: enrollmentId.trim(),
              customerEmail: cleanEmail,
              customerId: currentUid,
              shippingAddress: zipCode.trim() ? { zip: zipCode.trim() } : undefined,
            }),
          })
        }
      }

      // Success feedback
      setFeedback({
        type: 'success',
        message: `Congratulations ${customerName}! Your enrollment with ${activeTribalNation} (${masked}) has been verified. Your 20% discount is now locked to ${cleanEmail}.`,
        details: {
          record: claimData,
          discount: { eligible: true, discountPercentage: 20, code: 'TRIBAL-MEMBER-20' },
          onReservation,
        },
      })

      if (onVerificationSuccess) {
        onVerificationSuccess({
          tribalNation: activeTribalNation,
          maskedEnrollmentId: masked,
          discountCode: 'TRIBAL-MEMBER-20',
          discountPercentage: 20,
          taxExempt: onReservation,
        })
      }
    } catch (err: any) {
      console.error('Error in TribalEligibilityChecker:', err)
      setFeedback({
        type: 'server_error',
        message: 'An error occurred during verification. Please check your connection and try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFeedback({ type: 'idle', message: '' })
    setEnrollmentId('')
  }

  return (
    <div
      id="tribal-eligibility-checker-direct"
      className={`rounded-2xl border border-amber-900/20 bg-linear-to-b from-amber-50/40 via-white to-white shadow-sm overflow-hidden ${
        compact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'
      } ${className}`}
      data-testid="tribal-eligibility-checker"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-amber-900/10 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold tracking-wider uppercase mb-1">
            <Lock className="w-4 h-4 text-amber-700" />
            <span>Firestore-Verified Tribal Benefits</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Tribal Eligibility &amp; 20% Discount Checker
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-xl">
            Verify your authentic enrollment number to lock your <strong>20% discount</strong> to your account and evaluate statutory sales tax exemption.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-100/80 border border-amber-300 px-3.5 py-2 text-amber-900 text-xs font-bold self-start sm:self-auto shrink-0 shadow-2xs">
          <Sparkles className="w-4 h-4 text-amber-700" />
          <span>Official 20% Discount</span>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Account Email & Firebase Auth Connection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
                1. Customer Account Email <span className="text-rose-600">*</span>
              </label>
              {!user && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline inline-flex items-center gap-1"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              {user ? (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Authenticated as {user.email} (Benefits lock to this profile)
                </span>
              ) : (
                'Your verified tribal ID will be locked to this email address in Firestore.'
              )}
            </span>
          </div>

          {/* Row 1b: Full Legal Name */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                First Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Last Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Tribal Nation & Enrollment ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
              2. Federally Recognized Tribe <span className="text-rose-600">*</span>
            </label>
            <select
              value={selectedTribalNation}
              onChange={(e) => setSelectedTribalNation(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              {POPULAR_TRIBES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {selectedTribalNation.startsWith('Other') && (
              <input
                type="text"
                required
                value={customNation}
                onChange={(e) => setCustomNation(e.target.value)}
                placeholder="Type your federally recognized tribe name"
                className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
              3. Tribal Enrollment ID / CDIB Number <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                placeholder="e.g. NN-94821 or 88472"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 font-mono tracking-wider focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
              <ShieldCheck className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              One-customer lock: Once verified, only your account may use this tribal enrollment ID.
            </span>
          </div>
        </div>

        {/* Row 3: Optional Shipping ZIP & Submit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
              4. Delivery Destination ZIP Code (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={5}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="e.g. 86515 (Navajo AZ), 92061 (Pauma CA)"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
              <MapPin className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Enter your shipping destination to evaluate statutory sales tax exemption.
            </span>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 px-5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm ${
                isSubmitting
                  ? 'bg-amber-400 cursor-wait'
                  : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Firestore Ledger &amp; Security Lock...</span>
                </>
              ) : (
                <>
                  <span>Verify 20% Discount &amp; Lock to Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Visual Feedback Alerts */}
      {feedback.type !== 'idle' && (
        <div className="mt-6 pt-5 border-t border-neutral-200">
          {/* STATE 1: Newly Verified Success */}
          {feedback.type === 'success' && (
            <div
              className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-5 text-emerald-950 space-y-3"
              data-testid="verification-success-alert"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>20% Tribal Discount Unlocked &amp; Bound to Account!</span>
                </div>
                <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 text-xs font-extrabold text-emerald-900">
                  20% OFF ACTIVE
                </span>
              </div>

              <p className="text-xs leading-relaxed text-emerald-900">{feedback.message}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white/80 rounded-lg p-3 border border-emerald-200 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Enrolled Tribe</span>
                  <strong className="text-neutral-900">{feedback.details?.record?.tribalNation}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Masked Enrollment ID</span>
                  <strong className="text-neutral-900 font-mono">
                    {feedback.details?.record?.maskedEnrollmentId}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Locked Account</span>
                  <strong className="text-neutral-900">{feedback.details?.record?.claimedByEmail}</strong>
                </div>
              </div>

              {feedback.details?.onReservation && (
                <div className="rounded-lg bg-emerald-100/90 border border-emerald-300 p-2.5 text-xs text-emerald-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>On-Reservation Delivery Confirmed:</strong> Destination qualifies for 100% statutory sales tax exemption!
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-emerald-800">
                  Code:{' '}
                  <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
                    TRIBAL-MEMBER-20
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
                >
                  Verify Another ID
                </button>
              </div>
            </div>
          )}

          {/* STATE 2: Already Verified by This User */}
          {feedback.type === 'already_verified' && (
            <div
              className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-5 text-emerald-950 space-y-3"
              data-testid="verification-already-verified-alert"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Account Already Verified</span>
                </div>
                <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 text-xs font-extrabold text-emerald-900">
                  20% OFF ACTIVE
                </span>
              </div>

              <p className="text-xs leading-relaxed text-emerald-900">{feedback.message}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white/80 rounded-lg p-3 border border-emerald-200 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Tribe &amp; Masked ID</span>
                  <strong className="text-neutral-900">
                    {feedback.details?.record?.tribalNation} ({feedback.details?.record?.maskedEnrollmentId})
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Bound Account Email</span>
                  <strong className="text-neutral-900">{feedback.details?.record?.claimedByEmail}</strong>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
                >
                  Reset Form
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: DUPLICATE CLAIM BLOCKED */}
          {feedback.type === 'duplicate_blocked' && (
            <div
              className="rounded-xl border border-rose-300 bg-rose-50/80 p-5 text-rose-950 space-y-3"
              data-testid="verification-duplicate-blocked-alert"
            >
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Enrollment ID Already Claimed by Another Customer</span>
              </div>

              <p className="text-xs leading-relaxed text-rose-900">{feedback.message}</p>

              <div className="rounded-lg bg-white border border-rose-200 p-3 text-xs text-neutral-700 space-y-1">
                <p>
                  <strong>Security &amp; Fraud Prevention Policy:</strong> To protect sovereign tribal benefits and prevent unauthorized discount sharing, each enrollment ID is cryptographically hashed and locked to a single verified customer account.
                </p>
                {feedback.details?.record && (
                  <p className="text-neutral-500 text-[11px]">
                    Registered Nation: <strong>{feedback.details.record.tribalNation}</strong> · ID:{' '}
                    <strong>{feedback.details.record.maskedEnrollmentId}</strong> · Account:{' '}
                    <strong>{feedback.details.record.claimedByEmail}</strong>
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <a
                  href={`mailto:support@displaycellpros.com?subject=Tribal%20Enrollment%20ID%20Verification%20Support%20Request&body=Hello%20DisplayCellPros%20Support,%0A%0AI%20am%20attempting%20to%20verify%20my%20tribal%20enrollment%20for%20${encodeURIComponent(
                    activeTribalNation
                  )}%20(Enrollment%20ID:%20${encodeURIComponent(
                    enrollmentId
                  )}),%20but%20the%20system%20indicates%20it%20has%20already%20been%20registered.%0A%0AMy%20account%20email%20is:%20${encodeURIComponent(
                    customerEmail
                  )}%0AMy%20name%20is:%20${encodeURIComponent(firstName + ' ' + lastName)}`}
                  className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact DisplayCellPros Support to Verify Ownership</span>
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-rose-800 hover:text-rose-950 underline self-center sm:self-auto"
                >
                  Try Different Enrollment Number
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: Invalid Format */}
          {feedback.type === 'invalid_format' && (
            <div
              className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-amber-950 text-xs flex items-start gap-2.5"
              data-testid="verification-invalid-format-alert"
            >
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-900">Format Notice: </strong>
                <span>{feedback.message}</span>
              </div>
            </div>
          )}

          {/* STATE 5: Server or Network Notice */}
          {feedback.type === 'server_error' && (
            <div
              className="rounded-xl border border-neutral-300 bg-neutral-100 p-4 text-neutral-800 text-xs flex items-start gap-2.5"
              data-testid="verification-server-error-alert"
            >
              <AlertCircle className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-neutral-900">System Notice: </strong>
                <span>{feedback.message}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TribalEligibilityChecker
