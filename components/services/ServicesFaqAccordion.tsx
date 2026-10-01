'use client'

import React, { useState, useMemo } from 'react'
import {
  ChevronDown,
  Search,
  ShieldCheck,
  Package,
  BatteryCharging,
  Percent,
  HelpCircle,
  FileCheck,
  AlertTriangle,
} from 'lucide-react'

export interface FaqItem {
  id: string
  category: 'tribal-tax' | 'tribal-discount' | 'mail-in-repair' | 'battery-safety'
  categoryLabel: string
  question: string
  answer: string
  bulletPoints?: string[]
  statuteTag?: string
  badgeTone?: 'amber' | 'emerald' | 'blue'
}

const FAQ_DATABASE: FaqItem[] = [
  // Category 1: Tribal Tax Exemption
  {
    id: 'tax-exemption-criteria',
    category: 'tribal-tax',
    categoryLabel: 'Tribal Sales Tax Exemption',
    badgeTone: 'amber',
    statuteTag: 'Federal Indian Law & State Tax Preemption',
    question: 'What are the legal requirements to qualify for a statutory sales tax exemption?',
    answer:
      'Under established principles of federal Indian law, states are preempted from imposing retail sales or use taxes on enrolled tribal members when products are purchased and delivered within reservation or trust boundaries. To qualify for 100% statutory sales tax exemption, three concurrent legal criteria must be satisfied:',
    bulletPoints: [
      'Tribal Enrollment: The purchaser must be an officially enrolled member of a federally recognized American Indian or Alaska Native tribe.',
      'Territorial Nexus: The physical shipping destination must be located within designated reservation boundaries or trust lands ("Indian Country").',
      'Title Transfer: Legal title and physical possession of the merchandise must transfer to the tribal member within Indian Country.',
    ],
  },
  {
    id: 'tax-california-cdtfa',
    category: 'tribal-tax',
    categoryLabel: 'Tribal Sales Tax Exemption',
    badgeTone: 'amber',
    statuteTag: 'California CDTFA Reg 1616',
    question: 'How does sales tax exemption work for delivery in California (CDTFA Form 146-RES)?',
    answer:
      'Under California Regulation 1616, sales to Native Americans delivered in Indian Country are exempt from California sales and use tax. When products are delivered via common carrier (such as UPS or FedEx), specific statutory mechanics are required:',
    bulletPoints: [
      'Exemption Certificate: A signed Form CDTFA-146-RES (Exemption Certificate and Statement of Delivery in Indian Country) must be executed.',
      'FOB Reservation Clause: The sales contract and shipping documentation must explicitly state that legal title passes to the purchaser in Indian Country (FOB Reservation).',
      'Proof of Delivery: Carriers maintain electronic proof of delivery verifying physical receipt within reservation boundaries.',
    ],
  },
  {
    id: 'tax-washington-state',
    category: 'tribal-tax',
    categoryLabel: 'Tribal Sales Tax Exemption',
    badgeTone: 'amber',
    statuteTag: 'Washington WAC 458-20-192',
    question: 'What are the rules for tribal tax exemption in Washington State?',
    answer:
      'Under Washington Administrative Code (WAC) 458-20-192, retail sales tax exemption applies specifically when the buyer is an officially enrolled member of the tribe upon whose reservation the merchandise is physically delivered.',
    bulletPoints: [
      'Specific Tribe Nexus: Unlike some states that grant universal remote exemptions, Washington requires delivery within the purchaser’s specific enrolled tribal lands.',
      'Documentation: Customers submit a completed Washington Department of Revenue (DOR) Tribal Exemption Certificate along with verified enrollment credentials.',
    ],
  },
  {
    id: 'tax-arizona-tpt',
    category: 'tribal-tax',
    categoryLabel: 'Tribal Sales Tax Exemption',
    badgeTone: 'amber',
    statuteTag: 'Arizona TPT Ruling 95-11',
    question: 'How does Arizona Transaction Privilege Tax (TPT) apply to tribal sales?',
    answer:
      'Under Arizona Transaction Privilege Tax (TPT) Ruling 95-11, sales to enrolled tribal members residing on their reservation are exempt from state transaction privilege tax when:',
    bulletPoints: [
      'Order Solicitation & Delivery: Order placement, payment processing, and final delivery occur within reservation borders.',
      'Exemption Record: A valid Form 5000A or ADOR exemption record is archived with customer enrollment details.',
    ],
  },
  {
    id: 'tax-self-administered',
    category: 'tribal-tax',
    categoryLabel: 'Tribal Sales Tax Exemption',
    badgeTone: 'amber',
    statuteTag: 'Tribal Sovereign Tax Codes',
    question: 'Do sovereign tribal governments levy their own transaction taxes on reservation orders?',
    answer:
      'Yes. Sovereign tribal governments possess inherent authority to levy independent transaction taxes within their reservation boundaries. When purchasing items delivered onto reservation lands, state tax is exempted, but local tribal taxes may apply:',
    bulletPoints: [
      'Self-Administered Authorities: Jurisdictions include Navajo Nation Reservation Tax Authority, Gila River Indian Community, Colorado River Indian Reservation, and Tohono O’odham Nation.',
      'Automated Tax Processing: Avalara AvaTax calculates applicable local tribal taxes when registered in the merchant tax console and remits them directly to tribal authorities.',
    ],
  },
  {
    id: 'tax-geofencing-zip',
    category: 'tribal-tax',
    categoryLabel: 'Tribal Sales Tax Exemption',
    badgeTone: 'amber',
    statuteTag: 'US Census TIGER/Line GIS',
    question: 'Why does DisplayCellPros use spatial GIS geofencing instead of basic 5-digit ZIP codes?',
    answer:
      'Standard postal 5-digit ZIP codes frequently cross reservation borders, encompassing both state-taxable off-reservation municipal land and tax-exempt reservation trust land. Relying solely on ZIP codes creates compliance exposure during state revenue audits. DisplayCellPros uses US Census Bureau TIGER/Line Shapefiles to evaluate exact latitude and longitude coordinates, ensuring accurate on-reservation verification.',
  },

  // Category 2: 20% Official Commercial Identity Discount
  {
    id: 'discount-what-is-it',
    category: 'tribal-discount',
    categoryLabel: '20% Commercial Discount',
    badgeTone: 'amber',
    statuteTag: 'DisplayCellPros Identity Program',
    question: 'What is the official 20% Tribal Commercial Discount and who qualifies?',
    answer:
      'DisplayCellPros proudly offers an official 20% commercial identity discount on all mobile device replacement screens, batteries, and precision technician toolkits to all officially enrolled members of federally recognized American Indian and Alaska Native tribes.',
    bulletPoints: [
      '20% Off Wholesale Parts: Applies across our full catalog of OLED displays, LCD assemblies, batteries, and technician tools.',
      'Universal Applicability: Available to enrolled members regardless of delivery location (both on-reservation and off-reservation addresses).',
      'No Public Promo Codes: Applied automatically at checkout once verified, preventing code expiration or browser extension scraping.',
    ],
  },
  {
    id: 'discount-vs-tax-exemption',
    category: 'tribal-discount',
    categoryLabel: '20% Commercial Discount',
    badgeTone: 'amber',
    statuteTag: 'Dual-Track Entitlement Architecture',
    question: 'What is the difference between the 20% commercial discount and statutory tax exemption?',
    answer:
      'They are two separate benefits that can be enjoyed individually or combined:',
    bulletPoints: [
      'Commercial Discount (20% Off): A discretionary business discount provided by DisplayCellPros to honor tribal members. It reduces the item sales price prior to tax calculation, regardless of shipping destination.',
      'Sales Tax Exemption: A legal statutory exemption from state and local sales taxes governed by federal Indian law, requiring on-reservation physical delivery.',
      'Combined Benefit: When an enrolled member ships directly to a reservation address, they receive BOTH the 20% discount and complete sales tax exemption.',
    ],
  },
  {
    id: 'discount-verification-how',
    category: 'tribal-discount',
    categoryLabel: '20% Commercial Discount',
    badgeTone: 'amber',
    statuteTag: 'Digital Identity Verification',
    question: 'How do I verify my tribal membership to unlock the 20% discount?',
    answer:
      'We partner with authoritative identity platforms (SheerID / ID.me) to provide instant, secure verification with zero paperwork in under 60 seconds:',
    bulletPoints: [
      'Instant Digital Verification: Submit your full legal name, tribal affiliation, and date of birth in our secure verification modal.',
      'Document Fallback: If your records cannot be matched automatically, you can securely upload a photo of your Tribal ID, Certificate of Degree of Indian Blood (CDIB), or enrollment letter.',
      'Account Tagging: Once approved, your customer account is tagged as Tribal_Verified, automatically unlocking 20% off every future order.',
    ],
  },

  // Category 3: White-Glove Mail-In Repair
  {
    id: 'repair-5-stage-lifecycle',
    category: 'mail-in-repair',
    categoryLabel: 'White-Glove Mail-In Repair',
    badgeTone: 'emerald',
    statuteTag: 'Reverse Logistics Workflow',
    question: 'How does the White-Glove Mail-In Repair program work from start to finish?',
    answer:
      'Our white-glove repair system takes the hassle out of device repairs through a seamless 5-stage lifecycle:',
    bulletPoints: [
      '1. Digital Intake: Select your replacement screen or battery bundle on our storefront and describe the hardware symptoms.',
      '2. Express Packaging Kit Dispatch: We rush-ship a custom mailer box with pre-cut high-density foam, ESD sleeve, and pre-printed UN3481 hazmat markings via UPS Next Day or FedEx Overnight.',
      '3. Inbound Reverse Transit: Place your device in the kit and hand it to the courier. The return label is Pay-On-Use, so shipping is completely free for you.',
      '4. Bench Triage & Precision Repair: Technicians scan the barcode, photograph the device, perform diagnostic bus testing, replace components at grounded ESD benches, and execute quality assurance checks.',
      '5. Insured Return Delivery: Your fully tested device is packaged securely and shipped back to your door via insured transit at $0 extra charge.',
    ],
  },
  {
    id: 'repair-free-shipping',
    category: 'mail-in-repair',
    categoryLabel: 'White-Glove Mail-In Repair',
    badgeTone: 'emerald',
    statuteTag: 'Pay-On-Use API Infrastructure',
    question: 'Is return shipping really 100% free?',
    answer:
      'Yes! Return shipping is 100% free with zero hidden fees. DisplayCellPros utilizes scan-based Pay-On-Use (POU) return logistics. You never have to pay for shipping labels, packaging boxes, or return postage. All outbound packaging and return shipments include declared-value carrier insurance.',
  },
  {
    id: 'repair-pre-auth-hold',
    category: 'mail-in-repair',
    categoryLabel: 'White-Glove Mail-In Repair',
    badgeTone: 'emerald',
    statuteTag: 'Risk Management',
    question: 'Why is there a temporary $25 pre-authorization hold during checkout?',
    answer:
      'Because we dispatch high-quality custom packaging kits with expedited overnight air freight at our expense, a temporary $25 pre-authorization hold is placed on your card at checkout to prevent kit abandonment. This hold is NOT a charge and is automatically released the moment our central repair depot scans your returning package barcode upon arrival.',
  },
  {
    id: 'repair-out-of-scope-damage',
    category: 'mail-in-repair',
    categoryLabel: 'White-Glove Mail-In Repair',
    badgeTone: 'emerald',
    statuteTag: 'Secondary Approval Gate',
    question: 'What happens if technicians discover additional unexpected damage inside my device?',
    answer:
      'We enforce a strict Secondary Approval Gate to protect you from unexpected repair charges. If our diagnostic testing detects underlying out-of-scope issues (such as water corrosion, shorted capacitors, or bent frame housing):',
    bulletPoints: [
      'Work Pauses Immediately: Technicians halt service and log high-resolution microscopic photos of the damage to your ticket.',
      'Digital Quote Notification: You receive an automated SMS and email containing photo evidence and an itemized supplemental estimate.',
      'You Are in Control: Work resumes only after you grant digital authorization. If you choose not to proceed, your device is reassembled and returned.',
    ],
  },

  // Category 4: Battery Safety & Pre-Shipment SOP
  {
    id: 'battery-iata-rules',
    category: 'battery-safety',
    categoryLabel: 'Battery Safety & SOP',
    badgeTone: 'blue',
    statuteTag: 'DOT 49 CFR 173.185 & IATA PI 967',
    question: 'Why must device batteries be discharged below 30% before shipping?',
    answer:
      'Lithium-ion batteries contained inside mobile devices are classified as Class 9 Miscellaneous Dangerous Goods under Department of Transportation (DOT) 49 CFR 173.185 and International Air Transport Association (IATA) Packing Instruction 967 regulations. Damaged electronic devices transported via air freight must maintain a State of Charge (SoC) below 30% to prevent thermal runaway risks.',
    bulletPoints: [
      'Customer Responsibility: Please use your device until the battery indicator reads under 30% before powering down.',
      'UN3481 Packaging Markings: Our express mailer boxes are pre-printed with official UN3481 red-hatched dangerous goods warning borders and a 24/7 emergency response hotline.',
    ],
  },
  {
    id: 'battery-damaged-swollen',
    category: 'battery-safety',
    categoryLabel: 'Battery Safety & SOP',
    badgeTone: 'blue',
    statuteTag: 'DDR Battery Safety Protocols',
    question: 'Can I mail in a device with a severely swollen, punctured, or leaking battery?',
    answer:
      'Under DOT regulations (49 CFR 173.185(f)), Damaged, Defective, or Recalled (DDR) lithium batteries are strictly prohibited from all air transport due to severe fire hazard. If your device has a bulging back cover, visible battery expansion, or smells of chemicals:',
    bulletPoints: [
      'Notify Us During Intake: Mark the "Swollen Battery" checkbox during online intake.',
      'Ground Transit Only: We will dispatch specialized fire-rated packaging for Ground Transport Only.',
      'Never Compress: Do not apply pressure or attempt to puncture the battery housing.',
    ],
  },
  {
    id: 'battery-data-security-sop',
    category: 'battery-safety',
    categoryLabel: 'Battery Safety & SOP',
    badgeTone: 'blue',
    statuteTag: 'Mandatory Pre-Shipment SOP',
    question: 'What pre-shipment steps must I complete before packaging my device?',
    answer:
      'To guarantee a rapid 24–48 hour turnaround and protect your privacy, you must complete four simple steps before placing your phone or laptop in the kit:',
    bulletPoints: [
      '1. Back Up Your Data: Perform a complete backup to iCloud, Google Drive, or an external drive. Service centers cannot guarantee data integrity during motherboard repairs.',
      '2. Disable Activation Locks: Turn off Apple Find My, Google FRP, and remove passcodes so technicians can test display digitizers and touch sensors.',
      '3. Power Down: Ensure the device is fully shut down with battery discharged below 30%.',
      '4. Strip Accessories: Remove phone cases, screen protectors, SIM cards, and memory cards.',
    ],
  },
]

