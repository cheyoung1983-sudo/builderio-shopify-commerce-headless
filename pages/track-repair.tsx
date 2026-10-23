import React, { useState } from 'react'
import type { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import {
  Wrench,
  Search,
  ShieldCheck,
  Package,
  Truck,
  Clock,
  ArrowRight,
  User,
  HelpCircle,
  PhoneCall,
  Sparkles,
} from 'lucide-react'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { RepairStatusLookup } from '../components/services/RepairStatusLookup'
import LoginButton from '../components/auth/LoginButton'
import LogoutButton from '../components/auth/LogoutButton'
import Profile from '../components/auth/Profile'
import { isAuth0Enabled } from '../lib/auth0'

interface TrackRepairPageProps {
  authEnabled: boolean
}

export const getStaticProps: GetStaticProps<TrackRepairPageProps> = async () => ({
  props: { authEnabled: isAuth0Enabled },
})

export default function TrackRepairPage({ authEnabled }: TrackRepairPageProps) {
  const [detectedEmail, setDetectedEmail] = useState<string>('')

  return (
    <>
      <Head>
        <title>Track Repair Status | Live Smartphone &amp; Mail-In Progress | DisplayCellPros</title>
        <meta
          name="description"
          content="Check real-time repair progress for your smartphone or tablet. Dual-factor verified status with Repair Request ID (RMS#) and email address."
        />
        <meta property="og:title" content="Track Repair Status | DisplayCellPros" />
        <meta
          property="og:description"
          content="Track bench diagnostics, quality assurance testing, and outbound reverse logistics for your DisplayCellPros mail-in repair."
        />
      </Head>

      <div className="min-h-screen bg-neutral-50/70 pb-24">
        {/* Breadcrumb Navigation */}
        <div className="bg-white border-b border-neutral-200/80 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
          </div>
        </div>

        {/* Page Hero */}
        <header className="relative bg-white border-b border-neutral-200/80 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Bench Telemetry &amp; Reverse Logistics</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Repair Status Tracker
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                Check real-time updates for your device in our Spokane cleanroom repair lab. Verify with your{' '}
                <strong className="text-neutral-900">Repair Request ID (RMS#)</strong> and{' '}
                <strong className="text-neutral-900">Contact Email</strong> to see your repair&apos;s current stage and latest update.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-600">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 font-medium">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  Prepaid Shipping Kit Tracked
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 font-medium">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  24–48h Bench Turnaround
                </span>
              </div>
            </div>

            {/* Customer sign-in card: shown only once Auth0 is configured and implemented */}
            {authEnabled && (
            <div className="bg-neutral-50/90 border border-neutral-200/90 rounded-2xl p-5 lg:max-w-md w-full space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Customer Authentication</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-medium bg-white px-2 py-0.5 rounded-full border border-neutral-200">
                  Auth0 Protected
                </span>
              </div>

              {/* Profile Card & Logout */}
              <div className="space-y-3">
                <Profile onEmailDetected={(email) => setDetectedEmail(email)} />

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <LoginButton
                    returnTo="/track-repair"
                    className="w-full sm:w-auto flex-1 text-center"
                  >
                    Sign In with Auth0
                  </LoginButton>
                  <LogoutButton
                    returnTo="/track-repair"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 text-center sm:text-left leading-tight">
                Signing in with Auth0 automatically syncs your email address to the repair verification form.
              </p>
            </div>
            )}
          </div>
        </header>

        {/* Main Tracker Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-10">
          <RepairStatusLookup initialEmail={detectedEmail} />

          {/* Assistance & Booking Support Banner */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Need Assistance with Your Device?
              </span>
              <h3 className="text-xl font-bold text-white">
                Have questions regarding your repair estimate or diagnostic results?
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Our Spokane repair specialists are available Monday–Saturday. Call us directly or submit a new repair request with a complimentary prepaid shipping mailer.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <a
                href="tel:+15092553852"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-emerald-300" />
                <span>(509) 255-3852</span>
              </a>

              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs sm:text-sm font-bold shadow-xs transition-colors"
              >
                <Wrench className="w-4 h-4 text-emerald-700" />
                <span>Book New Repair</span>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
