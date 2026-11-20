'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ShieldCheck, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'

declare global {
  interface Window {
    Persona?: any
  }
}

export interface PersonaEmbeddedFlowProps {
  referenceId: string
  fields?: Record<string, any>
  templateId?: string
  environmentId?: string
  onComplete: (data: { inquiryId: string; status: string; fields?: any }) => void
  onCancel?: () => void
  onError?: (error: any) => void
  className?: string
  autoOpen?: boolean
}

export function PersonaEmbeddedFlow({
  referenceId,
  fields,
  templateId,
  environmentId,
  onComplete,
  onCancel,
  onError,
  className = '',
  autoOpen = true,
}: PersonaEmbeddedFlowProps) {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [inquiryId, setInquiryId] = useState<string | null>(null)
  const [isSandbox, setIsSandbox] = useState<boolean>(false)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)

  const clientRef = useRef<any>(null)
  const isMountedRef = useRef<boolean>(true)

  // Cleanup Persona client on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (clientRef.current && typeof clientRef.current.destroy === 'function') {
        try {
          clientRef.current.destroy()
        } catch {
          // ignore cleanup error
        }
      }
    }
  }, [])

  // Dynamically load the Persona Web SDK
  const loadSdk = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Window unavailable'))
      if (window.Persona) return resolve(window.Persona)

      const existingScript = document.getElementById('persona-web-sdk')
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.Persona))
        return
      }

      const script = document.createElement('script')
      script.id = 'persona-web-sdk'
      script.src = 'https://cdn.withpersona.com/dist/persona-v5.4.0.js'
      script.async = true
      script.crossOrigin = 'anonymous'
      script.onload = () => resolve(window.Persona)
      script.onerror = () => reject(new Error('Failed to load Persona Web SDK script'))
      document.head.appendChild(script)
    })
  }, [])

  // Start / Resume Embedded Flow
  const startFlow = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Pre-create or fetch existing incomplete inquiry from our backend API
      const res = await fetch('/api/persona/get-or-create-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceId,
          fields,
          templateId,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `Server responded with ${res.status}`)
      }

      const initData = await res.json()
      const returnedInquiryId = initData.inquiry_id
      const sessionToken = initData.session_token
      const resolvedEnvId = environmentId || initData.environment_id || 'env_sandbox'
      const sandboxMode = Boolean(initData.is_sandbox)

      if (!isMountedRef.current) return
      setInquiryId(returnedInquiryId)
      setIsSandbox(sandboxMode)

      // In mock/sandbox mode without API keys, provide simulated verification option
      if (sandboxMode) {
        setLoading(false)
        return
      }

      // 2. Load the Web SDK
      const Persona = await loadSdk()
      if (!isMountedRef.current) return

      // Clean up any existing client before reinitializing
      if (clientRef.current && typeof clientRef.current.destroy === 'function') {
        try {
          clientRef.current.destroy()
        } catch {
          // ignore
        }
      }

      // 3. Initialize Persona Client with inquiry ID and optional session token
      const clientConfig: Record<string, any> = {
        inquiryId: returnedInquiryId,
        environmentId: resolvedEnvId,
        onReady: () => {
          if (clientRef.current) {
            clientRef.current.open()
          }
        },
        onComplete: ({ inquiryId: completedId, status, fields: returnedFields }: any) => {
          if (!isMountedRef.current) return
          setIsCompleted(true)
          setLoading(false)
          onComplete({ inquiryId: completedId, status, fields: returnedFields })
          if (clientRef.current && typeof clientRef.current.destroy === 'function') {
            clientRef.current.destroy()
          }
        },
        onCancel: ({ inquiryId: cancelledId }: any) => {
          if (!isMountedRef.current) return
          setLoading(false)
          if (onCancel) onCancel()
        },
        onError: (err: any) => {
          if (!isMountedRef.current) return
          setLoading(false)
          setError(err?.message || 'Persona verification encountered an error')
          if (onError) onError(err)
        },
      }

      if (sessionToken) {
        clientConfig.sessionToken = sessionToken
      }

      const client = new Persona.Client(clientConfig)
      clientRef.current = client
      setLoading(false)
    } catch (err: any) {
      if (!isMountedRef.current) return
      setLoading(false)
      setError(err?.message || 'Failed to initialize verification')
      if (onError) onError(err)
    }
  }, [referenceId, fields, templateId, environmentId, loadSdk, onComplete, onCancel, onError])

  // Verification initiated manually or via action


  // Sandbox simulation handler
  const handleSimulatePass = () => {
    setIsCompleted(true)
    onComplete({
      inquiryId: inquiryId || `inq_sandbox_${Date.now()}`,
      status: 'approved',
      fields: fields || {},
    })
  }

  return (
    <div className={`p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">Persona Identity Verification</h4>
          <p className="text-xs text-neutral-500">Secure embedded verification module</p>
        </div>
      </div>

      {loading && (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-neutral-600">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
          <span className="text-xs font-medium">Connecting to Persona Embedded Flow...</span>
        </div>
      )}

      {error && (
        <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Verification Error</p>
            <p className="mt-0.5">{error}</p>
            <button
              type="button"
              onClick={startFlow}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Identity verification completed successfully!</span>
        </div>
      )}

      {isSandbox && !isCompleted && !loading && (
        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-neutral-700">Sandbox / Pre-create Demo Mode</span>
            <span className="font-mono text-[11px] text-neutral-500">{inquiryId}</span>
          </div>
          <p className="text-neutral-500">
            Inquiry pre-created on backend. In production with live Persona API credentials, the embedded modal opens automatically.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSimulatePass}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition"
            >
              Simulate Verified (Sandbox)
            </button>
            <button
              type="button"
              onClick={startFlow}
              className="px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 rounded-lg font-medium transition"
            >
              Restart Flow
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonaEmbeddedFlow
