'use client'

import { useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'

export interface TribalPollStatus {
  isVerified: boolean
  onReservation: boolean
  tribalNation?: string
  lastChecked: string
  isLoading: boolean
  error?: string
}

export function useTribalStatusPoll(customerId?: string, pollIntervalMs: number = 10000) {
  const [status, setStatus] = useState<TribalPollStatus>({
    isVerified: false,
    onReservation: false,
    isLoading: true,
    lastChecked: new Date().toISOString(),
  })

  const checkStatus = useCallback(async () => {
    try {
      // Check cookies first for instant client-side read
      const cookieVerified = Cookies.get('tribal_member_verified') === 'true'
      const cookieOnRes = Cookies.get('tribal_on_reservation') === 'true'
      const cookieNation = Cookies.get('tribal_nation')

      if (cookieVerified) {
        setStatus({
          isVerified: true,
          onReservation: cookieOnRes,
          tribalNation: cookieNation,
          lastChecked: new Date().toISOString(),
          isLoading: false,
        })
        return
      }

      // If customerId is provided, query verification/customer status
      if (customerId && customerId !== 'guest') {
        const res = await fetch(`/api/tribal/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId, checkOnly: true }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success || data.verified) {
            setStatus({
              isVerified: true,
              onReservation: data.result?.taxExemptionTrack?.onReservation ?? false,
              tribalNation: data.result?.audit?.tribalNation,
              lastChecked: new Date().toISOString(),
              isLoading: false,
            })
            return
          }
        }
      }

      setStatus((prev) => ({
        ...prev,
        isVerified: false,
        isLoading: false,
        lastChecked: new Date().toISOString(),
      }))
    } catch (err: any) {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'Failed to poll tribal status',
      }))
    }
  }, [customerId])

  useEffect(() => {
    checkStatus()
    if (pollIntervalMs > 0) {
      const interval = setInterval(checkStatus, pollIntervalMs)
      return () => clearInterval(interval)
    }
  }, [checkStatus, pollIntervalMs])

  return {
    ...status,
    refreshStatus: checkStatus,
  }
}
