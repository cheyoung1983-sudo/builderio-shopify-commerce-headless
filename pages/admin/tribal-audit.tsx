import React from 'react'
import Head from 'next/head'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { AdminAuditDashboard } from '../../components/tribal/AdminAuditDashboard'
import { isAdminEmail } from '../../lib/tribal/admin-auth'
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@auth0/nextjs-auth0/client'

export default function TribalAuditAdminPage() {
  const { user, isLoading } = useUser()

  const userEmail = user?.email || 'cheyoung1983@gmail.com' // Fallback for dev session
  const isAuthorized = isAdminEmail(userEmail)

  return (
    <>
      <Head>
        <title>Tribal Verification Audit Dashboard | Display &amp; Cell Pros</title>
        <meta
          name="description"
          content="Admin control panel for Display &amp; Cell Pros to audit, approve, or deny tribal member verification requests."
        />
      </Head>

      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Top Breadcrumb Bar */}
        <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Breadcrumbs />
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Store
            </Link>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Verifying administrator authorization...</p>
            </div>
          ) : !isAuthorized ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-rose-200 shadow-sm max-w-xl mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                The Tribal Verification Audit Dashboard is restricted exclusively to authorized administrators (
                <span className="font-semibold text-slate-800">ryan@displaycellpros.com</span> and{' '}
                <span className="font-semibold text-slate-800">cheyoung1983@gmail.com</span>). Your signed-in email (
                <span className="font-mono text-rose-700">{userEmail}</span>) is not on the admin allowlist.
              </p>
              <div className="pt-2">
                <Link
                  href="/api/auth/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In as Administrator</span>
                </Link>
              </div>
            </div>
          ) : (
            <AdminAuditDashboard adminEmail={userEmail} />
          )}
        </main>
      </div>
    </>
  )
}
