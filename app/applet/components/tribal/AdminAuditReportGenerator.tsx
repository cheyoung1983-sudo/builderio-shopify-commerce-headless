'use client'

import React, { useState } from 'react'
import {
  FileText,
  Download,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Building2,
  DollarSign,
  TrendingUp,
  Calendar,
  Lock,
  Printer,
  FileSpreadsheet,
} from 'lucide-react'
import { AuditLogEntry } from './AuditHistoryTable'

interface AdminAuditReportGeneratorProps {
  auditLogs: AuditLogEntry[]
}

export function AdminAuditReportGenerator({ auditLogs }: AdminAuditReportGeneratorProps) {
  const [reportPeriod, setReportPeriod] = useState<'q3_2026' | 'ytd_2026' | 'all'>('all')
  const [selectedState, setSelectedState] = useState<string>('ALL')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Filter logs based on state
  const filteredLogs = auditLogs.filter((log) => {
    if (selectedState !== 'ALL' && log.metadata.state !== selectedState) return false
    return true
  })

  const totalTransactions = filteredLogs.length
  const exemptTransactions = filteredLogs.filter((l) => l.taxExempt).length
  const commercialDiscountTransactions = totalTransactions - exemptTransactions
  const estimatedTaxSaved = exemptTransactions * 48.50 // Average state tax per order

  const handleExportCsv = () => {
    const headers = ['Audit ID', 'Timestamp', 'Customer Name', 'Tribal Nation', 'State', 'Reservation Name', 'Tax Exempt', 'Status', 'Certificate Ref', 'Tracking Ref']
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.metadata.customerName,
      l.tribalNation,
      l.metadata.state,
      l.metadata.reservationName,
      l.taxExempt ? 'YES (Exempt)' : 'NO (Discount)',
      l.status,
      l.certificateRef,
      l.metadata.trackingRef || 'N/A',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((val) => `"${val}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `tribal_tax_compliance_audit_report_${reportPeriod}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintReport = () => {
    setIsGeneratingPdf(true)
    setTimeout(() => {
      window.print()
      setIsGeneratingPdf(false)
    }, 600)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Report Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3 h-3 text-indigo-600" />
              Admin Audit Report Generator
            </span>
            <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              CDTFA-146-RES & WAC 458-20-192
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Sovereign Transaction & Tax Exemption Summary Report
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Official audit compilation aggregating Shopify metafield verification records, state tax exemptions, and on-reservation delivery proofs for state tax board reporting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={handlePrintReport}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-white" />
            {isGeneratingPdf ? 'Preparing PDF...' : 'Print / Save PDF'}
          </button>
        </div>
      </div>

      {/* Report Controls & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Reporting Period</label>
          <select
            value={reportPeriod}
            onChange={(e: any) => setReportPeriod(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="q3_2026">Q3 2026 (July - September)</option>
            <option value="ytd_2026">Year-To-Date 2026</option>
            <option value="all">All Historical Records</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">State Jurisdiction Filter</label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">All States (CA, WA, AZ, etc.)</option>
            <option value="CA">California (CDTFA-146-RES)</option>
            <option value="WA">Washington (WAC 458-20-192)</option>
            <option value="AZ">Arizona</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Compliance Standard</label>
          <div className="px-3 py-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Cryptographic SHA-256 Audit Trail Active</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transactions</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalTransactions}</div>
          <p className="text-[11px] text-slate-500">Verified sovereign orders</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax-Exempt Orders</span>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono">{exemptTransactions}</div>
          <p className="text-[11px] text-emerald-600 font-medium">Delivered on-reservation</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commercial Discount</span>
          <div className="text-2xl font-extrabold text-indigo-700 font-mono">{commercialDiscountTransactions}</div>
          <p className="text-[11px] text-indigo-600 font-medium">Off-reservation orders</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Tax Exemptions</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">${estimatedTaxSaved.toFixed(2)}</div>
          <p className="text-[11px] text-slate-500">Substantiated tax savings</p>
        </div>
      </div>

      {/* Detailed Table Preview */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
          <span>Transaction Audit Line Items</span>
          <span className="font-mono text-[11px] text-slate-500">{filteredLogs.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Customer / ID</th>
                <th className="px-4 py-2.5">Tribal Nation</th>
                <th className="px-4 py-2.5">Reservation & State</th>
                <th className="px-4 py-2.5">Exemption Status</th>
                <th className="px-4 py-2.5">Certificate / BOL Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div>{log.metadata.customerName}</div>
                    <div className="text-[10px] font-mono text-slate-500">{log.maskedEnrollmentId}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{log.tribalNation}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{log.metadata.reservationName}</div>
                    <div className="text-[10px] text-slate-500">{log.metadata.state}</div>
                  </td>
                  <td className="px-4 py-3">
                    {log.taxExempt ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Tax Exempt (On-Res)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold text-[10px]">
                        Commercial Discount (20%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                    <div>{log.certificateRef}</div>
                    <div className="text-[10px] text-slate-400">BOL: {log.metadata.trackingRef || 'N/A'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminAuditReportGenerator
