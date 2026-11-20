'use client'

import React, { useState } from 'react'
import {
  Camera,
  Search,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Sun,
  Maximize,
  Eye,
  Smartphone,
  RefreshCw,
} from 'lucide-react'
import { PERSONA_SELFIE_CHECKS, PersonaSelfieCheckDefinition } from '../../lib/persona/selfie-checks'
import { getRemediationTip } from '../../lib/persona/remediation-tips'
import { VerificationStatusBadge, VerificationStatusType } from './VerificationStatusBadge'

export interface SelfieCheckResultItem {
  checkName: string
  status: 'passed' | 'failed' | 'requires_retry' | 'pending'
  reasonCode?: string
  details?: string
}

export interface SelfieChecksInspectorProps {
  checkResults?: SelfieCheckResultItem[]
  className?: string
  initialCheckSlug?: string
}

export function SelfieChecksInspector({
  checkResults,
  className = '',
  initialCheckSlug,
}: SelfieChecksInspectorProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'dictionary'>(
    checkResults && checkResults.length > 0 ? 'results' : 'dictionary'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSlug, setSelectedSlug] = useState<string>(initialCheckSlug || 'selfie_liveness_detection')

  const checksList = Object.values(PERSONA_SELFIE_CHECKS)

  const filteredChecks = checksList.filter((check) => {
    const term = searchTerm.toLowerCase()
    return (
      check.name.toLowerCase().includes(term) ||
      check.slug.toLowerCase().includes(term) ||
      check.category.toLowerCase().includes(term) ||
      check.description.toLowerCase().includes(term)
    )
  })

  const activeCheck: PersonaSelfieCheckDefinition | undefined =
    PERSONA_SELFIE_CHECKS[selectedSlug] || filteredChecks[0]

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Lighting & Exposure':
        return <Sun className="w-4 h-4 text-amber-500 shrink-0" />
      case 'Positioning & Pose':
        return <Maximize className="w-4 h-4 text-indigo-500 shrink-0" />
      case 'PPE & Glasses':
        return <Eye className="w-4 h-4 text-purple-500 shrink-0" />
      default:
        return <Smartphone className="w-4 h-4 text-blue-500 shrink-0" />
    }
  }

  return (
    <div className={`p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-5 ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Persona Selfie Checks & Remediation Inspector</h3>
            <p className="text-xs text-neutral-500">
              Categorized check statuses, failure reason codes, and user remediation guidance
            </p>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center p-1 bg-neutral-100 rounded-xl">
          {checkResults && checkResults.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'results' ? 'bg-white text-purple-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Live Check Results ({checkResults.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('dictionary')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'dictionary' ? 'bg-white text-purple-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Checks Dictionary Explorer
          </button>
        </div>
      </div>

      {/* Tab 1: Live Verification Check Results & Remediation Cards */}
      {activeTab === 'results' && checkResults && checkResults.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Verification Check Breakdown:
          </h4>

          <div className="space-y-3">
            {checkResults.map((item, index) => {
              const checkDef = PERSONA_SELFIE_CHECKS[item.checkName]
              const checkTitle = checkDef ? checkDef.name : item.checkName
              const tip = getRemediationTip(item.reasonCode)
              const isFailedOrRetry = item.status === 'failed' || item.status === 'requires_retry'

              return (
                <div
                  key={`${item.checkName}-${index}`}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.status === 'passed'
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : item.status === 'requires_retry'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-red-50/50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900">{checkTitle}</span>
                        <code className="text-[11px] bg-neutral-200/80 text-neutral-700 px-2 py-0.5 rounded font-mono">
                          {item.checkName}
                        </code>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1">
                        {checkDef?.description || item.details || 'Verification check evaluation.'}
                      </p>
                    </div>

                    <VerificationStatusBadge status={item.status as VerificationStatusType} />
                  </div>

                  {/* Remediation Action Card for Retry / Failure */}
                  {isFailedOrRetry && (
                    <div className="mt-3.5 p-3.5 bg-white border border-amber-200 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(tip.category)}
                          <span className="text-xs font-bold text-amber-900">{tip.title}</span>
                        </div>
                        {item.reasonCode && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-2 py-0.5 rounded">
                            Reason: {item.reasonCode}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-800 font-medium pl-6">
                        <strong>Action Required:</strong> {tip.actionStep}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 pl-6 bg-amber-50 p-2 rounded-lg">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>Pro Tip:</strong> {tip.proTip}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Checks Dictionary Explorer */}
      {activeTab === 'dictionary' && (
        <div className="space-y-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search selfie checks or reason codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Master list */}
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredChecks.map((check) => {
                const isSelected = activeCheck?.slug === check.slug
                return (
                  <button
                    key={check.slug}
                    type="button"
                    onClick={() => setSelectedSlug(check.slug)}
                    className={`w-full text-left p-3 rounded-2xl transition-all border ${
                      isSelected
                        ? 'bg-purple-50/80 border-purple-200 text-purple-950 font-semibold shadow-2xs'
                        : 'bg-neutral-50/60 hover:bg-neutral-100/80 border-neutral-200/60 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate">{check.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${
                          check.category === 'Fraud'
                            ? 'bg-red-100 text-red-800'
                            : check.category === 'User action required'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {check.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 line-clamp-1 mt-1 font-normal">
                      {check.description}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Detail panel */}
            {activeCheck && (
              <div className="md:col-span-2 p-5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-neutral-900">{activeCheck.name}</h4>
                      <code className="text-xs bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded font-mono">
                        {activeCheck.slug}
                      </code>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{activeCheck.description}</p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      activeCheck.category === 'Fraud'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {activeCheck.category}
                  </span>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Failure Reason Codes & Remediation Guidance:
                  </h5>
                  <div className="space-y-2.5">
                    {activeCheck.reasons.map((r) => {
                      const tip = getRemediationTip(r.code)
                      return (
                        <div
                          key={r.code}
                          className="p-3.5 bg-white border border-neutral-200 rounded-xl space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <code className="text-xs font-bold text-red-700 font-mono">{r.code}</code>
                            </div>
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-medium">
                              {tip.category}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600">{r.description}</p>

                          <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs space-y-1">
                            <p className="font-semibold text-amber-900">Suggested User Fix:</p>
                            <p className="text-amber-800">{tip.actionStep}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SelfieChecksInspector
