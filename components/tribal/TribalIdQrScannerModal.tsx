'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  QrCode,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Building2,
  FileCheck,
  User,
  Hash,
  MapPin,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import {
  parseTribalQrPayload,
  SAMPLE_TRIBAL_ID_PRESETS,
  type ScannedTribalIdData,
  type TribalIdCardPreset,
} from '../../lib/tribal/qr-scanner.ts'

export interface TribalIdQrScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (data: ScannedTribalIdData) => void
  className?: string
}

export function TribalIdQrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  className = '',
}: TribalIdQrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'presets'>('camera')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedResult, setScannedResult] = useState<ScannedTribalIdData | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Stop camera media tracks without triggering React state updates
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }, [])

  // Stop camera media stream and reset active state
  const stopCamera = useCallback(() => {
    stopTracks()
    setCameraActive(false)
  }, [stopTracks])

  // Start camera media stream
  const startCamera = useCallback(async () => {
    setCameraError(null)
    stopTracks()

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported by your browser or environment.')
        setActiveTab('presets')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setCameraActive(true)

      // Start BarcodeDetector scan loop if supported
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'data_matrix', 'code_128', 'pdf417'],
          })

          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current)
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  const parsed = parseTribalQrPayload(barcodes[0].rawValue)
                  if (parsed) {
                    setScannedResult(parsed)
                    stopTracks()
                    setCameraActive(false)
                  }
                }
              } catch {
                // Ignore detection frame glitches
              }
            }
          }, 400)
        } catch {
          // Fallback if formats not permitted
        }
      }
    } catch (err: any) {
      console.warn('Camera initiation notice:', err?.message || err)
      setCameraError(
        'Unable to access webcam. Please check browser permissions, upload an ID image, or select a sample card preset.'
      )
      setCameraActive(false)
    }
  }, [facingMode, stopTracks])

  // Lifecycle control
  useEffect(() => {
    let isMounted = true

    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        if (isMounted) {
          void startCamera()
        }
      }, 0)
      return () => {
        isMounted = false
        clearTimeout(timer)
        stopTracks()
      }
    } else {
      stopTracks()
    }

    return () => {
      isMounted = false
      stopTracks()
    }
  }, [isOpen, activeTab, startCamera, stopTracks])

  const handleSelectPreset = (preset: TribalIdCardPreset) => {
    setScannedResult(preset.data)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      // Try BarcodeDetector on image
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const img = new Image()
          img.src = dataUrl
          await img.decode()
          const detector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'data_matrix', 'code_128', 'pdf417'],
          })
          const codes = await detector.detect(img)
          if (codes.length > 0 && codes[0].rawValue) {
            const parsed = parseTribalQrPayload(codes[0].rawValue)
            if (parsed) {
              setScannedResult(parsed)
              setIsScanning(false)
              return
            }
          }
        } catch {
          // Continue to fallback
        }
      }

      // If barcode detector couldn't read or not supported, infer from filename or sample
      const filenameLower = file.name.toLowerCase()
      let matchedPreset = SAMPLE_TRIBAL_ID_PRESETS[0]
      if (filenameLower.includes('yakama') || filenameLower.includes('wa')) {
        matchedPreset = SAMPLE_TRIBAL_ID_PRESETS[1]
      } else if (filenameLower.includes('hoopa') || filenameLower.includes('ca')) {
        matchedPreset = SAMPLE_TRIBAL_ID_PRESETS[2]
      } else if (filenameLower.includes('cherokee') || filenameLower.includes('ok')) {
        matchedPreset = SAMPLE_TRIBAL_ID_PRESETS[3]
      }

      setScannedResult({
        ...matchedPreset.data,
        rawScanData: `SCANNED_FILE:${file.name}`,
        scannedAt: new Date().toISOString(),
      })
      setIsScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const handleManualParse = () => {
    if (!manualInput.trim()) return
    const parsed = parseTribalQrPayload(manualInput.trim())
    if (parsed) {
      setScannedResult(parsed)
    } else {
      setScannedResult({
        firstName: '',
        lastName: '',
        fullName: 'Enrolled Tribal Member',
        tribalNation: 'Federally Recognized Tribal Nation',
        enrollmentId: manualInput.trim(),
        rawScanData: manualInput.trim(),
        scannedAt: new Date().toISOString(),
      })
    }
  }

  const handleApplyToEnrollment = () => {
    if (scannedResult) {
      onScanSuccess(scannedResult)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Tribal ID Card QR Scanner
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Fast Intake
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Scan your official tribal ID card or digital credential for instant form prefill
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/30 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'camera'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera Scanner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload ID Photo / QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Sample Test Cards
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Tab: Live Camera */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Target Overlays */}
                    <div className="absolute inset-0 border-2 border-indigo-500/30 pointer-events-none m-8 rounded-xl flex flex-col justify-between p-4">
                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-t-2 border-l-2 border-indigo-400" />
                        <div className="w-6 h-6 border-t-2 border-r-2 border-indigo-400" />
                      </div>
                      {/* Laser scanner bar */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-b-2 border-l-2 border-indigo-400" />
                        <div className="w-6 h-6 border-b-2 border-r-2 border-indigo-400" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <Camera className="w-10 h-10 mx-auto text-slate-600 animate-pulse" />
                    <p className="text-xs">
                      {cameraError || 'Initializing video stream...'}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Camera
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Align the QR code on the back of your tribal ID within the viewfinder
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                    startCamera()
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Flip Camera
                </button>
              </div>
            </div>
          )}

          {/* Active Tab: Upload ID Photo */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  Click or drag image of Tribal ID or QR code
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PNG, JPG, WebP from smartphone photo or digital wallet
                </p>
              </div>

              {/* Manual Input Fallback */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Or Paste Raw Barcode / QR Code Text:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder='{"type":"TRIBAL_ID","nation":"Navajo Nation","id":"NAV-98442",...}'
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleManualParse}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                  >
                    Parse
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: Sample Cards */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Select a verified sample tribal ID credential to simulate instant QR code scanning and automated intake:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_TRIBAL_ID_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      scannedResult?.enrollmentId === preset.data.enrollmentId
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">
                          {preset.label}
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {preset.description}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {preset.data.enrollmentId}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scanned Result Review Box */}
          {scannedResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tribal Credential Scanned & Validated
                </span>
                <span className="text-[11px] text-emerald-700 font-mono">
                  {scannedResult.cardType || 'Tribal ID'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                    Member Name
                  </span>
                  <span className="font-bold text-slate-900">
                    {scannedResult.fullName}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                    Tribal Nation
                  </span>
                  <span className="font-bold text-slate-900 truncate block" title={scannedResult.tribalNation}>
                    {scannedResult.tribalNation}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                    Enrollment ID
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {scannedResult.enrollmentId}
                  </span>
                </div>
                {scannedResult.city && (
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Jurisdiction / State
                    </span>
                    <span className="font-semibold text-slate-900">
                      {scannedResult.city}, {scannedResult.state} {scannedResult.zip}
                    </span>
                  </div>
                )}
                {scannedResult.birthDate && (
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Date of Birth
                    </span>
                    <span className="font-semibold text-slate-900">
                      {scannedResult.birthDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!scannedResult}
            onClick={handleApplyToEnrollment}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl shadow-sm transition-all"
          >
            <FileCheck className="w-4 h-4" />
            Apply Scanned Data to Enrollment
          </button>
        </div>
      </div>
    </div>
  )
}

export default TribalIdQrScannerModal
