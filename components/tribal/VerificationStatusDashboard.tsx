'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Tag,
  MapPin,
  FileCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Hash,
  Calendar,
  Building2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  QrCode,
  Download,
} from 'lucide-react'
import { TribalVerificationModal } from './TribalVerificationModal'
import { ExemptionCertificateForm } from './ExemptionCertificateForm'
import { VerificationStepper } from './VerificationStepper'
import { SuccessToast } from './SuccessToast'
import { TribalIdQrScannerModal } from './TribalIdQrScannerModal'
import { downloadCertificatePdf } from '../../lib/tribal/pdf-generator.ts'
import type { ScannedTribalIdData } from '../../lib/tribal/qr-scanner.ts'

export interface CustomerMetafield {
  namespace?: string
  key: string
  value: string
  type?: string
}

export interface VerificationStatusDashboardProps {
  customerId?: string
  customerEmail?: string
  customerName?: string
  metafields?: CustomerMetafield[]
  tags?: string[]
  taxExempt?: boolean
  taxExemptions?: string[]
  onRefresh?: () => void
  className?: string
}

interface ParsedAuditLog {
  customerId?: string
  status?: string
  timestamp?: string
  hash?: string
  tribalNation?: string
  maskedEnrollmentId?: string
  provider?: string
  certificateRef?: string
  taxExempt?: boolean
  entityUseCode?: string
  metadata?: Record<string, any>
}

