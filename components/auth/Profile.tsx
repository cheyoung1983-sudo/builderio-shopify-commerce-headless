'use client'

import React from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { User, ShieldCheck } from 'lucide-react'

const FALLBACK_AVATAR = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23059669'/%3E%3Cpath d='M50 45c7.5 0 13.64-6.14 13.64-13.64S57.5 17.72 50 17.72s-13.64 6.14-13.64 13.64S42.5 45 50 45zm0 6.82c-9.09 0-27.28 4.56-27.28 13.64v3.41c0 1.88 1.53 3.41 3.41 3.41h47.74c1.88 0 3.41-1.53 3.41-3.41v-3.41c0-9.08-18.19-13.64-27.28-13.64z' fill='%23fff'/%3E%3C/svg%3E`

export interface ProfileProps {
  className?: string
  onEmailDetected?: (email: string) => void
}

export default function Profile({ className = '', onEmailDetected }: ProfileProps) {
  let user: any = null
  let isLoading = false

  try {
    const userHook = useUser({ route: '/api/auth/profile' })
    user = userHook.user
    isLoading = userHook.isLoading
  } catch (err) {
    // Graceful fallback if outside Auth0Provider or in mock mode
  }

  React.useEffect(() => {
    if (user?.email && onEmailDetected) {
      onEmailDetected(user.email)
    }
  }, [user?.email, onEmailDetected])

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 w-full bg-neutral-50 rounded-2xl p-4 border border-neutral-200 animate-pulse ${className}`}>
        <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-neutral-200 rounded-full w-2/3" />
          <div className="h-3 bg-neutral-200 rounded-full w-1/2" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={`flex items-center gap-3.5 w-full bg-white rounded-2xl p-3.5 border border-emerald-200 shadow-2xs ${className}`}>
      <div className="relative shrink-0">
        <div className="p-0.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.picture || FALLBACK_AVATAR}
            alt={user.name || 'User'}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover bg-neutral-100 block"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = FALLBACK_AVATAR
            }}
          />
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-neutral-900 text-xs sm:text-sm font-bold truncate">
            {user.name || user.nickname || 'Verified Customer'}
          </p>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        </div>
        <p className="text-neutral-500 text-[11px] truncate mt-0.5">{user.email}</p>
      </div>

      <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
        Auth0 Verified
      </span>
    </div>
  )
}
