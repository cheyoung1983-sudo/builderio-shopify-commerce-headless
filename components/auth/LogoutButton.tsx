'use client'

import React from 'react'
import { LogOut } from 'lucide-react'

export interface LogoutButtonProps {
  className?: string
  returnTo?: string
  children?: React.ReactNode
}

export default function LogoutButton({
  className = '',
  returnTo = '/track-repair',
  children,
}: LogoutButtonProps) {
  const logoutUrl = `/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <a
      id="auth0-logout-btn"
      href={logoutUrl}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-red-50 text-neutral-700 hover:text-red-700 font-medium rounded-xl text-xs sm:text-sm border border-neutral-200 hover:border-red-200 transition-all duration-200 cursor-pointer ${className}`}
    >
      <LogOut className="w-4 h-4" />
      <span>{children || 'Sign Out'}</span>
    </a>
  )
}
