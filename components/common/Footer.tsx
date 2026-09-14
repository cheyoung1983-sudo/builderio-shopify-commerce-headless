import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Headphones,
} from 'lucide-react'
import { NewsletterSubscription } from './NewsletterSubscription'

export interface FooterProps {
  className?: string
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      id="site-footer"
      className={`bg-surface-muted/90 border-t border-border-subtle text-neutral-800 mt-16 ${className}`}
      role="contentinfo"
      aria-label="Site footer"
    >
      {/* Upper Footer: Value Props & Newsletter Block */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        {/* Value Propositions / Trust Grid */}
        <div
          id="footer-trust-pillars"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-border-subtle"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white border border-border-subtle text-neutral-900 shadow-2xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-0.5">
                Fast Dispatch
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Orders placed before 2 PM EST ship the same business day.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white border border-border-subtle text-neutral-900 shadow-2xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-0.5">
                Tested Quality
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Every display and component is lab-tested prior to packing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white border border-border-subtle text-neutral-900 shadow-2xs shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-0.5">
                30-Day Hassle-Free Returns
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Simple returns and exchanges on unopened replacement parts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white border border-border-subtle text-neutral-900 shadow-2xs shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-0.5">
                Technician Support
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Direct guidance from certified device hardware specialists.
              </p>
            </div>
          </div>
        </div>

        {/* Newsletter Subscription Card */}
        <div
          id="footer-newsletter-banner"
          className="my-10 bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Special Offers & Drop Alerts</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mb-2">
                Join our repair community newsletter
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Receive weekly hardware teardowns, exclusive component discounts, and early access to rare screen batches.
              </p>
            </div>

            <div className="lg:col-span-6">
              <NewsletterSubscription
                id="footer-newsletter-form"
                compact={true}
                placeholder="you@example.com"
                buttonText="Subscribe"
              />
            </div>
          </div>
        </div>

        {/* Main Footer Links Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pt-4 pb-12">
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 group"
              id="footer-brand-logo"
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                D
              </div>
              <span className="text-lg font-bold tracking-tight text-neutral-900 group-hover:text-neutral-700 transition-colors">
                DisplayCellPros
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-sm">
              Your trusted source for OEM-grade mobile device displays, lithium replacement cells, and precision technician repair toolkits.
            </p>
            <div className="text-xs text-neutral-500 space-y-1">
              <p>Email: <span className="text-neutral-800 font-medium">support@displaycellpros.com</span></p>
              <p>Hours: Mon – Fri, 8:00 AM – 6:00 PM EST</p>
            </div>
          </div>

          {/* Col 2: Catalog Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-4">
              Products
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  href="/products"
                  className="text-neutral-600 hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                  <span>All Products</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=screens"
                  className="text-neutral-600 hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                  <span>Screen Replacements</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=batteries"
                  className="text-neutral-600 hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                  <span>Battery Assemblies</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=tools"
                  className="text-neutral-600 hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                  <span>Technician Toolkits</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-4">
              Customer Care
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  href="/cart"
                  className="text-neutral-600 hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                  <span>Shopping Bag</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-neutral-600 hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                  <span>Account & Orders</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-neutral-600 hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                  <span>Search Catalog</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/trends"
                  className="text-neutral-600 hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                  <span>Design Trends 2026</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Guarantee */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-4">
              Shop With Confidence
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li className="text-neutral-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>SSL 256-Bit Encryption</span>
              </li>
              <li className="text-neutral-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Strict Quality Testing</span>
              </li>
              <li className="text-neutral-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Zero Restocking Fees</span>
              </li>
              <li className="text-neutral-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Fast Tracked Courier</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Legal */}
      <div className="border-t border-border-subtle bg-white/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-500 text-center sm:text-left">
            © {currentYear} DisplayCellPros. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-500">
            <span className="hover:text-neutral-800 transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-neutral-800 transition-colors cursor-pointer">
              Terms of Service
            </span>
            <span className="hover:text-neutral-800 transition-colors cursor-pointer">
              Shipping Information
            </span>
            <span className="hover:text-neutral-800 transition-colors cursor-pointer">
              Cookie Preferences
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
