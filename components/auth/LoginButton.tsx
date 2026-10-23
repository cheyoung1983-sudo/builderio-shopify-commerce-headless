'use client'

import React from 'react'
import { LogIn } from 'lucide-react'

export interface LoginButtonProps {
  className?: string
  returnTo?: string
  children?: React.ReactNode
}

export default function LoginButton({
  className = '',
  returnTo = '/track-repair',
  children,
}: LoginButtonProps) {
  const loginUrl = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <a
      id="auth0-login-btn"
      href={loginUrl}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs sm:text-sm tracking-tight transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer ${className}`}
    >
      <LogIn className="w-4 h-4" />
      <span>{children || 'Sign In with Auth0'}</span>
    </a>
  )
}
