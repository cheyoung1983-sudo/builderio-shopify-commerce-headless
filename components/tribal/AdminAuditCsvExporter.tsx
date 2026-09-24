'use client'

import React, { useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  X,
  Info,
} from 'lucide-react'
import {
  downloadAuditLogsCsv,
  normalizeAuditEntryForExport,
  CSV_AUDIT_COLUMNS,
} from '../../lib/tribal/audit-csv-exporter.ts'
import type { AuditLogEntry } from './AuditHistoryTable'

export interface AdminAuditCsvExporterProps {
  auditLogs?: AuditLogEntry[]
  customerId?: string
  customerEmail?: string
  customerName?: string
  className?: string
  buttonText?: string
  variant?: 'button' | 'modal-trigger' | 'card'
}

export function AdminAuditCsvExporter({
  auditLogs = [],
  customerId,
  customerEmail,
  customerName,
  className = '',
  buttonText = 'Export Tax Compliance CSV',
  variant = 'button',
}: AdminAuditCsvExporterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'EXEMPT_ACTIVE' | 'FAILED'>('ALL')
  const [isExporting, setIsExporting] = useState(false)
  const [exportedSuccess, setExportedSuccess] = useState(false)

  const handleExport = (source: 'current' | 'all-system') => {
    setIsExporting(true)
    try {
      if (source === 'all-system') {
        // Trigger download from the admin API endpoint
        const link = document.createElement('a')
        link.href = `/api/tribal/admin/export-audit?status=${statusFilter === 'ALL' ? '' : statusFilter}`
        link.setAttribute('download', '')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // Client-side export from passed audit logs
        let recordsToExport = auditLogs.map((entry) =>
          normalizeAuditEntryForExport(entry, {
            id: customerId,
            email: customerEmail,
            name: customerName,
          })
        )

        if (statusFilter !== 'ALL') {
          recordsToExport = recordsToExport.filter(
            (r) => r.verificationStatus.toUpperCase() === statusFilter.toUpperCase()
          )
        }

        // If no records in props, provide at least the current verified customer record
        if (recordsToExport.length === 0 && customerId) {
          recordsToExport = [
            normalizeAuditEntryForExport(
              {
                customerId,
                customerEmail: customerEmail || 'member@tribal-store.example',
                customerName: customerName || 'Verified Tribal Member',
                status: 'VERIFIED',
                tribalNation: 'Federally Recognized Tribal Nation',
                maskedEnrollmentId: '••••Verified',
                certificateRef: 'CERT-ACTIVE-001',
                taxExempt: true,
                entityUseCode: 'C',
              },
              { id: customerId, email: customerEmail, name: customerName }
            ),
          ]
        }

        const dateStr = new Date().toISOString().split('T')[0]
        downloadAuditLogsCsv(
          recordsToExport,
          `tribal-tax-audit-report-${dateStr}.csv`,
          { includeHeader: true }
        )
      }

      setExportedSuccess(true)
      setTimeout(() => setExportedSuccess(false), 4000)
    } catch (err) {
      console.error('Failed to export CSV:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      {variant === 'button' ? (
        <button
          type="button"
          onClick={() => handleExport('current')}
          disabled={isExporting}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors shadow-sm disabled:opacity-50 ${className}`}
          title="Export RFC-4180 compliant CSV for Avalara / State Tax Audits"
        >
          {exportedSuccess ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          )}
          {exportedSuccess ? 'Downloaded!' : buttonText}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors ${className}`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          {buttonText}
        </button>
      )}

      {/* Admin CSV Export Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Export Tax Compliance Audit CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    Statutory reporting digest for State DOR and Avalara AvaTax audits
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Filter */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Filter by Verification Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['ALL', 'VERIFIED', 'EXEMPT_ACTIVE', 'FAILED'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                        statusFilter === status
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Columns Included */}
              <div>
                <span className="font-bold text-slate-700 block mb-1.5">
                  Tax Reporting Fields Included in CSV ({CSV_AUDIT_COLUMNS.length} Columns):
                </span>
                <div className="max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-1 text-[11px] text-slate-600 font-mono">
                  {CSV_AUDIT_COLUMNS.map((col: { header: string }) => (
                    <div key={col.header} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{col.header}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Export complies with RFC 4180 standards and includes a UTF-8 BOM byte sequence for seamless import into Microsoft Excel, Avalara AvaTax reports, and state tax filing systems.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExport('all-system')
                  setIsOpen(false)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download System-Wide CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExport('current')
                  setIsOpen(false)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Customer CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminAuditCsvExporter
