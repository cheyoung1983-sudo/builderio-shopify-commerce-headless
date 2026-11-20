'use client'

import React, { useState } from 'react'
import { Smartphone, CheckCircle, AlertTriangle, ShieldCheck, ExternalLink, Code } from 'lucide-react'

export interface PersonaWebViewAssistantProps {
  className?: string
}

export function PersonaWebViewAssistant({ className = '' }: PersonaWebViewAssistantProps) {
  const [isWebViewMode, setIsWebViewMode] = useState<boolean>(true)
  const [copied, setCopied] = useState<boolean>(false)

  const sampleUrl = `https://inquiry.withpersona.com/verify?${isWebViewMode ? 'is-webview=true&' : ''}template-id=itmpl_tribal_id&environment-id=env_sandbox`

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sampleUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-900">Persona WebView Integration Assistant</h4>
            <p className="text-xs text-neutral-500">Configuring mobile webview & native wrapper parameters</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
          <input
            type="checkbox"
            checked={isWebViewMode}
            onChange={(e) => setIsWebViewMode(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
          />
          <span>Enable <code className="text-blue-600 font-mono">is-webview=true</code></span>
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <span className="block text-xs font-semibold text-neutral-700 mb-1">Generated Hosted Flow URL:</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={sampleUrl}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-neutral-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>iOS WKWebView Checklist</span>
            </div>
            <ul className="space-y-1.5 text-neutral-600 pl-5 list-disc">
              <li>Set <code className="text-neutral-900 font-mono">allowsInlineMediaPlayback = true</code></li>
              <li>Include <code className="text-neutral-900 font-mono">NSCameraUsageDescription</code> in Info.plist</li>
              <li>Preserve default WebKit user agent string</li>
            </ul>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Android & Frameworks Checklist</span>
            </div>
            <ul className="space-y-1.5 text-neutral-600 pl-5 list-disc">
              <li>Allowlist network requests for <code className="text-neutral-900 font-mono">*.withpersona.com/*</code></li>
              <li>Enable camera permissions in AndroidManifest.xml</li>
              <li>Prefer native SDK over WebView for optimal camera performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PersonaWebViewAssistant
