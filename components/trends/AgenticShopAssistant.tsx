import React, { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Zap,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

interface AgenticShopAssistantProps {
  onFilterChange?: (keyword: string) => void
  className?: string
}

export const AgenticShopAssistant: React.FC<AgenticShopAssistantProps> = ({
  onFilterChange,
  className = '',
}) => {
  const [query, setQuery] = useState('')
  const [activeWorkflow, setActiveWorkflow] = useState<{
    prompt: string
    recommendation: string
    filterTag?: string
    specsHighlight?: string
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const quickPrompts = [
    {
      label: '120Hz OLED Panels',
      query: 'Find screens with 120Hz refresh rate',
      recommendation:
        'Matched high-refresh-rate OLED assemblies with calibrated 240Hz touch response.',
      filterTag: 'OLED',
      specsHighlight: '120Hz Dynamic LTPO • 1500 Nits Peak',
    },
    {
      label: 'Samsung Galaxy Series',
      query: 'Show screens for Samsung Galaxy devices',
      recommendation:
        'Filtered OEM and compatible digitizer assemblies for Samsung Galaxy S-series.',
      filterTag: 'Samsung',
      specsHighlight: 'Frame Pre-installed • Factory Adhesive Included',
    },
    {
      label: 'OEM Spec Calibrated',
      query: 'Show factory OEM grade assemblies',
      recommendation:
        'Displaying assemblies meeting strict OEM optical transmittance and true-tone calibration.',
      filterTag: 'OEM',
      specsHighlight: 'DCI-P3 Color Gamut • Zero Dead Pixel Guarantee',
    },
  ]

  const handleRunPrompt = (promptObj: typeof quickPrompts[0]) => {
    setQuery(promptObj.query)
    setIsProcessing(true)

    setTimeout(() => {
      setActiveWorkflow({
        prompt: promptObj.query,
        recommendation: promptObj.recommendation,
        filterTag: promptObj.filterTag,
        specsHighlight: promptObj.specsHighlight,
      })
      setIsProcessing(false)
      if (onFilterChange && promptObj.filterTag) {
        onFilterChange(promptObj.filterTag)
      }
    }, 280)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setIsProcessing(true)

    setTimeout(() => {
      const qLower = query.toLowerCase()
      let tag = ''
      let specs = 'Edge Context Verified'
      let rec = `Analyzed catalog for "${query}". Contextual matches prioritized.`

      if (qLower.includes('galaxy') || qLower.includes('samsung')) {
        tag = 'Samsung'
        specs = 'Samsung Galaxy Compatible'
        rec = 'Filtered catalog for Samsung Galaxy display replacement units.'
      } else if (qLower.includes('oled')) {
        tag = 'OLED'
        specs = '100% P3 Color Gamut'
        rec = 'Filtered for genuine AMOLED / OLED display units.'
      } else if (qLower.includes('screen') || qLower.includes('lcd')) {
        tag = 'Screen'
        specs = 'High Transparency Polarizer'
        rec = 'Showing all display assemblies with glass and touch digitizer.'
      }

      setActiveWorkflow({
        prompt: query,
        recommendation: rec,
        filterTag: tag,
        specsHighlight: specs,
      })
      setIsProcessing(false)
      if (onFilterChange && tag) {
        onFilterChange(tag)
      }
    }, 280)
  }

  const handleReset = () => {
    setQuery('')
    setActiveWorkflow(null)
    if (onFilterChange) {
      onFilterChange('')
    }
  }

  return (
    <div
      id="agentic-assistant-banner"
      className={`bg-white border border-surface-stone rounded-2xl p-5 sm:p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900">
                Agentic Shopping Assistant
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Trend 04: Edge-Computed
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Conversational prompts and in-browser contextual workflow execution.
            </p>
          </div>
        </div>

        <Link
          href="/trends"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors shrink-0"
        >
          <span>Explore All 5 Web Trends</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Input and Smart Prompt Chips */}
      <div className="pt-4 space-y-3">
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask an agentic query (e.g., 'Find 120Hz OLED screens' or 'Compare OEM vs aftermarket')..."
              className="w-full px-4 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-neutral-900 placeholder:text-neutral-400"
            />
          </div>
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Thinking...' : 'Inquire'}
          </button>
        </form>

        {/* Quick Prompt Suggestions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-neutral-500">
            Suggested Prompts:
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleRunPrompt(p)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Active Workflow Status */}
        {activeWorkflow && (
          <div className="mt-3 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-950 block">
                  {activeWorkflow.recommendation}
                </span>
                {activeWorkflow.specsHighlight && (
                  <span className="text-[11px] text-emerald-800 font-mono">
                    Specs: {activeWorkflow.specsHighlight}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeWorkflow.filterTag && (
                <span className="px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[11px] font-bold">
                  Active Filter: {activeWorkflow.filterTag}
                </span>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AgenticShopAssistant
