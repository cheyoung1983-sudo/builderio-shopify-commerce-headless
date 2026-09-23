'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Tag,
  FileText,
  Loader2,
  ChevronRight,
  Info,
  QrCode,
  Sparkles,
} from 'lucide-react'
import { DigitalSignaturePad } from './DigitalSignaturePad'
import { KNOWN_TRIBAL_NATIONS } from '../../lib/tribal/geofencing'
import { getRequiredCertificateType, getCertificateStatutoryNotice } from '../../lib/tribal/certificates'
import { TribalIdQrScannerModal } from './TribalIdQrScannerModal'
import type { ScannedTribalIdData } from '../../lib/tribal/qr-scanner'

export interface TribalVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified?: (result: any) => void
  initialAddress?: {
    address1?: string
    city?: string
    province?: string
    zip?: string
  }
  initialEnrollmentData?: Partial<ScannedTribalIdData>
  customerId?: string
  customerEmail?: string
}

export function TribalVerificationModal({
  isOpen,
  onClose,
  onVerified,
  initialAddress,
  initialEnrollmentData,
  customerId = 'guest',
  customerEmail = '',
}: TribalVerificationModalProps) {
  const [step, setStep] = useState<'form' | 'certificate' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInternalScannerOpen, setIsInternalScannerOpen] = useState(false)

  // Form fields
  const [firstName, setFirstName] = useState(initialEnrollmentData?.firstName || '')
  const [lastName, setLastName] = useState(initialEnrollmentData?.lastName || '')
  const [birthDate, setBirthDate] = useState(initialEnrollmentData?.birthDate || '')
  const [tribalNation, setTribalNation] = useState(initialEnrollmentData?.tribalNation || '')
  const [customNation, setCustomNation] = useState('')
  const [tribalEnrollmentId, setTribalEnrollmentId] = useState(initialEnrollmentData?.enrollmentId || '')

  // Address & Geofence
  const [address1, setAddress1] = useState(initialEnrollmentData?.address1 || initialAddress?.address1 || '')
  const [city, setCity] = useState(initialEnrollmentData?.city || initialAddress?.city || '')
  const [state, setState] = useState(initialEnrollmentData?.state || initialAddress?.province || 'CA')
  const [zip, setZip] = useState(initialEnrollmentData?.zip || initialAddress?.zip || '')
  const [geofenceResult, setGeofenceResult] = useState<any>(null)
  const [checkingGeofence, setCheckingGeofence] = useState(false)

  // Certificate signing
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [carrierMethod, setCarrierMethod] = useState<'COMMON_CARRIER' | 'SELLER_DELIVERY' | 'FOB_RESERVATION'>('COMMON_CARRIER')

  // Verification result
  const [verificationResult, setVerificationResult] = useState<any>(null)

  // Check geofence on demand or blur
  const handleCheckGeofence = useCallback(
    async (overrideZip?: string, overrideState?: string, overrideAddress?: string) => {
      const checkZip = overrideZip || zip
      const checkState = overrideState || state
      const checkAddress = overrideAddress || address1

      if (!checkZip || checkZip.length < 5) return
      setCheckingGeofence(true)
      try {
        const res = await fetch('/api/tribal/geofence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address1: checkAddress,
            city,
            province: checkState,
            zip: checkZip,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setGeofenceResult(data)
        }
      } catch (e) {
        console.warn('Geofence check failed:', e)
      } finally {
        setCheckingGeofence(false)
      }
    },
    [zip, state, address1, city]
  )

  // Apply initialEnrollmentData updates when provided or changed
  useEffect(() => {
    if (!initialEnrollmentData) return

    let isMounted = true
    const timer = setTimeout(() => {
      if (!isMounted) return

      if (initialEnrollmentData.firstName) setFirstName(initialEnrollmentData.firstName)
      if (initialEnrollmentData.lastName) setLastName(initialEnrollmentData.lastName)
      if (initialEnrollmentData.birthDate) setBirthDate(initialEnrollmentData.birthDate)
      if (initialEnrollmentData.enrollmentId) setTribalEnrollmentId(initialEnrollmentData.enrollmentId)
      if (initialEnrollmentData.tribalNation) {
        const matchingNation = KNOWN_TRIBAL_NATIONS.find(
          (n) => n.name.toLowerCase() === initialEnrollmentData.tribalNation?.toLowerCase()
        )
        if (matchingNation) {
          setTribalNation(matchingNation.name)
        } else {
          setTribalNation('other')
          setCustomNation(initialEnrollmentData.tribalNation)
        }
      }
      if (initialEnrollmentData.address1) setAddress1(initialEnrollmentData.address1)
      if (initialEnrollmentData.city) setCity(initialEnrollmentData.city)
      if (initialEnrollmentData.state) setState(initialEnrollmentData.state)
      if (initialEnrollmentData.zip) {
        setZip(initialEnrollmentData.zip)
        void handleCheckGeofence(
          initialEnrollmentData.zip,
          initialEnrollmentData.state,
          initialEnrollmentData.address1
        )
      }
    }, 0)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [initialEnrollmentData, handleCheckGeofence])

  if (!isOpen) return null

  const resolvedNation = tribalNation === 'other' ? customNation : tribalNation
  const requiredFormType = getRequiredCertificateType(state)
  const statutoryNotice = getCertificateStatutoryNotice(requiredFormType)

  const handleNextToCertificate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim() || !resolvedNation.trim() || !tribalEnrollmentId.trim()) {
      setError('Please fill in all required tribal enrollment fields.')
      return
    }

    // If on-reservation, require certificate step
    if (geofenceResult?.onReservation) {
      setStep('certificate')
    } else {
      // Proceed directly to verification
      handleSubmitVerification()
    }
  }

  const handleSubmitVerification = async () => {
    setLoading(true)
    setError(null)

    try {
      const payload: any = {
        customerId,
        email: customerEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || undefined,
        tribalNation: resolvedNation.trim(),
        tribalEnrollmentId: tribalEnrollmentId.trim(),
        shippingAddress: {
          address1,
          city,
          province: state,
          zip,
          country: 'US',
        },
      }

      if (geofenceResult?.onReservation && signatureData) {
        payload.certificate = {
          formType: requiredFormType,
          signatureBase64: signatureData,
          carrierDeliveryMethod: carrierMethod,
          signedDate: new Date().toISOString(),
        }
      }

      const res = await fetch('/api/tribal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.verified) {
        setError(data.message || data.error || 'Verification failed. Please verify enrollment number.')
        setLoading(false)
        return
      }

      setVerificationResult(data.result)
      setStep('success')
      if (onVerified) {
        onVerified(data.result)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Tribal Member Verification</h3>
              <p className="text-xs text-indigo-200">
                DisplayCellPros Dual-Track Discount & Tax Exemption
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Track Banner */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-5 py-3 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
              1
            </span>
            <span className="text-indigo-950 font-medium">
              <strong>Track 1:</strong> 20% Commercial Discount (All Orders)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
              2
            </span>
            <span className="text-emerald-950 font-medium">
              <strong>Track 2:</strong> Tax Exemption (On-Reservation Deliveries)
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleNextToCertificate} className="space-y-4">
              {/* QR Code Quick Intake Banner */}
              <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Tribal ID QR Intake
                    </span>
                    <span className="text-[11px] text-indigo-700 block">
                      Scan your card for fast automated data entry
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInternalScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Scan Card
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tribal Nation / Community *
                  </label>
                  <select
                    value={tribalNation}
                    onChange={(e) => setTribalNation(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Tribe / Nation...</option>
                    {KNOWN_TRIBAL_NATIONS.map((n) => (
                      <option key={n.id} value={n.name}>
                        {n.name} ({n.state})
                      </option>
                    ))}
                    <option value="other">Other Federally Recognized Tribe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tribal Enrollment / Census ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={tribalEnrollmentId}
                    onChange={(e) => setTribalEnrollmentId(e.target.value)}
                    placeholder="e.g. NAV-98421 or 12345"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {tribalNation === 'other' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter Tribal Nation Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customNation}
                    onChange={(e) => setCustomNation(e.target.value)}
                    placeholder="Full Federally Recognized Tribal Nation Name"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Shipping Address & Geofencing Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Delivery Address (for Track 2 Tax Exemption Check)
                  </span>
                  {checkingGeofence && (
                    <span className="text-[11px] text-indigo-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking AIANA Geofence...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    className="col-span-2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="State (e.g. CA)"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      onBlur={() => handleCheckGeofence()}
                      maxLength={2}
                      className="w-16 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white uppercase text-center"
                    />
                    <input
                      type="text"
                      placeholder="ZIP Code"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      onBlur={() => handleCheckGeofence()}
                      maxLength={10}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleCheckGeofence()}
                      disabled={checkingGeofence || !zip || zip.length < 5}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    >
                      Check AIANA
                    </button>
                  </div>
                </div>

                {/* Geofence Status Result */}
                {geofenceResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      geofenceResult.onReservation
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {geofenceResult.onReservation ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{geofenceResult.message}</p>
                      {geofenceResult.onReservation && (
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Requires digital certificate signature ({requiredFormType}) on next step.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : geofenceResult?.onReservation ? (
                    <>
                      Continue to Certificate Signature
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    'Verify & Activate 20% Discount'
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'certificate' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Statutory Certificate: {requiredFormType}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    On-Reservation Exemption
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">
                  &ldquo;{statutoryNotice}&rdquo;
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Method to Reservation *
                </label>
                <select
                  value={carrierMethod}
                  onChange={(e) => setCarrierMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="COMMON_CARRIER">Common Carrier (USPS / FedEx / UPS to Reservation)</option>
                  <option value="SELLER_DELIVERY">Seller Vehicle Direct Delivery to Reservation</option>
                  <option value="FOB_RESERVATION">FOB Reservation (Title transfers on Tribal Land)</option>
                </select>
              </div>

              {/* Digital Signature Canvas */}
              <DigitalSignaturePad onSignatureChange={setSignatureData} disabled={loading} />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Back to Form
                </button>
                <button
                  type="button"
                  onClick={handleSubmitVerification}
                  disabled={loading || !signatureData}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Sign Certificate & Finalize Verification
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && verificationResult && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">Verification Successful!</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Enrolled member record verified for {verificationResult.audit.tribalNation} ({verificationResult.audit.maskedEnrollmentId}).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs mb-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    Track 1: 20% Discount
                  </div>
                  <p className="text-xs text-indigo-700">
                    Active on all orders. Tag <code className="bg-white px-1 py-0.5 rounded text-[11px]">tribal-member-verified</code> applied to Shopify account.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs mb-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Track 2: Tax Exemption
                  </div>
                  <p className="text-xs text-emerald-700">
                    {verificationResult.taxExemptionTrack.taxExempt
                      ? 'On-reservation exemption active with Entity Use Code C.'
                      : 'Off-reservation: standard state destination tax applies.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-[11px] text-slate-500 font-mono">
                <div className="font-semibold text-slate-700">Audit Trail Verification Record:</div>
                <div className="truncate">Hash: {verificationResult.audit.verificationHash}</div>
                <div>Timestamp: {verificationResult.audit.verifiedAt}</div>
                {verificationResult.audit.certificateRef && (
                  <div>Cert Ref: {verificationResult.audit.certificateRef}</div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Done & Return to Shopping
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Embedded QR Code Scanner Modal */}
      <TribalIdQrScannerModal
        isOpen={isInternalScannerOpen}
        onClose={() => setIsInternalScannerOpen(false)}
        onScanSuccess={(scannedData) => {
          if (scannedData.firstName) setFirstName(scannedData.firstName)
          if (scannedData.lastName) setLastName(scannedData.lastName)
          if (scannedData.birthDate) setBirthDate(scannedData.birthDate)
          if (scannedData.enrollmentId) setTribalEnrollmentId(scannedData.enrollmentId)
          if (scannedData.tribalNation) {
            const match = KNOWN_TRIBAL_NATIONS.find(
              (n) => n.name.toLowerCase() === scannedData.tribalNation?.toLowerCase()
            )
            if (match) {
              setTribalNation(match.name)
            } else {
              setTribalNation('other')
              setCustomNation(scannedData.tribalNation)
            }
          }
          if (scannedData.address1) setAddress1(scannedData.address1)
          if (scannedData.city) setCity(scannedData.city)
          if (scannedData.state) setState(scannedData.state)
          if (scannedData.zip) {
            setZip(scannedData.zip)
            handleCheckGeofence(scannedData.zip, scannedData.state, scannedData.address1)
          }
          setIsInternalScannerOpen(false)
        }}
      />
    </div>
  )
}