export const ServicesFaqAccordion: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'tax-exemption-criteria': true,
    'discount-what-is-it': true,
    'repair-5-stage-lifecycle': true,
  })

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const expandAll = () => {
    const all: Record<string, boolean> = {}
    FAQ_DATABASE.forEach((item) => {
      all[item.id] = true
    })
    setExpandedIds(all)
  }

  const collapseAll = () => {
    setExpandedIds({})
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return FAQ_DATABASE.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.category === activeCategory
      const matchesSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        (item.bulletPoints && item.bulletPoints.some((b) => b.toLowerCase().includes(query))) ||
        (item.statuteTag && item.statuteTag.toLowerCase().includes(query))
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  return (
    <div
      id="services-faq-accordion-section"
      className="space-y-6"
      data-testid="services-faq-accordion"
    >
      {/* Search and Category Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-neutral-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs (e.g., 20% discount, CDTFA-146, UN3481, return label, SOP)..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 bg-neutral-50/50 text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Global Expand/Collapse controls */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-950 px-2 py-1 rounded transition-colors"
          >
            Expand All
          </button>
          <span className="text-neutral-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-950 px-2 py-1 rounded transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeCategory === 'all'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          All Topics ({FAQ_DATABASE.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('tribal-tax')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
            activeCategory === 'tribal-tax'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>Tribal Sales Tax Exemption</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('tribal-discount')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
            activeCategory === 'tribal-discount'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          <Percent className="w-3.5 h-3.5 text-amber-500" />
          <span>20% Official Discount</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('mail-in-repair')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
            activeCategory === 'mail-in-repair'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-emerald-500" />
          <span>White-Glove Mail-In Repair</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('battery-safety')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
            activeCategory === 'battery-safety'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          <BatteryCharging className="w-3.5 h-3.5 text-blue-500" />
          <span>Battery Safety &amp; SOP</span>
        </button>
      </div>

      {/* Accordion List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-500 text-xs sm:text-sm">
          No questions found matching your search. Try another query or reset the category filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isExpanded = Boolean(expandedIds[item.id])
            const isAmber = item.badgeTone === 'amber'
            const isEmerald = item.badgeTone === 'emerald'

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-150 overflow-hidden ${
                  isExpanded
                    ? isAmber
                      ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                      : isEmerald
                        ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                        : 'border-blue-300 bg-blue-50/20 shadow-xs'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  aria-expanded={isExpanded}
                  className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                      <span
                        className={
                          isAmber
                            ? 'text-amber-800'
                            : isEmerald
                              ? 'text-emerald-800'
                              : 'text-blue-800'
                        }
                      >
                        {item.categoryLabel}
                      </span>
                      {item.statuteTag && (
                        <>
                          <span className="text-neutral-300">·</span>
                          <span className="text-neutral-500 font-mono">{item.statuteTag}</span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                      {item.question}
                    </h4>
                  </div>

                  <div
                    className={`p-1.5 rounded-lg border transition-transform shrink-0 mt-0.5 ${
                      isExpanded
                        ? 'rotate-180 bg-neutral-900 text-white border-neutral-900'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-neutral-100 text-xs sm:text-sm text-neutral-700 leading-relaxed space-y-3">
                    <p>{item.answer}</p>
                    {item.bulletPoints && item.bulletPoints.length > 0 && (
                      <ul className="space-y-2 pl-2">
                        {item.bulletPoints.map((bp, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 shrink-0 mt-2" />
                            <span>{bp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ServicesFaqAccordion
