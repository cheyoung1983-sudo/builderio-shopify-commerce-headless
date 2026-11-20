'use client'

import React, { useState } from 'react'
import {
  GitCommit,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileCode,
  Link,
  Lock,
  Radio,
  Zap,
  RotateCw,
  Sliders,
  ShieldCheck,
  UserX,
  Key,
  Layers,
  ArrowRight,
} from 'lucide-react'

export interface InquiryLifecyclePanelProps {
  className?: string
}

export function InquiryLifecyclePanel({ className = '' }: InquiryLifecyclePanelProps) {
  const [selectedPhase, setSelectedPhase] = useState<'created' | 'pending' | 'done' | 'post-inquiry'>('post-inquiry')

  return (
    <div className={`p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Persona Inquiry Lifecycle & Dynamic Flow Architecture</h3>
            <p className="text-xs text-neutral-500">
              4-Phase Model, Duplicate Prevention, Session Resumption, Template Versioning, and Transactions API
            </p>
          </div>
        </div>
      </div>

      {/* 4-Phase Lifecycle Visualizer */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
          4-Phase Inquiry Lifecycle Stages:
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Phase 1: Created */}
          <button
            type="button"
            onClick={() => setSelectedPhase('created')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedPhase === 'created'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-2xs'
                : 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">1. Created</span>
              <code className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.5 rounded">
                inquiry.created
              </code>
            </div>
            <p className="text-[11px] text-neutral-600 mt-1">
              Inquiry instantiated via API or Client SDK using <code className="font-mono text-neutral-800">itmpl_</code>.
            </p>
          </button>

          {/* Phase 2: Pending */}
          <button
            type="button"
            onClick={() => setSelectedPhase('pending')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedPhase === 'pending'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-2xs'
                : 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">2. Pending</span>
              <code className="text-[10px] bg-amber-100 text-amber-800 font-mono px-1.5 py-0.5 rounded">
                inquiry.started
              </code>
            </div>
            <p className="text-[11px] text-neutral-600 mt-1">
              End-user actively submitting documents, selfie, or details. Protected via session tokens.
            </p>
          </button>

          {/* Phase 3: Done */}
          <button
            type="button"
            onClick={() => setSelectedPhase('done')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedPhase === 'done'
                ? 'bg-neutral-100 border-neutral-400 ring-2 ring-neutral-500/20 shadow-2xs'
                : 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">3. Done</span>
              <span className="text-[10px] bg-neutral-200 text-neutral-800 font-mono px-1.5 py-0.5 rounded">
                User Finished
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 mt-1">
              User reaches Completed, Failed, or Expired screen. Flow concluded from end-user POV.
            </p>
          </button>

          {/* Phase 4: Post-Inquiry */}
          <button
            type="button"
            onClick={() => setSelectedPhase('post-inquiry')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedPhase === 'post-inquiry'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                : 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">4. Post-Inquiry</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded">
                Actionable Decision
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 mt-1">
              Automated workflows or manual review set status to Approved, Declined, or Needs Review.
            </p>
          </button>
        </div>
      </div>

      {/* Phase Details Card */}
      <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2 text-xs">
        {selectedPhase === 'created' && (
          <div>
            <h5 className="font-bold text-neutral-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-600" />
              Phase 1: Created & Prefill Field Locking
            </h5>
            <p className="text-neutral-600 mt-1">
              <strong>Best Practice:</strong> Always create inquiries server-side via API (`POST /api/v1/inquiries`). This locks sensitive prefilled customer attributes (`name-first`, `name-last`, `birthdate`) with <code className="font-mono text-neutral-800">write_once</code> schema policies so end users cannot tamper with query parameters.
            </p>
          </div>
        )}

        {selectedPhase === 'pending' && (
          <div>
            <h5 className="font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Phase 2: Pending & Session Protection
            </h5>
            <p className="text-neutral-600 mt-1">
              Once an end-user begins entering information, PII is protected behind session storage JWT tokens. Closing the browser window destroys the local session token, requiring a new session token or one-time link code to resume without losing progress.
            </p>
          </div>
        )}

        {selectedPhase === 'done' && (
          <div>
            <h5 className="font-bold text-neutral-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-neutral-700" />
              Phase 3: Done (Completed, Failed, Expired)
            </h5>
            <p className="text-neutral-600 mt-1">
              The &quot;Done&quot; phase represents the end user&apos;s completion status. Inquiries expire after 24 hours by default. Expired or abandoned inquiries can be safely resumed via <code className="font-mono text-neutral-800">POST /inquiries/:id/resume</code>.
            </p>
          </div>
        )}

        {selectedPhase === 'post-inquiry' && (
          <div>
            <h5 className="font-bold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Phase 4: Post-Inquiry Decisioning (Approved, Declined, Needs Review)
            </h5>
            <p className="text-neutral-600 mt-1">
              <strong>Actionable Statuses:</strong> Your backend systems should listen for <code className="font-mono text-emerald-800">inquiry.approved</code> and <code className="font-mono text-emerald-800">inquiry.declined</code> webhooks rather than raw completed events. This future-proofs your app when adding automated watchlist rules or manual cases review.
            </p>
          </div>
        )}
      </div>

      {/* Section: Duplicate Inquiry Prevention & Access Security */}
      <div className="p-5 bg-neutral-900 text-white rounded-2xl space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
          <UserX className="w-4 h-4 text-indigo-400" />
          <span>Duplicate Inquiry Prevention & Account Reference ID Strategy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-neutral-300">
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5">
            <span className="font-semibold text-white block">1. Reference ID Linking:</span>
            <p className="text-neutral-400 leading-relaxed">
              Always query <code className="text-indigo-300 font-mono">GET /inquiries?filter[reference-id]=UID</code> before launching Persona widget. Grouping inquiries under the customer&apos;s Shopify reference ID unifies verification accounts and blocks malicious re-attempts.
            </p>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5">
            <span className="font-semibold text-white block">2. Template Version Drift Check:</span>
            <p className="text-neutral-400 leading-relaxed">
              Compare <code className="text-indigo-300 font-mono">relationships.inquiry-template-version</code> with <code className="text-indigo-300 font-mono">relationships.latest-published-version</code>. If versions match, resume existing inquiry; if template evolved, create a new inquiry.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Key Technical Architecture Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Concept 1: One-Time Links vs Session Tokens */}
        <div className="p-4 bg-white border border-neutral-200/90 rounded-2xl space-y-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-neutral-900">
            <Link className="w-4 h-4 text-indigo-600" />
            <span>OTL vs. Session Tokens</span>
          </div>
          <p className="text-neutral-600 leading-relaxed">
            <strong>One-Time Links (OTL):</strong> Short, single-use codes (<code className="font-mono">/generate-one-time-link</code>) ideal for portable QR codes and email redirects.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            <strong>Session Tokens:</strong> JWT tokens (<code className="font-mono">/resume</code>) passed directly to Embedded SDKs (<code className="font-mono">sessionToken</code>).
          </p>
        </div>

        {/* Concept 2: Dynamic Flow Versioning */}
        <div className="p-4 bg-white border border-neutral-200/90 rounded-2xl space-y-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-neutral-900">
            <RotateCw className="w-4 h-4 text-purple-600" />
            <span>Dynamic Flow Versioning</span>
          </div>
          <p className="text-neutral-600 leading-relaxed">
            <strong><code className="font-mono text-purple-700">itmpl_</code>:</strong> Targets the latest published Dynamic Flow template version automatically.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            <strong><code className="font-mono text-purple-700">itmplv_</code>:</strong> Pins an inquiry to an unchangeable version snapshot.
          </p>
        </div>

        {/* Concept 3: Transactions API Gov ID Orchestration */}
        <div className="p-4 bg-white border border-neutral-200/90 rounded-2xl space-y-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-neutral-900">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Transactions API Silent Gov ID</span>
          </div>
          <p className="text-neutral-600 leading-relaxed">
            Supports API-first silent Government ID verification (<code className="font-mono">POST /transactions</code> with <code className="font-mono">id_front_photo</code> and <code className="font-mono">id_class</code>).
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Surfaces <code className="font-mono text-emerald-800">fallback_inquiry_id</code> if user interaction is required via <code className="font-mono text-emerald-800">pending_fallback_inquiry</code> status.
          </p>
        </div>
      </div>
    </div>
  )
}

export default InquiryLifecyclePanel