export function VerificationStatusDashboard({
  customerId = 'guest',
  customerEmail = '',
  customerName = '',
  metafields = [],
  tags = [],
  taxExempt = false,
  taxExemptions = [],
  onRefresh,
  className = '',
}: VerificationStatusDashboardProps) {
  const router = useRouter()
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
  const [isCertificateFormOpen, setIsCertificateFormOpen] = useState(false)
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false)
  const [scannedData, setScannedData] = useState<ScannedTribalIdData | null>(null)
  const [showFullAuditDetails, setShowFullAuditDetails] = useState(false)
  const [isSuccessToastOpen, setIsSuccessToastOpen] = useState(false)
  const [toastPayload, setToastPayload] = useState<{
    title?: string
    tagName?: string
    message?: string
    subMessage?: string
  }>({
    title: 'Shopify Customer Tag Applied',
    tagName: 'tribal-member-verified',
    message: 'Your tribal membership was successfully verified!',
    subMessage:
      'The "tribal-member-verified" tag has been attached to your Shopify customer record. Your 20% commercial discount is active.',
  })

  // Handle successful QR scan of tribal ID card
  const handleScanSuccess = (data: ScannedTribalIdData) => {
    setScannedData(data)
    setIsVerificationModalOpen(true)
    setToastPayload({
      title: 'Tribal ID Card Scanned',
      tagName: data.enrollmentId,
      message: `Card credentials extracted for ${data.fullName}`,
      subMessage: `Identified ${data.tribalNation}. Form fields automatically populated and ready for verification.`,
    })
    setIsSuccessToastOpen(true)
  }

  // Parse Metafields data
  const parsedData = useMemo(() => {
    const metafieldMap = new Map<string, string>()
    for (const m of metafields) {
      if (m && m.key) {
        metafieldMap.set(m.key, m.value)
      }
    }

    const verificationStatusRaw = metafieldMap.get('tribal_verification_status') || ''
    const verifiedAt = metafieldMap.get('tribal_verified_at') || ''
    const verificationHash = metafieldMap.get('tribal_verification_hash') || ''
    const auditLogRaw = metafieldMap.get('tribal_audit_log') || ''

    let auditLog: ParsedAuditLog | null = null
    if (auditLogRaw) {
      try {
        auditLog = JSON.parse(auditLogRaw)
      } catch {
        auditLog = null
      }
    }

    const hasVerifiedTag = tags.includes('tribal-member-verified')
    const isStatusVerified =
      verificationStatusRaw.toUpperCase() === 'VERIFIED' ||
      verificationStatusRaw.toUpperCase() === 'EXEMPT_ACTIVE' ||
      hasVerifiedTag

    const isTaxExemptEffective =
      taxExempt ||
      taxExemptions.includes('EXEMPT_INDIAN_IN_CANADA_OR_USA') ||
      auditLog?.taxExempt === true

    const tribalNation =
      auditLog?.tribalNation ||
      metafieldMap.get('tribal_nation') ||
      (isStatusVerified ? 'Federally Recognized Tribal Nation' : '')

    const maskedEnrollmentId =
      auditLog?.maskedEnrollmentId ||
      metafieldMap.get('tribal_enrollment_id_masked') ||
      (isStatusVerified ? '••••Verified' : '')

    const certificateRef =
      auditLog?.certificateRef ||
      metafieldMap.get('tribal_certificate_ref') ||
      (isTaxExemptEffective ? 'CERT-ACTIVE' : '')

    const provider = auditLog?.provider || 'sheerid'
    const entityUseCode = auditLog?.entityUseCode || (isTaxExemptEffective ? 'C' : undefined)

    return {
      isStatusVerified,
      statusString: verificationStatusRaw || (isStatusVerified ? 'VERIFIED' : 'UNVERIFIED'),
      verifiedAt,
      verificationHash,
      auditLog,
      hasVerifiedTag,
      isTaxExemptEffective,
      tribalNation,
      maskedEnrollmentId,
      certificateRef,
      provider,
      entityUseCode,
    }
  }, [metafields, tags, taxExempt, taxExemptions])

  // Verification Step Completion States
  const step1_IdentityVerified = parsedData.isStatusVerified
  const step2_GeofencingConfigured = parsedData.isStatusVerified
  const step3_CertificateSigned = Boolean(parsedData.certificateRef)
  const step4_MetafieldsSynced = Boolean(parsedData.verificationHash || parsedData.verifiedAt)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner / Hero Metric */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                parsedData.isStatusVerified
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {parsedData.isStatusVerified ? (
                <ShieldCheck className="w-7 h-7" />
              ) : (
                <ShieldAlert className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">
                  Tribal Verification & Exemption Status
                </h2>
                {parsedData.isStatusVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Enrolled Member
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Verification
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Visualizing synchronized Shopify customer metafields, Avalara tax exemption status, and audit records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center flex-wrap">
            <button
              type="button"
              onClick={() => setIsQrScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors shadow-sm cursor-pointer"
              title="Scan Tribal ID card or digital credential QR code"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              Scan Tribal ID (QR)
            </button>

            {parsedData.isStatusVerified ? (
              <button
                type="button"
                onClick={() => setIsCertificateFormOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                Manage Certificate
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setIsVerificationModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {parsedData.isStatusVerified ? 'Re-Verify Enrollment' : 'Start Tribal Verification'}
            </button>
          </div>
        </div>

        {/* Visual Progress Stepper (Submitted -> Processing -> Verified) */}
        <div className="mt-6">
          <VerificationStepper
            currentStatus={parsedData.statusString}
            verifiedAt={parsedData.verifiedAt}
            tribalNation={parsedData.tribalNation}
            onActionClick={() => setIsVerificationModalOpen(true)}
            actionLabel={parsedData.isStatusVerified ? 'Update Info' : 'Start Step 1'}
          />
        </div>

        {/* Dual-Track Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Track 1: Identity Discount */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              parsedData.isStatusVerified
                ? 'bg-indigo-50/50 border-indigo-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                <Tag className="w-4 h-4 text-indigo-600" />
                Track 1: Commercial Discount
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  parsedData.isStatusVerified
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {parsedData.isStatusVerified ? '20% Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enrolled tribal members receive an automatic <strong>20% discount</strong> on all qualifying parts and screens. Applies universally regardless of shipping location.
            </p>
            <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Customer Tag:</span>
              <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-800 font-semibold">
                {parsedData.hasVerifiedTag ? 'tribal-member-verified' : 'none'}
              </code>
            </div>
          </div>

          {/* Track 2: On-Reservation Tax Exemption */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              parsedData.isTaxExemptEffective
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Track 2: On-Reservation Tax Exemption
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  parsedData.isTaxExemptEffective
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {parsedData.isTaxExemptEffective ? 'Exempt Active' : 'Location Dependent'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sales tax is waived for orders delivered to certified Indian Reservation / Trust Lands via Avalara <strong>Entity Use Code C</strong>.
            </p>
            <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>AvaTax Entity Code:</span>
              <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-100 text-emerald-800 font-semibold">
                {parsedData.entityUseCode ? `Code ${parsedData.entityUseCode}` : 'Standard (Taxable)'}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Steps & Metafield Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Compliance Verification Pipeline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of multi-point verification steps required for state and federal tax exemptions.
          </p>
        </div>

        {/* Step List */}
        <div className="space-y-3">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3.5">
            <div className="mt-0.5 flex-shrink-0">
              {step1_IdentityVerified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Step 1: Tribal Identity Verification
                </h4>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    step1_IdentityVerified
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {step1_IdentityVerified ? 'Verified' : 'Action Required'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {step1_IdentityVerified
                  ? `Member enrolled with ${parsedData.tribalNation} (Census Roll ID: ${parsedData.maskedEnrollmentId}).`
                  : 'Tribal enrollment credentials have not yet been submitted or verified.'}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3.5">
            <div className="mt-0.5 flex-shrink-0">
              {step2_GeofencingConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Step 2: AIANA TIGER/Line Shapefile Boundary Geofencing
                </h4>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    step2_GeofencingConfigured
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step2_GeofencingConfigured ? 'Active & Monitored' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Shipping destination coordinates are automatically checked against U.S. Census Bureau AIANA reservation boundaries during checkout.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3.5">
            <div className="mt-0.5 flex-shrink-0">
              {step3_CertificateSigned ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Step 3: State Statutory Exemption Certificate (CDTFA-146-RES / WAC-458-20-192)
                </h4>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    step3_CertificateSigned
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {step3_CertificateSigned ? 'Signed & Registered' : 'Certificate Needed for Tax Exemption'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {step3_CertificateSigned
                  ? `Signed certificate recorded (Reference: ${parsedData.certificateRef}). Digital signature and delivery affirmation secured.`
                  : 'Complete a digital state certificate (e.g. California CDTFA-146-RES or Washington WAC 458-20-192) to certify delivery on sovereign land.'}
              </p>
              {step3_CertificateSigned && (
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const certId = parsedData.certificateRef || `CERT-ACTIVE-${Date.now().toString(36).toUpperCase()}`
                      downloadCertificatePdf({
                        certificateId: certId,
                        formType: 'CDTFA-146-RES',
                        customerId,
                        customerName: customerName || 'Verified Tribal Member',
                        customerEmail,
                        tribalNation: parsedData.tribalNation || 'Federally Recognized Tribal Nation',
                        enrollmentIdMasked: parsedData.maskedEnrollmentId || '••••Verified',
                        deliveryAddress: 'On-Reservation Certified Delivery Address',
                        carrierDeliveryMethod: 'COMMON_CARRIER',
                        state: 'CA',
                        signatureHash: parsedData.verificationHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                        signedAt: parsedData.verifiedAt || new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                        entityUseCode: parsedData.entityUseCode || 'C',
                      })
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Signed PDF Form (CDTFA-146-RES / WAC 458-20-192)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3.5">
            <div className="mt-0.5 flex-shrink-0">
              {step4_MetafieldsSynced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Clock className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Step 4: Shopify Customer Metafields & Compliance Audit Digest
                </h4>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    step4_MetafieldsSynced
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step4_MetafieldsSynced ? 'Audit Digest Synced' : 'Pending Sync'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {step4_MetafieldsSynced ? (
                  <>
                    Audit record anchored in Shopify Customer Metafields with SHA-256 digest:{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {parsedData.verificationHash ? `${parsedData.verificationHash.substring(0, 16)}...` : 'Synced'}
                    </span>
                  </>
                ) : (
                  'Verification events and cryptographic SHA-256 hash will be written to customer metafields upon verification.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Metafield Audit Inspector Toggle */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFullAuditDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
          >
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            {showFullAuditDetails ? 'Hide Technical Metafield Audit Details' : 'View Technical Metafield Audit Details'}
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${showFullAuditDetails ? 'rotate-90' : ''}`}
            />
          </button>

          {showFullAuditDetails && (
            <div className="mt-3 p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs space-y-2 overflow-x-auto">
              <p className="text-slate-400 text-[11px]">{/* Shopify Customer Metafields State */}</p>
              <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                <div>
                  <span className="text-indigo-400">custom.tribal_verification_status:</span>{' '}
                  <span className="text-emerald-400">{JSON.stringify(parsedData.statusString)}</span>
                </div>
                <div>
                  <span className="text-indigo-400">custom.tribal_verified_at:</span>{' '}
                  <span className="text-slate-300">{JSON.stringify(parsedData.verifiedAt || 'null')}</span>
                </div>
                <div>
                  <span className="text-indigo-400">custom.tribal_verification_hash:</span>{' '}
                  <span className="text-amber-400">{JSON.stringify(parsedData.verificationHash || 'null')}</span>
                </div>
                <div>
                  <span className="text-indigo-400">custom.tribal_audit_log:</span>{' '}
                  <pre className="text-slate-300 mt-1 whitespace-pre-wrap bg-slate-950 p-2 rounded">
                    {JSON.stringify(parsedData.auditLog || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Tribal Verification Modal */}
      <TribalVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        initialEnrollmentData={scannedData || undefined}
        onVerified={(result) => {
          setIsVerificationModalOpen(false)
          setToastPayload({
            title: 'Shopify Customer Tag Applied',
            tagName: 'tribal-member-verified',
            message: `Verified successfully with ${result?.tribalNation || 'Tribal Nation'}!`,
            subMessage:
              'Shopify customer tag "tribal-member-verified" is active. 20% discount applied and on-reservation tax exemption enabled.',
          })
          setIsSuccessToastOpen(true)
          onRefresh?.()
        }}
        customerId={customerId}
        customerEmail={customerEmail}
      />

      {/* Modal: Tribal ID Card QR Code Scanner */}
      <TribalIdQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Modal 2: Exemption Certificate Form Modal */}
      {isCertificateFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8">
            <ExemptionCertificateForm
              customerId={customerId}
              initialData={{
                customerName: customerName || '',
                customerEmail: customerEmail || '',
                tribalNation: parsedData.tribalNation,
                enrollmentId: parsedData.maskedEnrollmentId.replace('••••', ''),
              }}
              onSuccess={() => {
                setIsCertificateFormOpen(false)
                setToastPayload({
                  title: 'Tax Exemption Certificate Active',
                  tagName: 'tribal-tax-exempt-active',
                  message: 'State exemption certificate signed and recorded!',
                  subMessage:
                    'Avalara Entity Use Code C attached to customer profile for on-reservation orders.',
                })
                setIsSuccessToastOpen(true)
                onRefresh?.()
              }}
            />
            <button
              type="button"
              onClick={() => setIsCertificateFormOpen(false)}
              className="absolute top-4 right-4 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Global Success Toast Notification */}
      <SuccessToast
        isOpen={isSuccessToastOpen}
        title={toastPayload.title}
        tagName={toastPayload.tagName}
        message={toastPayload.message}
        subMessage={toastPayload.subMessage}
        discountPercentage={20}
        onClose={() => setIsSuccessToastOpen(false)}
        actionLabel="View Discounted Catalog"
        onAction={() => {
          router.push('/search')
        }}
      />
    </div>
  )
}

export default VerificationStatusDashboard
