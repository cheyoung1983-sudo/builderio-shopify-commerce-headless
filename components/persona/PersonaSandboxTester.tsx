'use client'

import React, { useState } from 'react'
import { Play, AlertCircle, RefreshCw, Cpu } from 'lucide-react'
import { VerificationStatusBadge, VerificationStatusType } from './VerificationStatusBadge'
import { useAuth } from '../../hooks/useAuth'

export interface PersonaSandboxTesterProps {
  inquiryId?: string
  onStatusUpdated?: (status: string) => void
  className?: string
}

export function PersonaSandboxTester({
  inquiryId = 'inq_sandbox_12345',
  onStatusUpdated,
  className = '',
}: PersonaSandboxTesterProps) {
  const { user: fbUser, getIdToken } = useAuth()
  const [activeInquiryId, setActiveInquiryId] = useState(inquiryId)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [simulationResult, setSimulationResult] = useState<any | null>(null)
  const [simulationError, setSimulationError] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<VerificationStatusType>('pending')

  const handleSimulate = async (action: string) => {
    setLoadingAction(action)
    setSimulationResult(null)
    setSimulationError(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (fbUser) {
        const idToken = await getIdToken()
        if (idToken) headers.Authorization = `Bearer ${idToken}`
      }
      const res = await fetch('/api/persona/simulate', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          inquiryId: activeInquiryId,
          simulateAction: action,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSimulationResult(data)
        const newStatus = data.data?.attributes?.status || data.simulation?.status || 'approved'
        setCurrentStatus(newStatus as VerificationStatusType)
        if (onStatusUpdated) {
          onStatusUpdated(newStatus)
        }
      } else {
        setSimulationError(data.error || 'Simulation action failed')
      }
    } catch (err: any) {
      setSimulationError(err.message || 'Simulation network error')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className={`p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Persona Sandbox Integration Tester</h4>
            <p className="text-[11px] text-slate-400">Simulate inquiry and verification lifecycle events</p>
          </div>
        </div>
        <VerificationStatusBadge status={currentStatus} />
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Active Inquiry ID:</label>
          <input
            type="text"
            value={activeInquiryId}
            onChange={(e) => setActiveInquiryId(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">Inquiry Lifecycle Simulate Actions:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'start_inquiry', label: 'Start Inquiry' },
              { id: 'complete_inquiry', label: 'Complete Inquiry' },
              { id: 'approve_inquiry', label: 'Approve Inquiry' },
              { id: 'decline_inquiry', label: 'Decline Inquiry' },
              { id: 'create_passed_verification', label: 'Pass Verification' },
              { id: 'create_failed_verification', label: 'Fail Verification' },
            ].map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={Boolean(loadingAction)}
                onClick={() => handleSimulate(action.id)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 border border-slate-700/50 cursor-pointer"
              >
                {loadingAction === action.id ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                )}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {simulationError && (
          <div className="mt-3 p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{simulationError}</span>
          </div>
        )}

        {simulationResult && (
          <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto">
            <div className="flex items-center justify-between text-indigo-400 mb-1 font-semibold">
              <span>Simulation Result</span>
              <span>{simulationResult.simulation?.action || 'Success'}</span>
            </div>
            <pre className="text-emerald-400">{JSON.stringify(simulationResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default PersonaSandboxTester
