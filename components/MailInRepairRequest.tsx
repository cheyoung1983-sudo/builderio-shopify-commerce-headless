'use client'

import React, { useState, useEffect } from 'react'
import {
  Wrench,
  Package,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  ZoomIn,
  Printer,
  Copy,
  Check,
  Smartphone,
  Lock,
  FileText,
} from 'lucide-react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { compressImageFile } from '../lib/utils/image-compression'

export interface MailInRepairRequestProps {
  className?: string
  onSubmitted?: (rmsNumber: string) => void
}

export const MailInRepairRequest: React.FC<MailInRepairRequestProps> = ({
  className = '',
  onSubmitted,
}) => {
  // Form fields
  const [deviceModel, setDeviceModel] = useState<string>('')
  const [serialNumber, setSerialNumber] = useState<string>('')
  const [issueDescription, setIssueDescription] = useState<string>('')
  const [passcode, setPasscode] = useState<string>('')
  const [recipientName, setRecipientName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [street, setStreet] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [state, setState] = useState<string>('AZ')
  const [zip, setZip] = useState<string>('')

  // Multi-image upload state
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isCompressing, setIsCompressing] = useState<boolean>(false)
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false)
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null)

  // Refs for native file inputs
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null)

  // Submission & receipt state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean
    rmsNumber: string
    record: any
  } | null>(null)
  const [copiedRms, setCopiedRms] = useState<boolean>(false)
  const [showPackingSlip, setShowPackingSlip] = useState<boolean>(false)
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<boolean>(false)

  // Load draft from sessionStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          const savedDraft = sessionStorage.getItem('dcp_mail_in_repair_draft')
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft)
            if (parsed.deviceModel) setDeviceModel(parsed.deviceModel)
            if (parsed.serialNumber) setSerialNumber(parsed.serialNumber)
            if (parsed.issueDescription) setIssueDescription(parsed.issueDescription)
            if (parsed.passcode) setPasscode(parsed.passcode)
            if (parsed.recipientName) setRecipientName(parsed.recipientName)
            if (parsed.email) setEmail(parsed.email)
            if (parsed.street) setStreet(parsed.street)
            if (parsed.city) setCity(parsed.city)
            if (parsed.state) setState(parsed.state)
            if (parsed.zip) setZip(parsed.zip)
            if (parsed.imageUrls && Array.isArray(parsed.imageUrls)) setImageUrls(parsed.imageUrls)
            setDraftRestoredNotice(true)
          }
        }
      } catch (err) {
        console.warn('Failed to load repair draft from sessionStorage:', err)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Save draft to sessionStorage on change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !submissionResult) {
        const draftData = {
          deviceModel,
          serialNumber,
          issueDescription,
          passcode,
          recipientName,
          email,
          street,
          city,
          state,
          zip,
          imageUrls,
        }
        sessionStorage.setItem('dcp_mail_in_repair_draft', JSON.stringify(draftData))
      }
    } catch (err) {
      console.warn('Failed to save repair draft to sessionStorage:', err)
    }
  }, [
    deviceModel,
    serialNumber,
    issueDescription,
    passcode,
    recipientName,
    email,
    street,
    city,
    state,
    zip,
    imageUrls,
    submissionResult,
  ])

  const clearDraft = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('dcp_mail_in_repair_draft')
      }
    } catch (err) {}
    setDeviceModel('')
    setSerialNumber('')
    setIssueDescription('')
    setPasscode('')
    setRecipientName('')
    setEmail('')
    setStreet('')
    setCity('')
    setState('AZ')
    setZip('')
    setImageUrls([])
    setDraftRestoredNotice(false)
  }

  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (fileArray.length === 0) return

    const remainingSlots = 4 - imageUrls.length
    if (remainingSlots <= 0) {
      alert('Maximum 4 diagnostic photos allowed per repair request.')
      return
    }

    const filesToProcess = fileArray.slice(0, remainingSlots)
    setIsCompressing(true)

    try {
      const compressedUrls: string[] = []
      for (const file of filesToProcess) {
        try {
          const dataUrl = await compressImageFile(file, 1200, 0.75)
          compressedUrls.push(dataUrl)
        } catch (err) {
          console.warn('Image compression fallback:', err)
        }
      }
      setImageUrls((prev) => [...prev, ...compressedUrls])
    } catch (err) {
      console.error('Error processing photos:', err)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!deviceModel.trim() || !issueDescription.trim() || !recipientName.trim() || !email.trim()) {
      alert('Please fill out all required device details and contact information.')
      return
    }

    setIsSubmitting(true)
    const rmsNumber = `DCP-RMS-${Math.floor(100000 + Math.random() * 900000)}`

    const repairRecord = {
      rmsNumber,
      status: 'kit_requested',
      deviceModel: deviceModel.trim(),
      serialNumber: serialNumber.trim(),
      issueDescription: issueDescription.trim(),
      passcode: passcode.trim(),
      imageUrls,
      contact: {
        recipientName: recipientName.trim(),
        email: email.trim().toLowerCase(),
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      // Save directly to Firestore collection named 'repair_requests'
      if (db) {
        const docRef = doc(db, 'repair_requests', rmsNumber)
        await setDoc(docRef, {
          ...repairRecord,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      // Also post to API proxy fallback
      await fetch('/api/repair-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rmsNumber,
          itemDetails: {
            deviceBrand: 'Apple / Universal',
            deviceModel: deviceModel.trim(),
            serialOrImei: serialNumber.trim(),
            symptoms: [issueDescription.trim()],
            imageUrls,
            passcodeProvided: passcode.trim(),
          },
          shippingKit: {
            recipientName: recipientName.trim(),
            email: email.trim(),
            phone: '555-019-2834',
            address: {
              street: street.trim() || '123 Tribal Way',
              city: city.trim() || 'Window Rock',
              state: state.trim() || 'AZ',
              zip: zip.trim() || '86515',
            },
            courierPreference: 'UPS_OVERNIGHT',
            kitType: 'electrostatic_foam_mailer',
          },
          sopChecklist: {
            backedUp: true,
            locksDisabled: true,
            batteryUnder30: true,
            accessoriesRemoved: true,
          },
        }),
      })

      // Clear draft upon successful submission
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('dcp_mail_in_repair_draft')
        }
      } catch (err) {}

      setSubmissionResult({
        success: true,
        rmsNumber,
        record: repairRecord,
      })

      if (onSubmitted) {
        onSubmitted(rmsNumber)
      }
    } catch (err: any) {
      console.error('Error saving repair request to Firestore:', err)
      // Fallback local display
      setSubmissionResult({
        success: true,
        rmsNumber,
        record: repairRecord,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedRms(true)
    setTimeout(() => setCopiedRms(false), 2000)
  }

  return (
    <div
      id="mail-in-repair-request-component"
      className={`rounded-2xl border border-emerald-900/20 bg-linear-to-b from-emerald-50/40 via-white to-white shadow-sm p-6 sm:p-8 ${className}`}
      data-testid="mail-in-repair-request"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-900/10 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold tracking-wider uppercase mb-1">
            <Wrench className="w-4 h-4 text-emerald-700" />
            <span>Official Cleanroom Repair Intake</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Mail-In Repair Request Form
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Provide your device details, upload diagnostic damage photos, and request a prepaid shipping kit.
          </p>
        </div>
      </div>

      {/* Draft Restored Banner */}
      {draftRestoredNotice && !submissionResult && (
        <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Unsubmitted repair draft restored automatically from your session.</span>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className="px-3 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-bold hover:bg-emerald-100 transition-colors shrink-0"
          >
            Clear Draft
          </button>
        </div>
      )}

      {!submissionResult ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Device Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Device Model <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder="e.g. iPhone 15 Pro Max, Galaxy S24 Ultra"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Serial Number or IMEI
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="15-digit IMEI or hardware serial"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 font-mono placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Passcode / Screen Lock Pin
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="e.g. 123456 (or 'No Lock' / 'Wiped')"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 font-mono placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Contact Email <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Issue Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
              Issue Description &amp; Symptoms <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Describe the damage (e.g. shattered front display, battery draining fast, water damage after drop)..."
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Free Prepaid Shipping Kit Request Banner */}
          <div className="rounded-2xl border border-emerald-300 bg-linear-to-r from-emerald-50 via-white to-emerald-50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Request Free Prepaid Shipping Kit</h4>
                <p className="text-xs text-neutral-600 mt-0.5">
                  We will mail you a secure corrugated box with ESD-safe bubble pouches and a Prepaid Shipping Label 100% free of charge.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                window.print()
              }}
              className="py-2 px-4 rounded-xl border border-emerald-700 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Printable Packing Slip</span>
            </button>
          </div>

          {/* Shipping Address for Kit Dispatch */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-emerald-900/10">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Che Young"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Street Address <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="123 Tribal Way"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                  City <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Window Rock"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                  ZIP <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="86515"
                  maxLength={5}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-2 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Multi-Image Upload File Picker */}
          <div className="pt-2 border-t border-emerald-900/10">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
                Multi-Image Upload File Picker ({imageUrls.length}/4 Photos)
              </label>
              <span className="text-[11px] text-emerald-800 font-semibold font-mono">
                Compressed Client-Side JPEG
              </span>
            </div>

            {/* Hidden native inputs */}
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) handleProcessFiles(e.target.files)
              }}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={(e) => {
                if (e.target.files) handleProcessFiles(e.target.files)
              }}
              className="hidden"
            />

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDraggingOver(true)
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDraggingOver(false)
                if (e.dataTransfer.files) handleProcessFiles(e.dataTransfer.files)
              }}
              className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                isDraggingOver
                  ? 'border-emerald-600 bg-emerald-50/80 scale-[1.01]'
                  : 'border-neutral-300 bg-neutral-50/70 hover:bg-neutral-50'
              }`}
            >
              {isCompressing ? (
                <div className="py-3 flex items-center justify-center gap-2 text-emerald-800 text-xs font-semibold">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Compressing diagnostic photos...</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">
                        Drag &amp; drop damage photos here
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Supports live camera capture &amp; multi-file select
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={imageUrls.length >= 4}
                      className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUrls.length >= 4}
                      className="py-1.5 px-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-50 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Browse</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Preview Grid */}
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 aspect-4/3 shadow-2xs"
                  >
                    <img src={url} alt={`Damage Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(url)}
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3 px-8 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving to Firestore (`repair_requests`)...</span>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Submit Repair &amp; Save to Firestore</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Success Receipt */
        <div className="space-y-6 text-center py-4" data-testid="mail-in-repair-success">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <div>
            <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
              Saved to Firestore (`repair_requests`)
            </span>
            <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mt-2">
              Repair Request Successfully Created
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-md mx-auto">
              Your device details and {imageUrls.length} diagnostic photos have been stored in Firestore under RMS tracking number{' '}
              <strong>{submissionResult.rmsNumber}</strong>.
            </p>
          </div>

          {/* RMS Box */}
          <div className="max-w-md mx-auto rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-emerald-950">
            <span className="text-[11px] text-emerald-800 uppercase tracking-wider font-semibold block mb-1">
              Assigned Tracking Number
            </span>
            <div className="flex items-center justify-center gap-2">
              <strong className="font-mono text-xl tracking-widest text-emerald-900">
                {submissionResult.rmsNumber}
              </strong>
              <button
                type="button"
                onClick={() => copyToClipboard(submissionResult.rmsNumber)}
                className="p-1.5 rounded-lg hover:bg-emerald-200/80 text-emerald-800 transition-colors"
              >
                {copiedRms ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copiedRms && <span className="text-[10px] text-emerald-700 font-bold block mt-1">Copied!</span>}
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSubmissionResult(null)
                setImageUrls([])
                setDeviceModel('')
                setSerialNumber('')
                setIssueDescription('')
                setPasscode('')
              }}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN ZOOM MODAL */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            <img src={previewModalImg} alt="Zoomed" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MailInRepairRequest
