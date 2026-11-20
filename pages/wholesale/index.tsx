import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Layers,
  ShieldCheck,
  Package,
  Truck,
  CheckCircle2,
  DollarSign,
  Search,
  ArrowRight,
  Sliders,
  Award,
  PhoneCall,
  Loader2,
  Cpu,
  Smartphone,
  Gamepad2,
  Filter,
} from 'lucide-react'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import AdminProtectedRoute from '../../components/AdminProtectedRoute'
import { useAuth } from '../../hooks/useAuth'
import { TransformedShopifyVariant } from '../../lib/wholesale/types'

export default function WholesalePortalPage() {
  const { getIdToken, user: fbUser } = useAuth()
  const [variants, setVariants] = useState<TransformedShopifyVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState<'STANDARD' | 'BRONZE' | 'SILVER' | 'VIP'>('SILVER')
  const [appSubmitted, setAppSubmitted] = useState(false)
  const [appForm, setAppForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    taxId: '',
    isTribal: false,
  })

  useEffect(() => {
    async function loadCatalog() {
      try {
        const idToken = fbUser ? await getIdToken() : null
        const res = await fetch('/api/wholesale/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ targetMargin: 0.4, shippingFee: 5.99, safetyBuffer: 5 }),
        })
        const data = await res.json()
        if (data.success && Array.isArray(data.variants)) {
          setVariants(data.variants)
        }
      } catch (err) {
        console.warn('Failed to load wholesale catalog preview:', err)
      } finally {
        setLoading(false)
      }
    }
    void loadCatalog()
  }, [fbUser, getIdToken])

  // Tier multiplier for pricing calculator
  const tierDiscountMultiplier: Record<string, number> = {
    STANDARD: 0.90, // 10% off
    BRONZE: 0.80,   // 20% off
    SILVER: 0.75,   // 25% off (Tribal & Certified)
    VIP: 0.65,      // Cost + 15% (~35% off retail)
  }

  const filteredVariants = variants.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.compatibility.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))

    let matchesCategory = true
    if (selectedCategory === 'displays') {
      matchesCategory = v.title.toLowerCase().includes('oled') || v.title.toLowerCase().includes('screen')
    } else if (selectedCategory === 'batteries') {
      matchesCategory = v.title.toLowerCase().includes('battery')
    } else if (selectedCategory === 'consoles') {
      matchesCategory = v.title.toLowerCase().includes('playstation') || v.title.toLowerCase().includes('switch') || v.title.toLowerCase().includes('xbox')
    }

    return matchesSearch && matchesCategory
  })

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAppSubmitted(true)
  }

  return (
    <>
      <Head>
        <title>B2B Wholesale Gadget Parts &amp; Technician Supply | DisplayCellPros Spokane</title>
        <meta name="robots" key="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Wholesale OEM and premium gadget replacement parts for DisplayCellPros owners. Sourced from MobileSentrix and InjuredGadgets with automated blind dropshipping."
        />
      </Head>

      <AdminProtectedRoute requiredRole="owner" featureName="Wholesale Gadget Parts Portal">
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {/* Navigation Breadcrumb Bar */}
        <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Wholesale B2B Parts', isCurrent: true },
              ]}
              variant="contained"
            />
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Direct Supplier Feeds Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-slate-900 text-white py-16 sm:py-20">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/60 opacity-90"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
                <ShieldCheck className="w-4 h-4" />
                <span>MobileSentrix &amp; InjuredGadgets Authorized Middleware Hub</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Wholesale Gadget Parts &amp; Technician Supply
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">
                Direct supplier pricing on OEM and premium screens, batteries, charge ports, and gaming console assemblies for Spokane repair shops, independent technicians, and sovereign tribal enterprises.
              </p>

              <div className="mt-8 flex flex-wrap gap-4 items-center">
                <a
                  href="#catalog-preview"
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Browse Wholesale Catalog</span>
                </a>
                <a
                  href="#apply"
                  className="px-6 py-3 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm hover:bg-slate-700 hover:text-white transition-all active:scale-95 inline-flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Register Wholesale Trade Account</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Supply Chain Pillars */}
        <section className="py-12 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Blind Dropshipping</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Supplier invoices are suppressed. Packages dispatch under DisplayCellPros branding directly to your customer or bench.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Safety Stock Buffers</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time stock subtraction buffers prevent backorders, ensuring parts promised to customers are physically available.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">MAP &amp; Margin Rules</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automated pricing governance enforces minimum advertised prices (MAP) while maintaining healthy profit margins.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Tribal Sovereign Exemption</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Verified tribal members and Native enterprises receive tax-exempt transactions and an extra 25% wholesale discount.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Tier Explorer & Live Catalog Preview */}
        <section id="catalog-preview" className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Wholesale Parts Catalog &amp; Live Stock
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Preview real-time inventory from MobileSentrix and InjuredGadgets with automated tier pricing.
              </p>
            </div>

            {/* Tier Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex items-center gap-1 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 px-3">Pricing Tier:</span>
              {(['STANDARD', 'BRONZE', 'SILVER', 'VIP'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedTier === tier
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by part name, SKU, or device (e.g. iPhone 15, PS5)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Parts
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('displays')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'displays'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Displays &amp; Screens
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('batteries')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'batteries'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Batteries
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('consoles')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'consoles'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Gaming Consoles
              </button>
            </div>
          </div>

          {/* Parts Grid */}
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">Connecting to supplier inventory streams...</p>
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No matching wholesale parts found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try searching for a different device model or clear your category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVariants.map((item) => {
                const tierPrice = Number((item.retailPrice * tierDiscountMultiplier[selectedTier]).toFixed(2))
                return (
                  <div
                    key={item.sku}
                    className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:border-emerald-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {item.sku}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          Supplier: {item.supplier}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
                        {item.title}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {item.compatibility.map((comp) => (
                          <span
                            key={comp}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600"
                          >
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <span className="block text-[11px] text-slate-400">Retail MSRP</span>
                          <span className="text-xs text-slate-500 line-through">
                            ${item.retailPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[11px] font-bold text-emerald-700">
                            {selectedTier} Tier Price
                          </span>
                          <span className="text-xl font-extrabold text-slate-900">
                            ${tierPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-50">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.shopifyAvailableQuantity > 0 ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          ></span>
                          <span>
                            {item.shopifyAvailableQuantity > 0
                              ? `${item.shopifyAvailableQuantity} in stock (Safe Buffer)`
                              : 'Out of Stock'}
                          </span>
                        </span>
                        <Link
                          href={`/products?q=${encodeURIComponent(item.sku)}`}
                          className="font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                        >
                          <span>Order Part</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Trade Application Form Section */}
        <section id="apply" className="py-16 bg-slate-100 border-t border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
                  <Award className="w-3.5 h-3.5" />
                  <span>Spokane Trade Application</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Register Your Wholesale Trade Account
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                  Unlock tiered discounts, API keys for POS integration, and automated blind dropshipping. Applications are approved within 1 business day.
                </p>
              </div>

              {appSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-900">Application Submitted Successfully</h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    Thank you for applying. Ryan and our Spokane team will verify your business license and tax ID, then activate your wholesale tier account.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setAppSubmitted(false)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Submit another inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Business / Shop Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={appForm.businessName}
                        onChange={(e) => setAppForm({ ...appForm, businessName: e.target.value })}
                        placeholder="e.g. Inland Northwest Tech Repairs"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={appForm.contactName}
                        onChange={(e) => setAppForm({ ...appForm, contactName: e.target.value })}
                        placeholder="Your full name"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Business Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={appForm.email}
                        onChange={(e) => setAppForm({ ...appForm, email: e.target.value })}
                        placeholder="tech@yourcompany.com"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={appForm.phone}
                        onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })}
                        placeholder="(509) 555-0199"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      WA State UBI or Tax Exemption Reseller Permit #
                    </label>
                    <input
                      type="text"
                      value={appForm.taxId}
                      onChange={(e) => setAppForm({ ...appForm, taxId: e.target.value })}
                      placeholder="e.g. 604-XXX-XXX"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="tribal-check"
                      checked={appForm.isTribal}
                      onChange={(e) => setAppForm({ ...appForm, isTribal: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="tribal-check" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                      <strong>Federally Recognized Sovereign Nation Member / Enterprise:</strong> Check to activate 20% Tribal sovereign repair credit and tax-exemption verification review.
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all active:scale-[0.99] shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>Submit Wholesale Application</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
      </AdminProtectedRoute>
    </>
  )
}
