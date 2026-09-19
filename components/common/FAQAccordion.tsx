import React, { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ShieldCheck,
  Clock,
  Wrench,
  Search,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react'

export interface FAQItem {
  id: string
  category: 'warranties' | 'timelines' | 'general'
  categoryLabel: string
  question: string
  answer: string
  highlights?: string[]
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'warranty-coverage',
    category: 'warranties',
    categoryLabel: 'Repair Warranties',
    question: 'What is covered under the DisplayCellPros repair warranty?',
    answer:
      'All our replacement screens, batteries, and component repairs come with an extensive warranty protecting against defects in materials and workmanship. If your replacement screen experiences digitizer touch failure, dead pixels, color line distortion, or ghost touches during the warranty period, we will inspect and replace the part at zero additional charge. Warranty coverage applies to normal device usage and does not cover physical re-cracks, accidental drops, frame bending, or liquid ingress occurring after service.',
    highlights: [
      'Covers touch unresponsiveness & digitizer defects',
      'Covers internal display panel anomalies & dead pixels',
      'Excludes subsequent drops, broken glass & water damage',
    ],
  },
  {
    id: 'warranty-durations',
    category: 'warranties',
    categoryLabel: 'Repair Warranties',
    question: 'How long do warranties last for different repair types?',
    answer:
      'Warranty duration varies by the nature of the replacement part. Smartphone and tablet screen replacements receive our signature 1-Year Limited Warranty against manufacturer defects. Battery replacements carry a 1-Year Battery Performance Warranty covering sudden capacity drops below 80% or failure to charge. Component repairs (charge ports, speakers, cameras) include 6-month coverage, while specialized micro-soldering and motherboard logic repairs include a 90-day warranty.',
    highlights: [
      'Screen Replacements: 1-Year Hardware Warranty',
      'Battery Replacements: 1-Year Performance Warranty',
      'Micro-Soldering & Logic Board: 90-Day Coverage',
    ],
  },
  {
    id: 'warranty-claim-process',
    category: 'warranties',
    categoryLabel: 'Repair Warranties',
    question: 'What is the process if I need to make a warranty claim?',
    answer:
      'Making a warranty claim is fast and frictionless. Contact us via phone, text, or our website with your name or original invoice number. Our technician will verify the issue in person or via mobile dispatch in Spokane. Once verified as a manufacturer or component defect, we replace the defective part on-site or in-shop with priority scheduling, requiring no extra labor fees.',
    highlights: [
      'No complicated paperwork or return shipping hassles',
      'Priority on-site dispatch across Spokane & surrounding areas',
      '100% parts and labor included',
    ],
  },
  {
    id: 'oem-vs-aftermarket',
    category: 'warranties',
    categoryLabel: 'Repair Warranties',
    question: 'Do you use OEM or aftermarket parts, and how does that affect warranty?',
    answer:
      'We source only OEM-specification and premium refurbished genuine assemblies rigorously tested for color gamut, refresh rate, and touch sensitivity. Unlike bargain aftermarket displays that cause touch latency or battery drain, our Grade-A displays undergo 18-point bench validation before installation and are backed by our full replacement guarantee.',
    highlights: [
      'Original color accuracy and touch refresh rates preserved',
      'TrueTone and ambient sensor programming supported where applicable',
      'Strict quality grading prior to every installation',
    ],
  },
  {
    id: 'timeline-onsite-spokane',
    category: 'timelines',
    categoryLabel: 'Process Timelines',
    question: 'How long does an on-site screen replacement take in Spokane?',
    answer:
      'Most on-site smartphone screen replacements take between 25 and 45 minutes from technician arrival to final multi-touch testing. Our fully equipped mobile repair van brings precision tools, ESD-safe workstations, and calibrated test equipment directly to your driveway, workplace, or preferred meeting spot in Spokane, Liberty Lake, or Spokane Valley.',
    highlights: [
      'Typical repair window: 25 to 45 minutes on-site',
      'Zero downtime traveling or waiting in busy mall kiosks',
      'Complete pre- and post-repair functional checklist',
    ],
  },
  {
    id: 'timeline-console-repair',
    category: 'timelines',
    categoryLabel: 'Process Timelines',
    question: 'What is the timeline for gaming console maintenance and repairs?',
    answer:
      'Standard console services—such as internal dust clearing, fan replacement, and liquid metal or thermal paste reapplication (PS5, Xbox Series X/S, Nintendo Switch)—are usually completed within 24 to 48 hours. If HDMI port replacement or micro-soldering power IC diagnosis is required, the turnaround is typically 2 to 4 business days to allow microscopic solder inspection and comprehensive thermal stress testing.',
    highlights: [
      'Thermal maintenance & cleaning: 24–48 hours',
      'HDMI port replacements & micro-soldering: 2–4 business days',
      'Extensive thermal burn-in testing before pickup',
    ],
  },
  {
    id: 'timeline-appointments',
    category: 'timelines',
    categoryLabel: 'Process Timelines',
    question: 'Do I need an appointment, and are same-day slots available?',
    answer:
      'Appointments are strongly encouraged so we can verify exact model stock and schedule travel efficiently throughout the Spokane metro area. We reserve daily emergency slots for same-day mobile repairs. You can schedule online or call us directly in the morning for same-day on-site availability.',
    highlights: [
      'Same-day on-site appointments available for popular devices',
      'Exact part availability confirmed prior to departure',
      'Real-time technician arrival notifications',
    ],
  },
  {
    id: 'timeline-data-safety',
    category: 'timelines',
    categoryLabel: 'Process Timelines',
    question: 'Will my data and photos be safe during the repair process?',
    answer:
      'Yes. Hardware repairs (such as screen, battery, and charging port replacements) do not involve wiping or accessing your storage drives. Your photos, contacts, apps, and personal settings remain intact. However, we always recommend keeping an up-to-date cloud or local backup as a best practice before any electronic servicing.',
    highlights: [
      'Device data is not wiped during hardware repair',
      'Strict customer privacy code of ethics',
      'Passcode not required for basic external function tests',
    ],
  },
]

type CategoryFilter = 'all' | 'warranties' | 'timelines'

interface FAQAccordionProps {
  id?: string
  className?: string
  defaultOpenId?: string
  title?: string
  subtitle?: string
  items?: FAQItem[]
  includeJsonLd?: boolean
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  id = 'faq-accordion-section',
  className = '',
  defaultOpenId = 'warranty-coverage',
  title = 'Frequently Asked Questions',
  subtitle = 'Everything you need to know about our repair warranties, Spokane on-site service timelines, and quality guarantees.',
  items = FAQ_DATA,
  includeJsonLd = true,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(
    new Set(defaultOpenId ? [defaultOpenId] : [])
  )

  const toggleItem = (itemId: string) => {
    setOpenItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const expandAll = () => {
    setOpenItemIds(new Set(filteredItems.map((item) => item.id)))
  }

  const collapseAll = () => {
    setOpenItemIds(new Set())
  }

  const query = searchQuery.trim().toLowerCase()
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      activeCategory === 'all' || item.category === activeCategory
    if (!query) return matchesCategory

    const matchesSearch =
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query) ||
      item.highlights?.some((h) => h.toLowerCase().includes(query))

    return matchesCategory && matchesSearch
  })

  // Generate Schema.org FAQPage structured data for search engine rich results
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <section
      id={id}
      aria-label="Frequently Asked Questions"
      className={`w-full py-12 md:py-16 ${className}`}
    >
      {includeJsonLd && (
        <script
          id={`${id}-jsonld`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center" id="faq-header-wrapper">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>Guaranteed Peace of Mind</span>
          </div>
          <h2
            id="faq-main-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
          >
            {title}
          </h2>
          <p
            id="faq-main-subtitle"
            className="mx-auto mt-3 max-w-2xl text-base text-neutral-600 sm:text-lg"
          >
            {subtitle}
          </p>
        </div>

        {/* Feature Highlights Banner */}
        <div
          id="faq-metrics-dock"
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div
            id="faq-highlight-card-warranty"
            className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-xs"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">1-Year Warranty</p>
              <p className="text-xs text-neutral-500">Screen & hardware protection</p>
            </div>
          </div>

          <div
            id="faq-highlight-card-timeline"
            className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-xs"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">25–45 Min Repairs</p>
              <p className="text-xs text-neutral-500">On-site mobile service in Spokane</p>
            </div>
          </div>

          <div
            id="faq-highlight-card-quality"
            className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-xs"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Wrench className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Expert Technicians</p>
              <p className="text-xs text-neutral-500">Board-level & micro-soldering</p>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div
          id="faq-controls-bar"
          className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Category Tabs */}
          <div
            id="faq-category-pills"
            role="tablist"
            aria-label="FAQ category filter"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              id="faq-filter-btn-all"
              role="tab"
              type="button"
              aria-selected={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeCategory === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              All Topics ({FAQ_DATA.length})
            </button>
            <button
              id="faq-filter-btn-warranties"
              role="tab"
              type="button"
              aria-selected={activeCategory === 'warranties'}
              onClick={() => setActiveCategory('warranties')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeCategory === 'warranties'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Repair Warranties</span>
            </button>
            <button
              id="faq-filter-btn-timelines"
              role="tab"
              type="button"
              aria-selected={activeCategory === 'timelines'}
              onClick={() => setActiveCategory('timelines')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeCategory === 'timelines'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Process Timelines</span>
            </button>
          </div>

          {/* Quick Expand/Collapse Action */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="faq-expand-all-btn"
              type="button"
              onClick={expandAll}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:underline"
            >
              Expand all
            </button>
            <span className="text-neutral-300" aria-hidden="true">
              |
            </span>
            <button
              id="faq-collapse-all-btn"
              type="button"
              onClick={collapseAll}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:underline"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        <div id="faq-search-wrapper" className="relative mt-4">
          <label htmlFor="faq-search-input" className="sr-only">
            Search FAQ questions and answers
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          </div>
          <input
            id="faq-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g., warranty length, Spokane on-site, gaming consoles, data safety)..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              id="faq-search-clear-btn"
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Accordion Item List */}
        <div
          id="faq-accordion-list"
          className="mt-6 divide-y divide-neutral-200/80 rounded-2xl border border-neutral-200/90 bg-white shadow-xs"
        >
          {filteredItems.length === 0 ? (
            <div id="faq-empty-state" className="px-6 py-12 text-center">
              <HelpCircle className="mx-auto h-8 w-8 text-neutral-400" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-neutral-900">
                No matching questions found
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Try searching with different terms or reset your category filter.
              </p>
              <button
                id="faq-empty-reset-btn"
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('all')
                }}
                className="mt-4 inline-flex items-center rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isOpen = openItemIds.has(item.id)
              const buttonId = `faq-btn-${item.id}`
              const panelId = `faq-panel-${item.id}`

              return (
                <div
                  key={item.id}
                  id={`faq-item-container-${item.id}`}
                  className={`transition-colors ${
                    isOpen ? 'bg-neutral-50/50' : 'hover:bg-neutral-50/30'
                  }`}
                >
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleItem(item.id)}
                      className="flex w-full items-start justify-between gap-4 px-5 py-4.5 text-left text-sm sm:px-6 sm:py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                            item.category === 'warranties'
                              ? 'bg-emerald-100/80 text-emerald-800'
                              : 'bg-blue-100/80 text-blue-800'
                          }`}
                        >
                          {item.category === 'warranties' ? 'Warranty' : 'Timeline'}
                        </span>
                        <span className="font-semibold text-neutral-900 sm:text-base">
                          {item.question}
                        </span>
                      </div>
                      <span className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-transform duration-200 hover:text-neutral-700">
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-emerald-700' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className={`px-5 pb-5 pt-1 text-sm text-neutral-600 sm:px-6 sm:pb-6 ${
                      isOpen ? 'block' : 'hidden'
                    }`}
                  >
                    <p className="leading-relaxed">{item.answer}</p>

                    {item.highlights && item.highlights.length > 0 && (
                      <div
                        id={`faq-highlights-${item.id}`}
                        className="mt-4 rounded-xl border border-neutral-100 bg-white p-3.5 shadow-2xs"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                          Key Takeaways
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {item.highlights.map((highlight, hIndex) => (
                            <li
                              key={hIndex}
                              className="flex items-start gap-2 text-xs text-neutral-700"
                            >
                              <CheckCircle2
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                                aria-hidden="true"
                              />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Support & Booking CTA Box */}
        <div
          id="faq-help-card"
          className="mt-10 overflow-hidden rounded-2xl border border-emerald-200/90 bg-linear-to-br from-emerald-50/70 via-white to-neutral-50 p-6 sm:p-8"
        >
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-800">
                <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Have a specific device or custom repair question?
                </span>
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                Speak directly with a certified technician in Spokane
              </h3>
              <p className="text-sm text-neutral-600 max-w-xl">
                Whether you need a quick quote on an iPad screen, HDMI port micro-soldering, or want
                to confirm on-site arrival timing in your neighborhood, we are ready to assist.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                id="faq-cta-call-btn"
                href="tel:5095550199"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-800"
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                <span>Call or Text Technician</span>
              </a>
              <Link
                id="faq-cta-browse-parts-btn"
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50"
              >
                <span>Browse Catalog</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FAQAccordion
