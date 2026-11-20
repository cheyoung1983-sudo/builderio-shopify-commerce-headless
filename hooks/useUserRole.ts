'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isAdminEmail } from '../lib/tribal/owner-allowlist'

export type AppRole = 'Admin' | 'User' | 'admin' | 'owner' | string | null

export interface UseUserRoleReturn {
  user: any
  role: AppRole
  isAdmin: boolean
  isVerifiedOwner: boolean
  isLoading: boolean
  error: string | null
  refetchRole: () => Promise<void>
  login: () => void
  logout: () => void
}

export function useUserRole(): UseUserRoleReturn {
  const { user: auth0User, error: auth0Error, isLoading: isAuth0Loading } = useUser()
  const [role, setRole] = useState<AppRole>(null)
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const fetchRoleFromApi = useCallback(async () => {
    setIsRoleLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/role', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch role: ${res.statusText}`)
      }
      const data = await res.json()
      if (data.authenticated && data.role) {
        setRole(data.role)
      } else {
        setRole(null)
      }
    } catch (err: any) {
      console.warn('[useUserRole] Error fetching role from API:', err)
      setError(err?.message || 'Error checking authorization role')
      setRole(null)
    } finally {
      setIsRoleLoading(false)
    }
  }, [])

  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    if (isAuth0Loading) {
      return
    }

    if (!auth0User) {
      setRole(null)
      setIsRoleLoading(false)
      return
    }

    fetchRoleFromApi()

    try {
      const sub = auth0User.sub || `auth0|${auth0User.email}`
      const docId = sub.replace(/[^a-zA-Z0-9_-]/g, '_')
      const userDocRef = doc(db, 'users', docId)

      unsubscribeRef.current = onSnapshot(
        userDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data()
            if (data.role) {
              setRole(data.role)
            }
          }
        },
        (snapErr) => {
          console.debug('[useUserRole] Snapshot listener fallback:', snapErr?.message)
        }
      )
    } catch (listenerErr) {
      console.debug('[useUserRole] Realtime listener skipped:', listenerErr)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [auth0User, isAuth0Loading, fetchRoleFromApi])

  const login = useCallback(() => {
    if (typeof window !== 'undefined') {
      const returnTo = window.location.pathname + window.location.search
      window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
    }
  }, [])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/logout'
    }
  }, [])

  const emailAllowed = isAdminEmail(auth0User?.email)
  const emailVerified = auth0User?.email_verified === true
  const roleIsAdmin = Boolean(role && (role === 'Admin' || role === 'admin' || role === 'owner'))

  // Strict enforcement: Auth0 user must have verified email on the two-email owner allowlist
  const isVerifiedOwner = Boolean(auth0User && emailAllowed && emailVerified && roleIsAdmin)
  const isAdmin = isVerifiedOwner

  const combinedLoading = isAuth0Loading || (Boolean(auth0User) && isRoleLoading)

  return {
    user: auth0User,
    role,
    isAdmin,
    isVerifiedOwner,
    isLoading: combinedLoading,
    error: error || (auth0Error ? auth0Error.message : null),
    refetchRole: fetchRoleFromApi,
    login,
    logout,
  }
}
