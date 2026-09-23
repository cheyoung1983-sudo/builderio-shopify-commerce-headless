'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  ShieldCheck,
  Building2,
  MapPin,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Printer,
  Calendar,
  KeyRound,
  Check,
} from 'lucide-react'
import { DigitalSignaturePad } from './DigitalSignaturePad'
import type { SignedCertificateRecord } from '../../lib/tribal/types'
import { downloadCertificatePdf } from '../../lib/tribal/pdf-generator.ts'
import {
  exemptionCertificateSchema,
  tribalIdSchema,
  deliveryAddressSchema,
  validateExemptionCertificate,
  validateCertificateField,
  STATE_ZIP_RANGES,
} from '../../lib/tribal/validation.ts'
import type { ExemptionCertificateValidatedData } from '../../lib/tribal/validation.ts'

export interface ExemptionCertificateFormData {
  customerId?: string
  customerName: string
  customerEmail: string
  tribalNation: string
  enrollmentId: string
  reservationName: string
  deliveryAddress: {
    address1: string
    city: string
    state: string
    zip: string
  }
  carrierDeliveryMethod: 'COMMON_CARRIER' | 'SELLER_DELIVERY' | 'FOB_RESERVATION'
  deliveryConfirmationRef?: string
  signatureBase64: string
  signedDate?: string
  statutoryAffirmation: boolean
}

export interface ExemptionCertificateFormProps {
  initialData?: Partial<ExemptionCertificateFormData>
  customerId?: string
  onSuccess?: (certificate: SignedCertificateRecord) => void
  onSubmit?: (data: ExemptionCertificateFormData) => Promise<SignedCertificateRecord | void>
  className?: string
}

const STATE_FORM_MAP: Record<string, { code: string; title: string; desc: string; statute: string }> = {
  CA: {
    code: 'CDTFA-146-RES',
    title: 'California Sales and Use Tax Exemption Certificate (CDTFA-146-RES)',
    desc: 'For purchases delivered to an Indian reservation or trust land for an enrolled tribal member.',
    statute: 'California Revenue and Taxation Code Section 6358 & CDTFA Regulation 1616.',
  },
  WA: {
    code: 'WAC-458-20-192',
    title: 'Washington State Indian Country Exemption Certificate (WAC 458-20-192)',
    desc: 'For tangible personal property delivered into Indian Country for enrolled members or tribal entities.',
    statute: 'Washington Administrative Code (WAC) 458-20-192 & RCW 82.08.0254.',
  },
  DEFAULT: {
    code: 'GENERAL_TRIBAL_EXEMPTION',
    title: 'Federal Indian Commerce Clause & Sovereign Land Declaration',
    desc: 'Uniform tribal government and enrolled member tax exemption certificate for on-reservation transactions.',
    statute: 'U.S. Const. Art. I, § 8, cl. 3 (Indian Commerce Clause) & Federal Preemption Doctrine.',
  },
}

export function ExemptionCertificateForm({
  initialData,
  customerId = 'guest',
  onSuccess,
  onSubmit,
  className = '',
}: ExemptionCertificateFormProps) {
  const [formData, setFormData] = useState<ExemptionCertificateFormData>({
    customerId: customerId || initialData?.customerId || 'guest',
    customerName: initialData?.customerName || '',
    customerEmail: initialData?.customerEmail || '',
    tribalNation: initialData?.tribalNation || '',
    enrollmentId: initialData?.enrollmentId || '',
    reservationName: initialData?.reservationName || '',
    deliveryAddress: {
      address1: initialData?.deliveryAddress?.address1 || '',
      city: initialData?.deliveryAddress?.city || '',
      state: initialData?.deliveryAddress?.state?.toUpperCase() || 'AZ',
      zip: initialData?.deliveryAddress?.zip || '',
    },
    carrierDeliveryMethod: initialData?.carrierDeliveryMethod || 'COMMON_CARRIER',
    deliveryConfirmationRef: initialData?.deliveryConfirmationRef || '',
    signatureBase64: initialData?.signatureBase64 || '',
    signedDate: initialData?.signedDate || new Date().toISOString().split('T')[0],
    statutoryAffirmation: initialData?.statutoryAffirmation || false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [issuedCertificate, setIssuedCertificate] = useState<SignedCertificateRecord | null>(null)

  // Derive form type directly from delivery state
  const normState = (formData.deliveryAddress.state || '').toUpperCase().trim()
  const formTypeInfo = STATE_FORM_MAP[normState] || STATE_FORM_MAP.DEFAULT

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    // Clear field-level error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }

    if (name.startsWith('deliveryAddress.')) {
      const field = name.split('.')[1]
      const nextState = field === 'state' ? value.toUpperCase() : formData.deliveryAddress.state

      // If state or zip changes, clear any zip mismatch error
      if (field === 'state' || field === 'zip') {
        if (fieldErrors['deliveryAddress.zip']) {
          setFieldErrors((prev) => {
            const next = { ...prev }
            delete next['deliveryAddress.zip']
            return next
          })
        }
      }

      // If state changes, re-evaluate reservationName requirement and ZIP validation
      if (field === 'state') {
        const updatedState = value.toUpperCase()
        if (formData.deliveryAddress.zip) {
          const zipErr = validateCertificateField('deliveryAddress.zip', formData.deliveryAddress.zip, {
            deliveryAddress: { ...formData.deliveryAddress, state: updatedState },
          })
          if (zipErr) {
            setFieldErrors((prev) => ({ ...prev, 'deliveryAddress.zip': zipErr }))
          }
        }

        if (formData.reservationName || updatedState === 'CA' || updatedState === 'WA') {
          const resErr = validateCertificateField('reservationName', formData.reservationName, {
            deliveryAddress: { ...formData.deliveryAddress, state: updatedState },
          })
          setFieldErrors((prev) => {
            const next = { ...prev }
            if (resErr) {
              next.reservationName = resErr
            } else {
              delete next.reservationName
            }
            return next
          })
        }
      }

      setFormData((prev) => ({
        ...prev,
        deliveryAddress: {
          ...prev.deliveryAddress,
          [field]: field === 'state' ? value.toUpperCase() : value,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }))
    }
  }

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    const errorMsg = validateCertificateField(name, value, {
      deliveryAddress: formData.deliveryAddress,
      carrierDeliveryMethod: formData.carrierDeliveryMethod,
    })

    setFieldErrors((prev) => {
      const next = { ...prev }
      if (errorMsg) {
        next[name] = errorMsg
      } else {
        delete next[name]
      }
      return next
    })
  }

  const handleSignatureChange = (sigData: string | null) => {
    if (fieldErrors.signatureBase64) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.signatureBase64
        return next
      })
    }

    setFormData((prev) => ({
      ...prev,
      signatureBase64: sigData || '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Strict Zod schema validation
    const validation = validateExemptionCertificate(formData)

    if (!validation.success && validation.errors) {
      setFieldErrors(validation.errors)
      const errorCount = Object.keys(validation.errors).length
      setError(
        `Please correct the ${errorCount} statutory document and format error${
          errorCount > 1 ? 's' : ''
        } highlighted below before submission.`
      )
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    try {
      if (onSubmit) {
        const result = await onSubmit(formData)
        if (result && typeof result === 'object' && 'id' in result) {
          setIssuedCertificate(result as SignedCertificateRecord)
          onSuccess?.(result as SignedCertificateRecord)
        }
      } else {
        // Direct backend submission to /api/tribal/certificate
        const res = await fetch('/api/tribal/certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: formData.customerId,
            customerName: formData.customerName,
            customerEmail: formData.customerEmail,
            tribalNation: formData.tribalNation,
            enrollmentId: formData.enrollmentId,
            reservationName: formData.reservationName || formData.tribalNation,
            deliveryAddress: formData.deliveryAddress,
            carrierDeliveryMethod: formData.carrierDeliveryMethod,
            deliveryConfirmationRef: formData.deliveryConfirmationRef,
            signatureBase64: formData.signatureBase64,
            signedDate: formData.signedDate,
            statutoryAffirmation: formData.statutoryAffirmation,
          }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          if (data.errors) {
            setFieldErrors(data.errors)
          }
          throw new Error(data.error || data.details || 'Failed to submit exemption certificate')
        }

        setIssuedCertificate(data.certificate)
        onSuccess?.(data.certificate)
      }
    } catch (err: any) {
      console.error('Certificate submission error:', err)
      setError(err.message || 'An unexpected error occurred while processing the certificate.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Print / Save helper
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  // PDF Download helper
  const handleDownloadPdf = () => {
    if (!issuedCertificate) return
    downloadCertificatePdf({
      certificateId: issuedCertificate.id,
      formType: issuedCertificate.formType,
      customerId: formData.customerId,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      tribalNation: issuedCertificate.tribalNation,
      enrollmentIdMasked: issuedCertificate.enrollmentIdMasked,
      deliveryAddress: issuedCertificate.deliveryAddress,
      carrierDeliveryMethod: issuedCertificate.carrierDeliveryMethod,
      state: issuedCertificate.state,
      signatureHash: issuedCertificate.signatureHash,
      signedAt: issuedCertificate.signedAt,
      expiresAt: issuedCertificate.expiresAt,
      entityUseCode: 'C',
    })
  }

  if (issuedCertificate) {
    return (
      <div className={`bg-white border border-emerald-200 rounded-xl p-6 sm:p-8 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 text-emerald-700 mb-4 pb-4 border-b border-emerald-100">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-slate-900">Exemption Certificate Issued & Registered</h3>
            <p className="text-xs text-emerald-800">
              Certificate Record ID: <span className="font-mono font-bold">{issuedCertificate.id}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 bg-slate-50 p-5 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statutory Form</p>
              <p className="font-medium text-slate-900">{issuedCertificate.formType}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tribal Nation</p>
              <p className="font-medium text-slate-900">{issuedCertificate.tribalNation}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrollment ID (Masked)</p>
              <p className="font-mono font-medium text-slate-900">{issuedCertificate.enrollmentIdMasked}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certified Delivery Address</p>
              <p className="font-medium text-slate-900 truncate">{issuedCertificate.deliveryAddress}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Carrier Track</p>
              <p className="font-medium text-slate-900">{issuedCertificate.carrierDeliveryMethod}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Signature Digest</p>
              <p className="font-mono text-xs text-slate-600 truncate">{issuedCertificate.signatureHash}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Valid through: {new Date(issuedCertificate.expiresAt).toLocaleDateString()}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                title={`Download official PDF of signed ${issuedCertificate.formType}`}
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF Form ({issuedCertificate.formType})
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={() => setIssuedCertificate(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Submit New Certificate
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className={`bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6 ${className}`}
    >
      {/* Header & State Regulation Banner */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              State & Tribal Statutory Tax Exemption
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {formTypeInfo.title}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {formTypeInfo.desc}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {formTypeInfo.code}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Member & Tribal Identification */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-600" />
          1. Enrolled Tribal Member & Nation Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g. Mary Tsosie"
              aria-invalid={!!fieldErrors.customerName}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                fieldErrors.customerName
                  ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />
            {fieldErrors.customerName && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.customerName}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g. mary.tsosie@navajo.gov"
              aria-invalid={!!fieldErrors.customerEmail}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                fieldErrors.customerEmail
                  ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />
            {fieldErrors.customerEmail && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.customerEmail}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Federally Recognized Tribe / Nation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="tribalNation"
              value={formData.tribalNation}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g. Navajo Nation, Gila River, Yakama"
              aria-invalid={!!fieldErrors.tribalNation}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                fieldErrors.tribalNation
                  ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />
            {fieldErrors.tribalNation && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.tribalNation}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>
                Tribal Enrollment / Census Roll ID <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                Strict Format Check
              </span>
            </label>
            <input
              type="text"
              name="enrollmentId"
              value={formData.enrollmentId}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g. NAV-98442"
              aria-invalid={!!fieldErrors.enrollmentId}
              className={`w-full px-3 py-2 text-sm font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                fieldErrors.enrollmentId
                  ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                  : formData.enrollmentId && !fieldErrors.enrollmentId && tribalIdSchema.safeParse(formData.enrollmentId).success
                  ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500'
                  : 'border-slate-300'
              }`}
            />
            {fieldErrors.enrollmentId ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.enrollmentId}</span>
              </p>
            ) : formData.enrollmentId && tribalIdSchema.safeParse(formData.enrollmentId).success ? (
              <p className="mt-1 text-xs text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Tribal roll ID format verified against statutory standard</span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                Official tribal roll, census or membership ID (e.g. NAV-98442, YAK-10293, 12345678). Strict Zod validation prohibits placeholder or dummy values.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* On-Reservation Delivery Details */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-600" />
          2. Certified On-Reservation Delivery Address
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Physical Street Address (Reservation / Trust Land) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="deliveryAddress.address1"
              value={formData.deliveryAddress.address1}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g. 100 BIA Route 12, Tribal Administration Complex"
              aria-invalid={!!fieldErrors['deliveryAddress.address1']}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                fieldErrors['deliveryAddress.address1']
                  ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />
            {fieldErrors['deliveryAddress.address1'] && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors['deliveryAddress.address1']}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              City / Community <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="deliveryAddress.city"
              value={formData.deliveryAddress.city}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g. Window Rock"
              aria-invalid={!!fieldErrors['deliveryAddress.city']}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                fieldErrors['deliveryAddress.city']
                  ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />
            {fieldErrors['deliveryAddress.city'] && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors['deliveryAddress.city']}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="deliveryAddress.state"
                value={formData.deliveryAddress.state}
                onChange={handleInputChange}
                onBlur={handleBlur}
                aria-invalid={!!fieldErrors['deliveryAddress.state']}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 ${
                  fieldErrors['deliveryAddress.state']
                    ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
              >
                <option value="AZ">AZ - Arizona</option>
                <option value="CA">CA - California (CDTFA-146-RES)</option>
                <option value="WA">WA - Washington (WAC 458-20-192)</option>
                <option value="NM">NM - New Mexico</option>
                <option value="OK">OK - Oklahoma</option>
                <option value="MT">MT - Montana</option>
                <option value="SD">SD - South Dakota</option>
                <option value="ND">ND - North Dakota</option>
                <option value="NV">NV - Nevada</option>
                <option value="OR">OR - Oregon</option>
                <option value="MN">MN - Minnesota</option>
                <option value="WI">WI - Wisconsin</option>
              </select>
              {fieldErrors['deliveryAddress.state'] && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                  <span>{fieldErrors['deliveryAddress.state']}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="deliveryAddress.zip"
                value={formData.deliveryAddress.zip}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder={
                  formData.deliveryAddress.state === 'CA'
                    ? '95546'
                    : formData.deliveryAddress.state === 'WA'
                    ? '98948'
                    : '86515'
                }
                aria-invalid={!!fieldErrors['deliveryAddress.zip']}
                className={`w-full px-3 py-2 text-sm font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                  fieldErrors['deliveryAddress.zip']
                    ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
              />
              {fieldErrors['deliveryAddress.zip'] && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                  <span>{fieldErrors['deliveryAddress.zip']}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* State-Required Statutory Document Fields */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            3. State-Required Statutory Document Fields
          </h3>
          <span className="text-[10px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-semibold" title="State tax boards (CDTFA & WA DOR) require specific exemption forms to audit and validate tax-exempt transactions on trust land.">
            Why is this required?
          </span>
        </div>

        {/* Dynamic Statutory Context Callout */}
        {normState === 'CA' ? (
          <div className="bg-sky-50/80 border border-sky-200 rounded-lg p-3.5 text-xs text-sky-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-900">
              <ShieldCheck className="w-4 h-4 text-sky-700 flex-shrink-0" />
              California CDTFA-146-RES Statutory Compliance Mandate
            </div>
            <p className="text-[11px] leading-relaxed text-sky-900/90">
              Pursuant to <strong>California Revenue and Taxation Code Section 6358</strong> and <strong>CDTFA Regulation 1616</strong>, sellers must obtain form CDTFA-146-RES specifying the exact Indian Reservation or Rancheria where delivery takes place to substantiate state and local sales tax exemptions during state audits.
            </p>
          </div>
        ) : normState === 'WA' ? (
          <div className="bg-sky-50/80 border border-sky-200 rounded-lg p-3.5 text-xs text-sky-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-900">
              <ShieldCheck className="w-4 h-4 text-sky-700 flex-shrink-0" />
              Washington State WAC 458-20-192 Exemption Mandate
            </div>
            <p className="text-[11px] leading-relaxed text-sky-900/90">
              Under <strong>WAC 458-20-192</strong> and <strong>RCW 82.08.0254</strong>, tangible personal property delivered into Indian Country must be accompanied by certified documentation verifying that delivery occurred within the boundaries of a recognized reservation or trust land.
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-slate-600 flex-shrink-0" />
              Federal Indian Commerce Clause & Sovereign Land Declaration
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Federal preemption (U.S. Const. Art. I, § 8) exempts qualified transactions when delivered to sovereign reservation or trust land. State tax agencies require formal reservation designation and audit references to prevent improper tax assessments.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>
                {normState === 'CA'
                  ? 'Reservation or Rancheria Name'
                  : normState === 'WA'
                  ? 'Reservation or Indian Country Tract'
                  : 'Reservation / Sovereign Land Name'}{' '}
                {(normState === 'CA' || normState === 'WA') && (
                  <span className="text-red-500">*</span>
                )}
              </span>
              <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold" title="Required by state tax boards to verify trust land delivery jurisdiction.">
                Audit Verified
              </span>
            </label>
            <input
              type="text"
              name="reservationName"
              value={formData.reservationName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={
                normState === 'CA'
                  ? 'e.g. Hoopa Valley Indian Reservation, Round Valley'
                  : normState === 'WA'
                  ? 'e.g. Yakama Indian Reservation, Colville, Puyallup'
                  : 'e.g. Navajo Indian Reservation, Salt River'
              }
              aria-invalid={!!fieldErrors.reservationName}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                fieldErrors.reservationName
                  ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />
            {fieldErrors.reservationName && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.reservationName}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Bill of Lading / Carrier Tracking Ref</span>
              <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-semibold" title="Mandatory proof of delivery substantiating that merchandise was delivered on-reservation.">
                Proof of Delivery
              </span>
            </label>
            <input
              type="text"
              name="deliveryConfirmationRef"
              value={formData.deliveryConfirmationRef || ''}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g. 1Z9999999999999999, PRO-49201"
              aria-invalid={!!fieldErrors.deliveryConfirmationRef}
              className={`w-full px-3 py-2 text-sm font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 ${
                fieldErrors.deliveryConfirmationRef
                  ? 'border-red-500 bg-red-50/20 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />
            {fieldErrors.deliveryConfirmationRef ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.deliveryConfirmationRef}</span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                Carrier tracking number or BOL substantiating on-reservation delivery for CDTFA / WA DOR audit defense.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Carrier Delivery Method */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-slate-600" />
          4. Delivery Method Verification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label
            className={`border rounded-lg p-3.5 flex flex-col cursor-pointer transition-all ${
              formData.carrierDeliveryMethod === 'COMMON_CARRIER'
                ? 'border-slate-900 bg-slate-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <input
                type="radio"
                name="carrierDeliveryMethod"
                value="COMMON_CARRIER"
                checked={formData.carrierDeliveryMethod === 'COMMON_CARRIER'}
                onChange={handleInputChange}
                className="text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900">Common Carrier</span>
            </div>
            <span className="text-[11px] text-slate-500 leading-tight">
              Direct carrier freight (UPS, FedEx, USPS) to on-reservation address.
            </span>
          </label>

          <label
            className={`border rounded-lg p-3.5 flex flex-col cursor-pointer transition-all ${
              formData.carrierDeliveryMethod === 'SELLER_DELIVERY'
                ? 'border-slate-900 bg-slate-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <input
                type="radio"
                name="carrierDeliveryMethod"
                value="SELLER_DELIVERY"
                checked={formData.carrierDeliveryMethod === 'SELLER_DELIVERY'}
                onChange={handleInputChange}
                className="text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900">Seller Fleet</span>
            </div>
            <span className="text-[11px] text-slate-500 leading-tight">
              Vendor commercial vehicle delivered directly onto tribal trust lands.
            </span>
          </label>

          <label
            className={`border rounded-lg p-3.5 flex flex-col cursor-pointer transition-all ${
              formData.carrierDeliveryMethod === 'FOB_RESERVATION'
                ? 'border-slate-900 bg-slate-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <input
                type="radio"
                name="carrierDeliveryMethod"
                value="FOB_RESERVATION"
                checked={formData.carrierDeliveryMethod === 'FOB_RESERVATION'}
                onChange={handleInputChange}
                className="text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900">F.O.B. Destination</span>
            </div>
            <span className="text-[11px] text-slate-500 leading-tight">
              Title and physical possession transfer inside reservation boundary.
            </span>
          </label>
        </div>

        {fieldErrors.carrierDeliveryMethod && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            <span>{fieldErrors.carrierDeliveryMethod}</span>
          </p>
        )}
      </div>

      {/* Digital Signature & Perjury Affirmation */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-slate-600" />
          5. Digital Declaration & Signature
        </h3>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3.5 text-xs text-amber-900 space-y-1.5">
          <p className="font-semibold text-amber-950">Statutory Legal Certification:</p>
          <p className="leading-relaxed text-[11px] text-amber-900/90">
            {formTypeInfo.statute}
          </p>
        </div>

        <DigitalSignaturePad onSignatureChange={handleSignatureChange} disabled={isSubmitting} />

        {fieldErrors.signatureBase64 && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            <span>{fieldErrors.signatureBase64}</span>
          </p>
        )}

        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="statutoryAffirmation"
              checked={formData.statutoryAffirmation}
              onChange={handleInputChange}
              aria-invalid={!!fieldErrors.statutoryAffirmation}
              className={`mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer ${
                fieldErrors.statutoryAffirmation ? 'border-red-500' : ''
              }`}
            />
            <span className="text-xs text-slate-700 leading-normal">
              I certify under penalty of perjury under the laws of the State of{' '}
              <strong className="text-slate-900">{formData.deliveryAddress.state}</strong> and the United States that I am an enrolled tribal member, that delivery of these items will occur on designated tribal trust/reservation land, and that all statements are true and correct.
            </span>
          </label>

          {fieldErrors.statutoryAffirmation && (
            <p className="mt-1.5 ml-6 text-xs text-red-600 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <span>{fieldErrors.statutoryAffirmation}</span>
            </p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting & Registering Certificate...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Submit Exemption Certificate
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export {
  exemptionCertificateSchema,
  tribalIdSchema,
  deliveryAddressSchema,
  validateExemptionCertificate,
  validateCertificateField,
  STATE_ZIP_RANGES,
}
export type { ExemptionCertificateValidatedData }

export default ExemptionCertificateForm
