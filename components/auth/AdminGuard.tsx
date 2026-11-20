'use client'

import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useUserRole } from '../../hooks/useUserRole'
import { isAdminEmail } from '../../lib/tribal/owner-allowlist'
import { ShieldCheck, ShieldAlert, Lock, ArrowLeft, Loader2, LogOut } from 'lucide-react'
import Link from 'next/link'

interface AdminGuardProps {
  children: React.ReactNode
  requiredRole?: string
  featureName?: string
  showBanner?: boolean
}

export function AdminGuard({
  children,
  requiredRole = 'Admin',
  featureName = 'Owner Operations & Compliance',
  showBanner = true,
}: AdminGuardProps) {
  const {
    user: fbUser,
    role: fbRole,
    isVerifiedOwner: fbVerifiedOwner,
    loading: fbLoading,
    login: fbLogin,
    logout: fbLogout,
  } = useAuth()
  const {
    user: auth0User,
    role: auth0Role,
    isVerifiedOwner: auth0VerifiedOwner,
    isLoading: auth0Loading,
    login: auth0Login,
    logout: auth0Logout,
  } = useUserRole()

  // 1. Loading State
  if (fbLoading && auth0Loading) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center shadow-xs my-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 mb-1">Verifying Owner Clearance</h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          Checking your Google / Auth0 identity and verifying owner allowlist clearance...
        </p>
      </div>
    )
  }

  const fbAuthorized = Boolean(
    fbUser && fbUser.emailVerified === true && fbVerifiedOwner && isAdminEmail(fbUser.email)
  )
  const auth0Authorized = Boolean(
    auth0User &&
      auth0User.email_verified === true &&
      auth0VerifiedOwner &&
      isAdminEmail(auth0User.email)
  )

  const authorizedSession = auth0Authorized
    ? { email: auth0User.email as string, provider: 'Auth0 SSO', logout: auth0Logout, role: auth0Role || 'Admin' }
    : fbAuthorized
      ? { email: fbUser?.email as string, provider: 'Google Auth', logout: fbLogout, role: fbRole || 'Owner' }
      : null

  const signedInSession = auth0User
    ? {
        email: (auth0User.email as string) || 'Unknown',
        emailVerified: auth0User.email_verified === true,
        provider: 'Auth0 SSO',
        logout: auth0Logout,
        role: auth0Role,
      }
    : fbUser
      ? {
          email: fbUser.email || 'Unknown',
          emailVerified: fbUser.emailVerified === true,
          provider: 'Google Auth',
          logout: fbLogout,
          role: fbRole,
        }
      : null

  // 2. Unauthenticated State
  if (!signedInSession) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-12 shadow-sm max-w-xl mx-auto text-center space-y-5 my-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
            Owner Authentication Required
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
            Sign In to Access {featureName}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
            This section is strictly restricted to verified owner accounts. Please sign in with your authorized personal or business account.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={fbLogin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs sm:text-sm font-bold hover:bg-neutral-800 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>
          <button
            type="button"
            onClick={auth0Login}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs sm:text-sm font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Sign In with Auth0</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs sm:text-sm font-semibold hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Store</span>
          </Link>
        </div>
      </div>
    )
  }

  // 3. Unauthorized State (Signed in, but not on the verified two-email owner allowlist)
  if (!authorizedSession) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-12 shadow-sm max-w-xl mx-auto text-center space-y-5 my-8">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold">
            Access Denied
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
            {requiredRole} Clearance Required
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
            Your account (<span className="font-semibold text-neutral-900 font-mono">{signedInSession.email}</span> via{' '}
            {signedInSession.provider}
            {!signedInSession.emailVerified ? ', unverified email' : ''}) is not authorized to access{' '}
            <strong className="text-rose-700">{featureName}</strong>. Access requires {requiredRole} clearance.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void signedInSession.logout()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs sm:text-sm font-semibold hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch Account</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs sm:text-sm font-bold hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Store</span>
          </Link>
        </div>
      </div>
    )
  }

  // 4. Authorized State (Verified Owner Confirmed)
  return (
    <div className="space-y-4">
      {showBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-emerald-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950">Owner Clearance Verified</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-bold uppercase tracking-wider">
                  Strict Allowlist
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 truncate">
                Authenticated via {authorizedSession.provider} as{' '}
                <span className="font-mono">{authorizedSession.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void authorizedSession.logout()}
              title="Sign Out"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}

export default AdminGuard
