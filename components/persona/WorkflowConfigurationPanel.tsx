'use client'

import React, { useState } from 'react'
import { GitBranch, Play, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Zap, Settings } from 'lucide-react'

export interface WorkflowConfigurationPanelProps {
  className?: string
}

export function WorkflowConfigurationPanel({ className = '' }: WorkflowConfigurationPanelProps) {
  const [activeWorkflow, setActiveWorkflow] = useState<'kyc-auto' | 'high-risk-review'>('kyc-auto')

  return (
    <div className={`p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Workflow Configuration & Automation</h3>
            <p className="text-xs text-neutral-500">Inquiry trigger rules, automated decisioning, and webhook notifications</p>
          </div>
        </div>
        <button type="button" className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold">
          <Settings className="w-3 h-3" />
          Configure Triggers
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workflow Overview */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Active Automation Workflows:</h4>
          <div className="space-y-3">
            <button
              onClick={() => setActiveWorkflow('kyc-auto')}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${
                activeWorkflow === 'kyc-auto' ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-500' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-neutral-900">KYC Auto-Approval Flow</span>
              </div>
              <p className="text-xs text-neutral-600">Triggers on <code className="font-mono bg-neutral-200 px-1 rounded">inquiry.completed</code> for low-risk KYC inquiries.</p>
            </button>
            <button
              onClick={() => setActiveWorkflow('high-risk-review')}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${
                activeWorkflow === 'high-risk-review' ? 'bg-red-50/50 border-red-300 ring-1 ring-red-500' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-bold text-neutral-900">High-Risk Case Escalation</span>
              </div>
              <p className="text-xs text-neutral-600">Routes to manual review if selfie or ID checks fail security thresholds.</p>
            </button>
          </div>
        </div>

        {/* Workflow Trigger Visualizer */}
        <div className="p-4 bg-neutral-950 rounded-2xl text-white space-y-4">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Workflow Event Pipeline:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
              <Zap className="w-4 h-4 text-amber-400" />
              <code className="text-xs font-mono text-white">inquiry.completed</code>
              <ArrowRight className="w-3 h-3 text-neutral-600 ml-auto" />
            </div>
            <div className="flex items-center justify-center">
                <div className="h-6 w-px bg-neutral-700"></div>
            </div>
            <div className="flex items-center gap-2 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
              <Settings className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-neutral-200">Post-Inquiry Logic</span>
            </div>
            <div className="flex items-center justify-center">
                <div className="h-6 w-px bg-neutral-700"></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-emerald-950/50 p-3 rounded-xl border border-emerald-900 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-semibold">Approved</span>
                </div>
                <div className="flex items-center gap-2 bg-red-950/50 p-3 rounded-xl border border-red-900 text-red-300">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Declined</span>
                </div>
            </div>
          </div>
          
          <button type="button" className="w-full flex items-center justify-center gap-2 py-2 mt-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition-colors">
            <Play className="w-3 h-3" />
            Simulate Webhook Trigger
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkflowConfigurationPanel
