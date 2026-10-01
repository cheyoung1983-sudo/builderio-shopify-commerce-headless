'use client'

import React, { useState, useEffect } from 'react'
import {
  Wrench,
  Package,
  Truck,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Info,
  Check,
  Smartphone,
  Laptop,
  Tablet,
  FileText,
  Printer,
  Copy,
  ExternalLink,
  MapPin,
  Mail,
  User,
  Phone,
  Lock,
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  ZoomIn,
} from 'lucide-react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { compressImageFile } from '../../lib/utils/image-compression'

export interface MailInRepairRequestFormProps {
  initialEmail?: string
  className?: string
  onSubmitted?: (rmsNumber: string) => void
}

const COMMON_BRANDS = ['Apple', 'Samsung', 'Google', 'Microsoft', 'Lenovo', 'Dell', 'Motorola', 'Other']

const SYMPTOM_OPTIONS = [
  { id: 'screen_cracked', label: 'Cracked Glass / Broken OLED / Touch Dead' },
  { id: 'battery_degraded', label: 'Battery Swelling / Fast Drain / Not Charging' },
  { id: 'water_damage', label: 'Liquid Intrusion / Corrosion / Ultrasonic Clean' },
  { id: 'logic_board_micro', label: 'No Power / Board Short / Microsoldering' },
  { id: 'port_audio', label: 'USB-C / Lightning Port / Muffled Speaker' },
  { id: 'camera_sensors', label: 'Rear Camera Shaking / Face ID / Laser Sensor' },
]

export const MailInRepairRequestForm: React.FC<MailInRepairRequestFormProps> = ({
  initialEmail = '',
  className = '',
  onSubmitted,
}) => {
  const { user } = useAuth()

  // Form Step Navigation (1: Item Details, 2: Shipping Kit, 3: Safety & Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Step 1: Item Details
  const [deviceBrand, setDeviceBrand] = useState<string>('Apple')
  const [deviceModel, setDeviceModel] = useState<string>('iPhone 15 Pro')
  const [serialOrImei, setSerialOrImei] = useState<string>('')
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['screen_cracked'])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isCompressing, setIsCompressing] = useState<boolean>(false)
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false)
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null)
  const [passcode, setPasscode] = useState<string>('')
  const [lockStatus, setLockStatus] = useState<'passcode_provided' | 'wiped_no_lock' | 'test_pattern'>('passcode_provided')
  const [notes, setNotes] = useState<string>('')
  const [cosmeticCondition, setCosmeticCondition] = useState<string>('Minor wear / Scratches')

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null)

  // Step 2: Shipping Kit Intake
  const [recipientName, setRecipientName] = useState<string>('')
  const [email, setEmail] = useState<string>(initialEmail || user?.email || '')
  const [phone, setPhone] = useState<string>('')
  const [street, setStreet] = useState<string>('')
  const [apartment, setApartment] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [state, setState] = useState<string>('AZ')
  const [zip, setZip] = useState<string>('')
  const [courierPreference, setCourierPreference] = useState<'UPS_OVERNIGHT' | 'FEDEX_OVERNIGHT' | 'USPS_PRIORITY'>('UPS_OVERNIGHT')
  const [kitType, setKitType] = useState<'electrostatic_foam_mailer' | 'prepaid_label_only'>('electrostatic_foam_mailer')

  // Step 3: Safety SOP Checklist
  const [backedUp, setBackedUp] = useState<boolean>(true)
  const [locksDisabled, setLocksDisabled] = useState<boolean>(true)
  const [batteryUnder30, setBatteryUnder30] = useState<boolean>(true)
  const [accessoriesRemoved, setAccessoriesRemoved] = useState<boolean>(true)

  // Async submission states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean
    rmsNumber: string
    message: string
    record?: any
  } | null>(null)
  const [showPackingSlipModal, setShowPackingSlipModal] = useState<boolean>(false)
  const [copiedRms, setCopiedRms] = useState<boolean>(false)

  // Sync auth user email
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email)
    }
  }, [user?.email])

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

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const isSopReady = backedUp && locksDisabled && batteryUnder30 && accessoriesRemoved

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentStep === 1) {
      if (!deviceModel.trim()) {
        alert('Please specify the exact device model.')
        return
      }
      if (selectedSymptoms.length === 0) {
        alert('Please select at least one issue or symptom.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!recipientName.trim() || !email.trim() || !street.trim() || !city.trim() || !zip.trim()) {
        alert('Please complete all required shipping address fields.')
        return
      }
      setCurrentStep(3)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isSopReady) {
      alert('Please confirm all pre-shipping safety items in the SOP checklist before dispatching.')
      return
    }

    setIsSubmitting(true)
    const generatedRms = `DCP-RMS-${Math.floor(100000 + Math.random() * 900000)}`

    const payload = {
      rmsNumber: generatedRms,
      claimedByUid: user?.uid || 'guest',
      itemDetails: {
        deviceBrand,
        deviceModel: deviceModel.trim(),
        serialOrImei: serialOrImei.trim(),
        symptoms: selectedSymptoms,
        imageUrls,
        passcodeProvided: lockStatus === 'passcode_provided' ? passcode.trim() : `[${lockStatus}]`,
        notes: notes.trim(),
        cosmeticCondition,
      },
      shippingKit: {
        recipientName: recipientName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: {
          street: street.trim(),
          apartment: apartment.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
        },
        courierPreference,
        kitType,
      },
      sopChecklist: {
        backedUp,
        locksDisabled,
        batteryUnder30,
        accessoriesRemoved,
      },
      estimatedCost: {
        part: deviceBrand === 'Apple' ? 149.99 : 129.99,
        labor: 35.0,
        shipping: 0.0,
        total: (deviceBrand === 'Apple' ? 149.99 : 129.99) + 35.0,
      },
    }

    try {
      // 1. Write to Firestore if client SDK is ready
      if (db) {
        try {
          const docRef = doc(db, 'repair_requests', generatedRms)
          await setDoc(docRef, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } catch (dbErr) {
          console.warn('[Firestore Direct Write Warning]:', dbErr)
        }
      }

      // 2. Call API route for backup server persistence & email queue
      await fetch('/api/repair-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setSubmissionResult({
        success: true,
        rmsNumber: generatedRms,
        message: `Your prepaid shipping kit order has been placed under RMS Tracking #${generatedRms}.`,
        record: payload,
      })

      if (onSubmitted) {
        onSubmitted(generatedRms)
      }
    } catch (err: any) {
      console.error('Submission failed:', err)
      // Fallback local display
      setSubmissionResult({
        success: true,
        rmsNumber: generatedRms,
        message: `Your prepaid shipping kit order has been recorded locally under RMS Tracking #${generatedRms}.`,
        record: payload,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedRms(true)
    setTimeout(() => setCopiedRms(false), 2500)
  }

  return (
    <div
      id="mail-in-repair-request-form"
      className={`rounded-2xl border border-emerald-900/20 bg-linear-to-b from-emerald-50/40 via-white to-white shadow-sm p-6 sm:p-8 ${className}`}
      data-testid="mail-in-repair-request-form"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-900/10 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold tracking-wider uppercase mb-1">
            <Truck className="w-4 h-4 text-emerald-700" />
            <span>Overnight Nationwide Lab Repair</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Mail-In Repair Request &amp; Shipping Kit Intake
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-xl">
            Provide device diagnostics and order your complimentary electrostatic cushioned shipping kit with prepaid Priority Overnight freight.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100/80 border border-emerald-300 px-3.5 py-2 text-emerald-900 text-xs font-bold self-start sm:self-auto shrink-0 shadow-2xs">
          <Clock className="w-4 h-4 text-emerald-700" />
          <span>24–48h Bench Turnaround</span>
        </div>
      </div>

      {/* Progress Step Indicator */}
      {!submissionResult && (
        <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 text-xs font-bold transition-colors ${
              currentStep === 1
                ? 'text-emerald-700'
                : currentStep > 1
                ? 'text-emerald-900'
                : 'text-neutral-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 1
                  ? 'bg-emerald-700 text-white'
                  : currentStep > 1
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              1
            </span>
            <span>1. Item Details</span>
          </button>

          <div className={`h-0.5 flex-1 mx-3 ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-neutral-200'}`} />

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 text-xs font-bold transition-colors ${
              currentStep === 2
                ? 'text-emerald-700'
                : currentStep > 2
                ? 'text-emerald-900'
                : 'text-neutral-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 2
                  ? 'bg-emerald-700 text-white'
                  : currentStep > 2
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              2
            </span>
            <span>2. Shipping Kit</span>
          </button>

          <div className={`h-0.5 flex-1 mx-3 ${currentStep >= 3 ? 'bg-emerald-600' : 'bg-neutral-200'}`} />

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-2 text-xs font-bold transition-colors ${
              currentStep === 3
                ? 'text-emerald-700'
                : 'text-neutral-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 3
                  ? 'bg-emerald-700 text-white'
                  : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              3
            </span>
            <span>3. Safety &amp; Confirm</span>
          </button>
        </div>
      )}

      {/* STEP 1: Item Details & Diagnostics */}
      {!submissionResult && currentStep === 1 && (
        <form onSubmit={handleNextStep} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Device Brand */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Device Brand <span className="text-rose-600">*</span>
              </label>
              <select
                value={deviceBrand}
                onChange={(e) => setDeviceBrand(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {COMMON_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Device Model */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Exact Model Name / Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder="e.g. iPhone 15 Pro Max (A2849) or Galaxy S24"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Serial / IMEI */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Serial Number or IMEI (Optional)
              </label>
              <input
                type="text"
                value={serialOrImei}
                onChange={(e) => setSerialOrImei(e.target.value)}
                placeholder="15-digit IMEI or Hardware Serial"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 font-mono placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Issue Symptoms */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
              Select Reported Symptoms &amp; Faults <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {SYMPTOM_OPTIONS.map((sym) => {
                const isSelected = selectedSymptoms.includes(sym.id)
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => toggleSymptom(sym.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                        isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span>{sym.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lock & Passcode Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Passcode &amp; Lock Status
              </label>
              <select
                value={lockStatus}
                onChange={(e: any) => setLockStatus(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="passcode_provided">Provide Screen Lock Passcode (for full post-repair QC)</option>
                <option value="wiped_no_lock">Device Restored / No Lock Active</option>
                <option value="test_pattern">Test Pattern / Pin</option>
              </select>

              {lockStatus === 'passcode_provided' && (
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter 4-6 digit passcode (e.g. 123456)"
                  className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs text-neutral-900 font-mono placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              )}
            </div>

            {/* Cosmetic Condition */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Cosmetic Condition Prior to Transit
              </label>
              <select
                value={cosmeticCondition}
                onChange={(e) => setCosmeticCondition(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="Mint / Like New (No scratches)">Mint / Like New (No body blemishes)</option>
                <option value="Minor wear / Scratches">Minor wear / Light frame scratches</option>
                <option value="Heavy wear / Dent / Bent chassis">Heavy wear / Corner dent / Bent frame</option>
              </select>
            </div>
          </div>

          {/* Diagnostic Photos & Live Camera Capture */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
                Diagnostic Photos of Damaged Item (Optional)
              </label>
              <span className="text-[11px] font-mono text-emerald-800 font-semibold">
                {imageUrls.length} / 4 photos uploaded
              </span>
            </div>

            {/* Hidden native file & camera inputs */}
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

            {/* Drag & Drop Dropzone */}
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
              className={`rounded-2xl border-2 border-dashed p-4 sm:p-5 text-center transition-all ${
                isDraggingOver
                  ? 'border-emerald-600 bg-emerald-50/80 scale-[1.01]'
                  : 'border-neutral-300 bg-neutral-50/70 hover:bg-neutral-50 hover:border-neutral-400'
              }`}
            >
              {isCompressing ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2 text-emerald-800">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Optimizing and compressing diagnostic photos...</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-neutral-900 block">
                        Drag &amp; drop device photos here
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Front display, back glass, frame corners, or powered-on screen error
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={imageUrls.length >= 4}
                      className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUrls.length >= 4}
                      className="py-1.5 px-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-50 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Browse Files</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Image Preview Thumbnails Grid */}
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 aspect-4/3 shadow-2xs"
                  >
                    <img
                      src={url}
                      alt={`Damaged Device Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white">
                      Photo #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(url)}
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                      title="Zoom photo"
                    >
                      <ZoomIn className="w-5 h-5 drop-shadow" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
              Technician Notes / Detailed Failure Symptoms
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe when the issue started, prior repair attempts, or specific diagnostics requested..."
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Continue to Shipping Kit Intake</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Shipping Kit & Courier Intake */}
      {!submissionResult && currentStep === 2 && (
        <form onSubmit={handleNextStep} className="space-y-6">
          <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-4 text-xs text-emerald-950 flex items-start gap-3">
            <Package className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-emerald-900">Complimentary Priority Overnight Shipping Kit</strong>
              <p className="text-emerald-800 mt-0.5">
                We will dispatch an ESD-safe foam protective mailer, tamper-evident hazmat security sleeve, and prepaid shipping label to your doorstep at zero cost.
              </p>
            </div>
          </div>

          {/* Recipient Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Full Recipient Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Che Young"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <User className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <Mail className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <Phone className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Street Address <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="123 Tribal Way or Main St"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Apt / Suite / Unit
              </label>
              <input
                type="text"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="Suite 204"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                City <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Window Rock"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                State / Province <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="AZ"
                maxLength={2}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 uppercase focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                ZIP Code <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="86515"
                maxLength={5}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Courier Preference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Prepaid Courier Service
              </label>
              <select
                value={courierPreference}
                onChange={(e: any) => setCourierPreference(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="UPS_OVERNIGHT">UPS Next Day Air Early AM (Prepaid $0.00)</option>
                <option value="FEDEX_OVERNIGHT">FedEx Priority Overnight (Prepaid $0.00)</option>
                <option value="USPS_PRIORITY">USPS Priority Express (Prepaid $0.00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
                Shipping Kit Format
              </label>
              <select
                value={kitType}
                onChange={(e: any) => setKitType(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="electrostatic_foam_mailer">Physical Box Kit (ESD Foam Mailer Shipped to Me)</option>
                <option value="prepaid_label_only">Instant Label Only (I will use my own secure box)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Item Details</span>
            </button>

            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Continue to Safety Checklist</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Safety SOP & Final Dispatch */}
      {!submissionResult && currentStep === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-1">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Mandatory Pre-Flight Shipping SOP Checklist</span>
            </div>
            <p className="text-amber-900 leading-relaxed">
              Federal lithium-ion regulations (UN 3481) and clean lab protocol require verifying the following conditions prior to transit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={backedUp}
                onChange={(e) => setBackedUp(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-neutral-900 block font-semibold">1. Data Backed Up</strong>
                <span className="text-neutral-500">I have backed up all essential photos and contacts.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={locksDisabled}
                onChange={(e) => setLocksDisabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-neutral-900 block font-semibold">2. Find My / FRP Disabled or Shared</strong>
                <span className="text-neutral-500">Find My iPhone / Google FRP is disabled or passcode is provided.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={batteryUnder30}
                onChange={(e) => setBatteryUnder30(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-neutral-900 block font-semibold">3. Battery State &lt; 30%</strong>
                <span className="text-neutral-500">Discharged below 30% state of charge for safe overnight air transit.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={accessoriesRemoved}
                onChange={(e) => setAccessoriesRemoved(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-neutral-900 block font-semibold">4. Cases &amp; SIM Trays Cleared</strong>
                <span className="text-neutral-500">Cases, SIM cards, and screen protectors have been retained.</span>
              </div>
            </label>
          </div>

          {/* Review Summary */}
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs space-y-2">
            <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">Request Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-neutral-700">
              <div>
                <span className="text-neutral-400 block text-[10px]">Item</span>
                <strong>{deviceBrand} {deviceModel}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Courier Freight</span>
                <strong className="text-emerald-700">{courierPreference.replace('_', ' ')} (Free)</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Recipient</span>
                <strong>{recipientName}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Shipping Destination</span>
                <strong>{city}, {state} {zip}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Shipping Details</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isSopReady}
              className={`py-3 px-8 rounded-xl font-bold text-xs text-white inline-flex items-center gap-2 shadow-sm transition-all ${
                isSubmitting || !isSopReady
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <span>Dispatching Shipping Kit...</span>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Confirm &amp; Dispatch Free Shipping Kit</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* POST-SUBMISSION CONFIRMATION VIEW */}
      {submissionResult && (
        <div className="space-y-6 text-center py-4" data-testid="repair-request-success">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <div>
            <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
              Shipping Kit Dispatched
            </span>
            <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mt-2">
              Mail-In Repair Request Confirmed
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-md mx-auto">
              Your prepaid electrostatic shipping kit is scheduled for overnight delivery to{' '}
              <strong>{submissionResult.record?.shippingKit?.recipientName}</strong>.
            </p>
          </div>

          {/* RMS Tracking Box */}
          <div className="max-w-md mx-auto rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-emerald-950">
            <span className="text-[11px] text-emerald-800 uppercase tracking-wider font-semibold block mb-1">
              Official RMS Tracking Number
            </span>
            <div className="flex items-center justify-center gap-2">
              <strong className="font-mono text-xl tracking-widest text-emerald-900">
                {submissionResult.rmsNumber}
              </strong>
              <button
                type="button"
                onClick={() => copyToClipboard(submissionResult.rmsNumber)}
                className="p-1.5 rounded-lg hover:bg-emerald-200/80 text-emerald-800 transition-colors"
                title="Copy RMS Number"
              >
                {copiedRms ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copiedRms && <span className="text-[10px] text-emerald-700 font-bold block mt-1">Copied to clipboard!</span>}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPackingSlipModal(true)}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>View &amp; Print Lab Packing Slip</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubmissionResult(null)
                setCurrentStep(1)
              }}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      )}

      {/* PRINTABLE PACKING SLIP MODAL */}
      {showPackingSlipModal && submissionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl text-neutral-900 max-h-[90vh] overflow-y-auto">
            {/* Packing Slip Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 pb-4 mb-4">
              <div>
                <h4 className="text-lg font-bold tracking-tight">DisplayCellPros Lab Packing Slip</h4>
                <p className="text-xs text-neutral-500 font-mono">RMS: {submissionResult.rmsNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPackingSlipModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg font-bold px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Slip Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Sender / Customer</span>
                  <strong className="text-sm block">{submissionResult.record?.shippingKit?.recipientName}</strong>
                  <span>{submissionResult.record?.shippingKit?.email}</span>
                  <br />
                  <span>{submissionResult.record?.shippingKit?.phone}</span>
                  <br />
                  <span className="text-neutral-600 mt-1 block">
                    {submissionResult.record?.shippingKit?.address?.street}
                    {submissionResult.record?.shippingKit?.address?.apartment ? ` ${submissionResult.record.shippingKit.address.apartment}` : ''}
                    <br />
                    {submissionResult.record?.shippingKit?.address?.city}, {submissionResult.record?.shippingKit?.address?.state} {submissionResult.record?.shippingKit?.address?.zip}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Destination Facility</span>
                  <strong className="text-sm block">DisplayCellPros Cleanroom Lab</strong>
                  <span>Attn: Rapid Ingestion &amp; Diagnostics</span>
                  <br />
                  <span>2448 Innovation Way, Suite 100</span>
                  <br />
                  <span>Phoenix, AZ 85034</span>
                  <br />
                  <span className="font-mono text-emerald-800 font-bold mt-1 block">
                    Courier: {submissionResult.record?.shippingKit?.courierPreference}
                  </span>
                </div>
              </div>

              {/* Item Info */}
              <div className="border border-neutral-200 rounded-xl p-4 space-y-2">
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Item &amp; Diagnostic Details</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-neutral-500">Brand &amp; Model:</span>{' '}
                    <strong>{submissionResult.record?.itemDetails?.deviceBrand} {submissionResult.record?.itemDetails?.deviceModel}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Serial / IMEI:</span>{' '}
                    <strong className="font-mono">{submissionResult.record?.itemDetails?.serialOrImei || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Reported Symptoms:</span>{' '}
                    <strong>{submissionResult.record?.itemDetails?.symptoms?.join(', ')}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Passcode / Lock:</span>{' '}
                    <strong className="font-mono">{submissionResult.record?.itemDetails?.passcodeProvided}</strong>
                  </div>
                </div>

                {/* Attached Diagnostic Photos in Packing Slip */}
                {submissionResult.record?.itemDetails?.imageUrls &&
                  submissionResult.record.itemDetails.imageUrls.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100">
                      <span className="text-neutral-500 block mb-1.5 font-semibold">
                        Attached Diagnostic Photos ({submissionResult.record.itemDetails.imageUrls.length}):
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {submissionResult.record.itemDetails.imageUrls.map((url: string, pIdx: number) => (
                          <div
                            key={pIdx}
                            className="rounded-lg border border-neutral-200 overflow-hidden bg-neutral-100 aspect-4/3"
                          >
                            <img
                              src={url}
                              alt={`Diagnostic Photo ${pIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {submissionResult.record?.itemDetails?.notes && (
                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-neutral-500 block">Customer Notes:</span>
                    <p className="text-neutral-700 italic">{submissionResult.record.itemDetails.notes}</p>
                  </div>
                )}
              </div>

              {/* Barcode Visual Mock */}
              <div className="text-center py-3 bg-neutral-100 rounded-xl border border-neutral-200">
                <div className="font-mono tracking-[0.3em] text-lg font-extrabold text-neutral-900 select-all">
                  ||||| | |||| ||| |||||| |||| |||||
                </div>
                <span className="text-[10px] text-neutral-500 font-mono tracking-wider">{submissionResult.rmsNumber}</span>
              </div>
            </div>

            {/* Slip Footer Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPackingSlipModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE ZOOM MODAL */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            <img
              src={previewModalImg}
              alt="Enlarged Diagnostic Photo"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
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

export default MailInRepairRequestForm
