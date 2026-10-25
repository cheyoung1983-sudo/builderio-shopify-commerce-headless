'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Search,
  Filter,
  Download,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Building2,
  Sparkles,
} from 'lucide-react'

export interface VerificationRequestItem {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  tribalNation: string
  maskedEnrollmentId: string
  status: 'pending' | 'approved' | 'denied'
  createdAt: string
  provider: string
  personaInquiryId?: string
  onReservation: boolean
  reservationName?: string
  notes?: string
}

interface AdminAuditDashboardProps {
  adminEmail: string
}

export const AdminAuditDashboard: React.FC<AdminAuditDashboardProps> = ({ adminEmail }) => {
  const [requests, setRequests] = useState<VerificationRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tribal/admin/requests?adminEmail=${encodeURIComponent(adminEmail)}`, {
        headers: {
          'x-admin-email': adminEmail,
        },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setRequests(data.requests || [])
      } else {
        setError(data.error || 'Failed to load verification requests.')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching admin requests.')
    } finally {
      setLoading(false)
    }
  }, [adminEmail])

  useEffect(() => {
    // Wrap to avoid synchronous setState trigger
    const timer = setTimeout(() => {
      void fetchRequests()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchRequests])

  const handleDecision = async (requestId: string, customerId: string, action: 'approve' | 'deny') => {
    setActionLoadingId(requestId)
    try {
      const res = await fetch('/api/tribal/admin/decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({
          requestId,
          customerId,
          action,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToastMessage(data.message)
        // Refresh local state
        setRequests((prev) =>
          prev.map((item) =>
            item.id === requestId ? { ...item, status: action === 'approve' ? 'approved' : 'denied' } : item
          )
        )
      } else {
        alert(data.error || 'Failed to record decision.')
      }
    } catch (err: any) {
      alert(err.message || 'Error processing decision.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Filter & Search Logic
  const filteredRequests = requests.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      item.customerName.toLowerCase().includes(q) ||
      item.customerEmail.toLowerCase().includes(q) ||
      item.tribalNation.toLowerCase().includes(q) ||
      item.maskedEnrollmentId.toLowerCase().includes(q) ||
      (item.personaInquiryId || '').toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  // Metrics
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const deniedCount = requests.filter((r) => r.status === 'denied').length
  const onReservationCount = requests.filter((r) => r.onReservation).length

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-emerald-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-emerald-300 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Control Panel</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Tribal Member Verification Audit</h2>
          <p className="text-xs text-slate-300">
            Authorized Administrator Session: <span className="text-emerald-400 font-semibold">{adminEmail}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchRequests()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <a
            href="/api/tribal/admin/export-audit?format=csv"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Audit</span>
          </a>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Pending Review</p>
            <p className="text-2xl font-extrabold text-neutral-900">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Approved</p>
            <p className="text-2xl font-extrabold text-neutral-900">{approvedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Denied</p>
            <p className="text-2xl font-extrabold text-neutral-900">{deniedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">On-Reservation</p>
            <p className="text-2xl font-extrabold text-neutral-900">{onReservationCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, tribe..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="text-xs font-bold text-neutral-600 shrink-0">Status:</span>
          {(['all', 'pending', 'approved', 'denied'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table & Content Section */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-neutral-200 shadow-xs text-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-neutral-600">Loading audit requests...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Access or Fetch Error</h4>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-neutral-200 shadow-xs text-center space-y-2">
          <Building2 className="w-10 h-10 text-neutral-300 mx-auto" />
          <h4 className="font-bold text-sm text-neutral-800">No requests found</h4>
          <p className="text-xs text-neutral-500">There are no verification requests matching your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Member / Email</th>
                  <th className="py-3.5 px-4">Tribal Nation</th>
                  <th className="py-3.5 px-4">Enrollment ID</th>
                  <th className="py-3.5 px-4">Geofence</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredRequests.map((item) => {
                  const isExpanded = expandedId === item.id
                  const isProcessing = actionLoadingId === item.id

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900">{item.customerName}</div>
                          <div className="text-[11px] text-neutral-500">{item.customerEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-neutral-800">{item.tribalNation}</td>
                        <td className="py-3.5 px-4 font-mono text-neutral-700">{item.maskedEnrollmentId}</td>
                        <td className="py-3.5 px-4">
                          {item.onReservation ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <MapPin className="w-3 h-3" />
                              <span>On-Reservation</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Off-Reservation
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                          ) : item.status === 'denied' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3" />
                              <span>Denied</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleDecision(item.id, item.customerId, 'approve')}
                                  disabled={isProcessing}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDecision(item.id, item.customerId, 'deny')}
                                  disabled={isProcessing}
                                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  Deny
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 transition-colors"
                              title="Details"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Telemetry Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="p-4 border-t border-b border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Diagnostic Telemetry</span>
                                <p className="text-slate-600">
                                  <strong>Provider:</strong> {item.provider}
                                </p>
                                <p className="text-slate-600">
                                  <strong>Persona Inquiry ID:</strong>{' '}
                                  <span className="font-mono">{item.personaInquiryId || 'None'}</span>
                                </p>
                                <p className="text-slate-600">
                                  <strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}
                                </p>
                              </div>

                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Geofence Location</span>
                                <p className="text-slate-600">
                                  <strong>Territory:</strong> {item.reservationName || 'Standard Delivery Area'}
                                </p>
                                <p className="text-slate-600">
                                  <strong>Tax Exemption Eligible:</strong> {item.onReservation ? 'Yes (On-Reservation)' : 'No (20% Discount Only)'}
                                </p>
                              </div>

                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Admin Audit Notes</span>
                                <p className="text-slate-600 leading-relaxed">{item.notes || 'No custom notes provided.'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
