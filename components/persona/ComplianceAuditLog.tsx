'use client'

import React, { useState } from 'react'
import { 
  FileClock, 
  Circle, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Search
} from 'lucide-react'
import { usePersonaAuditLogs } from '../../hooks/usePersonaAuditLogs'

export function ComplianceAuditLog({ className = '' }: { className?: string }) {
  const { 
    logs, 
    loading, 
    error, 
    pagination, 
    inquiryId, 
    setInquiryId, 
    next, 
    prev, 
    refresh,
    lastRefreshedAt
  } = usePersonaAuditLogs()

  const [filterInput, setFilterInput] = useState('')

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInquiryId(filterInput || undefined)
  }

  return (
    <div className={`p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
            <FileClock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900">Compliance Audit Log</h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live (30s)</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500">Secure, sanitized timeline of identity events</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <form onSubmit={handleFilterSubmit} className="relative">
            <input 
              type="text"
              placeholder="Filter by Inquiry ID..."
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 w-48"
            />
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
          </form>
          
          <button 
            onClick={refresh} 
            title="Refresh Logs"
            className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Timeline */}
      <div className="relative space-y-6 min-h-[100px]">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-neutral-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-xs">Loading audit trail...</span>
          </div>
        ) : (
          <>
            <div className="absolute left-3.5 top-2 bottom-2 w-px bg-neutral-200"></div>
            {logs.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-500">No events found.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="relative flex gap-4 pl-10 group">
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-neutral-50 border-4 border-white flex items-center justify-center transition-transform group-hover:scale-110">
                    {log.name.includes('approved') || log.name.includes('passed') ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : log.name.includes('declined') || log.name.includes('failed') ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 p-3 bg-neutral-50 rounded-xl border border-neutral-100 group-hover:border-neutral-200 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-neutral-900 font-mono tracking-tight">{log.name}</span>
                      <span className="text-[10px] text-neutral-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{log.details}</p>
                    {log.relatedId && log.relatedId !== inquiryId && (
                      <button 
                        onClick={() => {
                          setFilterInput(log.relatedId!)
                          setInquiryId(log.relatedId)
                        }}
                        className="text-[10px] text-neutral-400 hover:text-neutral-900 mt-1.5 flex items-center gap-1 font-mono"
                      >
                        Ref: {log.relatedId}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
        <div className="text-[10px] text-neutral-500 italic flex items-center gap-2">
          <span>{inquiryId ? `Filtered by ${inquiryId}` : 'Showing all activity'}</span>
          {lastRefreshedAt && (
            <span className="text-neutral-400 font-mono">
              • Updated {lastRefreshedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={!pagination.prev || loading}
            className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            disabled={!pagination.next || loading}
            className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ComplianceAuditLog
