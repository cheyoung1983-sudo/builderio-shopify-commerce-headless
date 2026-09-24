'use client'

import React, { useState, useMemo } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Hash,
  Copy,
  Check,
  FileCheck,
  Search,
  Download,
  Eye,
  Calendar,
  Building2,
  Lock,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react'
import type { CustomerMetafield } from './VerificationStatusDashboard'
import { AdminAuditCsvExporter } from './AdminAuditCsvExporter'

export interface AuditLogEntry {
  id?: string
  timestamp: string
  status: 'VERIFIED' | 'FAILED' | 'REVOKED' | 'EXEMPT_ACTIVE' | 'PENDING' | string
  hash: string
  tribalNation?: string
  maskedEnrollmentId?: string
  provider?: string
  certificateRef?: string
  taxExempt?: boolean
  entityUseCode?: string
  metadata?: Record<string, any>
  customerId?: string
}

export interface AuditHistoryTableProps {
  metafields?: CustomerMetafield[]
  auditLogs?: AuditLogEntry[]
  customerId?: string
  className?: string
  title?: string
  description?: string
}

export function AuditHistoryTable({
  metafields = [],
  auditLogs,
  customerId,
  className = '',
  title = 'Verification Audit History',
  description = 'Read-only immutable statutory compliance audit trail retrieved from Shopify customer metafields.',
}: AuditHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Parse and normalize audit logs from metafields or direct prop
  const entries: AuditLogEntry[] = useMemo(() => {
    if (auditLogs && auditLogs.length > 0) {
      return auditLogs
    }

    const metafieldMap = new Map<string, string>()
    for (const m of metafields) {
      if (m && m.key) {
        metafieldMap.set(m.key, m.value)
      }
    }

    const auditLogJson = metafieldMap.get('tribal_audit_log')
    const hash = metafieldMap.get('tribal_verification_hash')
    const timestamp = metafieldMap.get('tribal_verified_at')
    const status = metafieldMap.get('tribal_verification_status')

    const parsedList: AuditLogEntry[] = []

    if (auditLogJson) {
      try {
        const parsed = JSON.parse(auditLogJson)
        if (Array.isArray(parsed)) {
          return parsed.map((item, index) => ({
            id: item.id || `entry-${index}`,
            timestamp: item.timestamp || new Date().toISOString(),
            status: item.status || 'VERIFIED',
            hash: item.hash || hash || 'N/A',
            tribalNation: item.tribalNation,
            maskedEnrollmentId: item.maskedEnrollmentId,
            provider: item.provider || 'sheerid',
            certificateRef: item.certificateRef,
            taxExempt: item.taxExempt ?? true,
            entityUseCode: item.entityUseCode || 'C',
            metadata: item.metadata || {},
            customerId: item.customerId || customerId,
          }))
        } else if (typeof parsed === 'object' && parsed !== null) {
          parsedList.push({
            id: 'entry-0',
            timestamp: parsed.timestamp || timestamp || new Date().toISOString(),
            status: parsed.status || status || 'VERIFIED',
            hash: parsed.hash || hash || 'N/A',
            tribalNation: parsed.tribalNation,
            maskedEnrollmentId: parsed.maskedEnrollmentId,
            provider: parsed.provider || 'sheerid',
            certificateRef: parsed.certificateRef,
            taxExempt: parsed.taxExempt ?? true,
            entityUseCode: parsed.entityUseCode || 'C',
            metadata: parsed.metadata || {},
            customerId: parsed.customerId || customerId,
          })
        }
      } catch {
        // Fall through to raw fields
      }
    }

    if (parsedList.length === 0 && (hash || timestamp || status)) {
      parsedList.push({
        id: 'entry-fallback',
        timestamp: timestamp || new Date().toISOString(),
        status: status || 'VERIFIED',
        hash: hash || 'N/A',
        tribalNation: metafieldMap.get('tribal_nation') || 'Federally Recognized Tribal Nation',
        maskedEnrollmentId: metafieldMap.get('tribal_enrollment_id_masked') || '••••Verified',
        provider: 'sheerid',
        certificateRef: metafieldMap.get('tribal_certificate_ref'),
        taxExempt: true,
        entityUseCode: 'C',
        customerId,
      })
    }

    return parsedList
  }, [metafields, auditLogs, customerId])

  // Filter entries based on search term
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries
    const lower = searchTerm.toLowerCase()
    return entries.filter(
      (e) =>
        e.tribalNation?.toLowerCase().includes(lower) ||
        e.status?.toLowerCase().includes(lower) ||
        e.hash?.toLowerCase().includes(lower) ||
        e.certificateRef?.toLowerCase().includes(lower) ||
        e.provider?.toLowerCase().includes(lower) ||
        e.maskedEnrollmentId?.toLowerCase().includes(lower)
    )
  }, [entries, searchTerm])

  const handleCopyHash = (hash: string) => {
    if (!hash || hash === 'N/A') return
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const handleDownloadAuditJson = () => {
    const jsonString = JSON.stringify(entries, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tribal-audit-trail-${customerId || 'customer'}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase()
    if (s === 'VERIFIED' || s === 'EXEMPT_ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          {status}
        </span>
      )
    }
    if (s === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          {status}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <ShieldAlert className="w-3.5 h-3.5" />
        {status}
      </span>
    )
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5 ${className}`}>
      {/* Header with Search & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              {title}
            </h3>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-semibold">
              {entries.length} {entries.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {entries.length > 0 && (
            <>
              <AdminAuditCsvExporter
                auditLogs={entries}
                customerId={customerId}
                buttonText="Export CSV"
              />
              <button
                type="button"
                onClick={handleDownloadAuditJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-sm"
                title="Download full JSON compliance audit digest"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Export JSON
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter / Search Bar if records exist */}
      {entries.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Nation, Status, or Hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>
      )}

      {/* Read-Only Table */}
      {filteredEntries.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Verification Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tribal Nation & Roll ID</th>
                <th className="py-3 px-4">Tax Exemption</th>
                <th className="py-3 px-4">Certificate Ref</th>
                <th className="py-3 px-4">SHA-256 Audit Digest</th>
                <th className="py-3 px-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry, idx) => {
                const rowId = entry.id || `row-${idx}`
                const isExpanded = expandedRowId === rowId
                const isHashCopied = copiedHash === entry.hash

                return (
                  <React.Fragment key={rowId}>
                    <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-slate-50/60' : ''}`}>
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(entry.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block ml-5">
                          {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'short',
                          })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(entry.status)}
                      </td>

                      {/* Tribal Nation & Roll ID */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {entry.tribalNation || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {entry.maskedEnrollmentId || '••••Verified'}
                        </div>
                      </td>

                      {/* Tax Exemption */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.taxExempt ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Code {entry.entityUseCode || 'C'} (Exempt)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">Standard (Taxable)</span>
                        )}
                      </td>

                      {/* Certificate Ref */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.certificateRef ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <FileCheck className="w-3 h-3 text-emerald-600" />
                            {entry.certificateRef}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">-</span>
                        )}
                      </td>

                      {/* Hash */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <code
                            className="text-[11px] font-mono bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 cursor-pointer max-w-[120px] sm:max-w-[140px] truncate"
                            title={entry.hash}
                            onClick={() => handleCopyHash(entry.hash)}
                          >
                            {entry.hash.length > 16 ? `${entry.hash.substring(0, 16)}...` : entry.hash}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(entry.hash)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Copy full SHA-256 hash"
                          >
                            {isHashCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Toggle JSON */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setExpandedRowId(isExpanded ? null : rowId)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          {isExpanded ? 'Hide' : 'Inspect'}
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable JSON Inspector */}
                    {isExpanded && (
                      <tr className="bg-slate-900 text-slate-100">
                        <td colSpan={7} className="p-4 font-mono text-xs overflow-x-auto">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Hash className="w-3 h-3 text-indigo-400" />
                              Full Cryptographic Audit Record Payload
                            </span>
                            <span className="text-[10px] text-indigo-400 bg-slate-800 px-2 py-0.5 rounded">
                              Provider: {entry.provider || 'sheerid'}
                            </span>
                          </div>
                          <pre className="text-slate-300 text-[11px] whitespace-pre-wrap">
                            {JSON.stringify(entry, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
          <Lock className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            No Verification Audit Records Found
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once your tribal member enrollment is verified and synced to Shopify customer metafields, timestamped cryptographic audit events will appear here for compliance review.
          </p>
        </div>
      )}
    </div>
  )
}

export default AuditHistoryTable
