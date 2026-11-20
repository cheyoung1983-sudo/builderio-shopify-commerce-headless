import React from 'react'
import Head from 'next/head'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { AdminAuditDashboard } from '../../components/tribal/AdminAuditDashboard'
import { AdminGuard } from '../../components/auth/AdminGuard'
import { useAuth } from '../../hooks/useAuth'
import { useUserRole } from '../../hooks/useUserRole'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TribalAuditAdminPage() {
  const { user: fbUser } = useAuth()
  const { user: auth0User } = useUserRole()
  const activeEmail = auth0User?.email || fbUser?.email || ''

  return (
    <>
      <Head>
        <title>Tribal Verification Audit Dashboard | Display &amp; Cell Pros</title>
        <meta name="robots" key="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Owner control panel for Display &amp; Cell Pros to audit, approve, or deny tribal member verification requests."
        />
      </Head>

      <div className="min-h-screen bg-slate-50 pb-20">
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
          <AdminGuard featureName="Tribal Verification Audit Dashboard">
            <AdminAuditDashboard adminEmail={activeEmail} />
          </AdminGuard>
        </main>
      </div>
    </>
  )
}
