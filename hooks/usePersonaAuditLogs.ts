'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export interface AuditLogItem {
  id: string
  name: string
  createdAt: string
  details: string
  relatedId?: string
}

export interface PaginationInfo {
  next: string | null
  prev: string | null
}

export interface UsePersonaAuditLogsOptions {
  /**
   * Interval in milliseconds for background polling to refresh audit logs.
   * Defaults to 30000 (30 seconds).
   */
  pollingIntervalMs?: number
  /**
   * Whether automatic background polling is enabled.
   * Defaults to true.
   */
  enabled?: boolean
}

export function usePersonaAuditLogs(
  initialInquiryId?: string,
  options: UsePersonaAuditLogsOptions = {}
) {
  const { pollingIntervalMs = 30000, enabled = true } = options
  const { user: fbUser, getIdToken } = useAuth()

  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inquiryId, setInquiryId] = useState<string | undefined>(initialInquiryId)
  const [pagination, setPagination] = useState<PaginationInfo>({ next: null, prev: null })
  const [currentCursor, setCurrentCursor] = useState<{ type: 'after' | 'before'; value: string } | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)

  const fetchLogs = useCallback(
    async (cursor?: { type: 'after' | 'before'; value: string }, isBackground = false) => {
      if (!isBackground) {
        setLoading(true)
      }
      setError(null)
      try {
        const params = new URLSearchParams()
        if (inquiryId) params.append('inquiryId', inquiryId)
        if (cursor) params.append(cursor.type, cursor.value)

        const headers: Record<string, string> = {}
        if (fbUser) {
          const idToken = await getIdToken()
          if (idToken) headers.Authorization = `Bearer ${idToken}`
        }

        const res = await fetch(`/api/persona/audit-logs?${params.toString()}`, {
          credentials: 'same-origin',
          headers,
        })
        const data = await res.json()

        if (res.ok && data.success) {
          setLogs(data.logs)
          setPagination(data.pagination)
          setLastRefreshedAt(new Date())
        } else {
          setError(data.error || 'Failed to fetch logs')
        }
      } catch (err) {
        setError('An unexpected error occurred while fetching audit logs')
        console.error(err)
      } finally {
        if (!isBackground) {
          setLoading(false)
        }
      }
    },
    [inquiryId, fbUser, getIdToken]
  )

  // Fetch when cursor or inquiryId changes
  useEffect(() => {
    fetchLogs(currentCursor || undefined)
  }, [fetchLogs, currentCursor])

  // Real-time polling mechanism (refreshes timeline every 30s by default)
  useEffect(() => {
    if (!enabled || !pollingIntervalMs || pollingIntervalMs <= 0) return

    const timer = setInterval(() => {
      fetchLogs(currentCursor || undefined, true)
    }, pollingIntervalMs)

    return () => clearInterval(timer)
  }, [fetchLogs, currentCursor, enabled, pollingIntervalMs])

  const next = useCallback(() => {
    if (pagination.next) {
      setCurrentCursor({ type: 'after', value: pagination.next })
    }
  }, [pagination.next])

  const prev = useCallback(() => {
    if (pagination.prev) {
      setCurrentCursor({ type: 'before', value: pagination.prev })
    }
  }, [pagination.prev])

  const refresh = useCallback(() => {
    setCurrentCursor(null)
    fetchLogs()
  }, [fetchLogs])

  return {
    logs,
    loading,
    error,
    pagination,
    inquiryId,
    lastRefreshedAt,
    setInquiryId: (id: string | undefined) => {
      setInquiryId(id)
      setCurrentCursor(null) // Reset pagination on filter change
    },
    next,
    prev,
    refresh,
  }
}
