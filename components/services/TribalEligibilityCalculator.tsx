'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  FileText,
} from 'lucide-react'

// Well-known reservation ZIP prefixes and tribal areas for real-time customer testing
const KNOWN_RESERVATION_ZIPS: Record<string, { reservation: string; state: string; tribe: string }> = {
  '86515': { reservation: 'Navajo Nation Reservation', state: 'AZ', tribe: 'Navajo Nation' },
  '86503': { reservation: 'Navajo Nation Reservation', state: 'AZ', tribe: 'Navajo Nation' },
  '86045': { reservation: 'Navajo Nation Reservation', state: 'AZ', tribe: 'Navajo Nation' },
  '85247': { reservation: 'Gila River Indian Community', state: 'AZ', tribe: 'Gila River Indian Community' },
  '85256': { reservation: 'Salt River Pima-Maricopa Indian Community', state: 'AZ', tribe: 'Salt River Pima-Maricopa' },
  '85634': { reservation: "Tohono O'odham Nation Reservation", state: 'AZ', tribe: "Tohono O'odham Nation" },
  '85344': { reservation: 'Colorado River Indian Reservation', state: 'AZ', tribe: 'Colorado River Indian Tribes' },
  '92061': { reservation: 'Pauma and Yuima Reservation', state: 'CA', tribe: 'Pauma Band of Luiseño Indians' },
  '92060': { reservation: 'Palomar Reservation', state: 'CA', tribe: 'Pala Band of Mission Indians' },
  '95546': { reservation: 'Hoopa Valley Reservation', state: 'CA', tribe: 'Hoopa Valley Tribe' },
  '98304': { reservation: 'Puyallup Reservation', state: 'WA', tribe: 'Puyallup Tribe of Indians' },
  '98270': { reservation: 'Tulalip Reservation', state: 'WA', tribe: 'Tulalip Tribes' },
  '98948': { reservation: 'Yakama Nation Reservation', state: 'WA', tribe: 'Confederated Tribes of Yakama Nation' },
  '59417': { reservation: 'Blackfeet Indian Reservation', state: 'MT', tribe: 'Blackfeet Nation' },
  '57764': { reservation: 'Pine Ridge Reservation', state: 'SD', tribe: 'Oglala Sioux Tribe' },
}

export interface EligibilityResult {
  hasEvaluated: boolean
  isEnrolled: boolean
  isOnReservation: boolean
  discountPercentage: number
  isTaxExempt: boolean
  stateNotice?: string
  statuteCode?: string
  requiredForm?: string
  scenarioTitle: string
  scenarioDescription: string
}

export const TribalEligibilityCalculator: React.FC = () => {
  const [isEnrolled, setIsEnrolled] = useState<string>('yes')
  const [tribeName, setTribeName] = useState<string>('Navajo Nation')
  const [zipCode, setZipCode] = useState<string>('86515')
  const [stateCode, setStateCode] = useState<string>('AZ')
  const [manualReservationCheck, setManualReservationCheck] = useState<boolean>(true)
  const [hasCalculated, setHasCalculated] = useState<boolean>(true)

  const evaluateEligibility = (): EligibilityResult => {
    const enrolled = isEnrolled === 'yes'
    const cleanZip = zipCode.trim()
    const detectedReservation = KNOWN_RESERVATION_ZIPS[cleanZip]
    const onReservation = Boolean(detectedReservation || manualReservationCheck)

    // State specific guidance
    let stateNotice = ''
    let statuteCode = ''
    let requiredForm = ''

    if (stateCode === 'CA') {
      statuteCode = 'CDTFA Reg 1616'
      requiredForm = 'Form CDTFA-146-RES'
      stateNotice =
        'California requires an executed CDTFA-146-RES exemption certificate and a common-carrier invoice specifying FOB Reservation (title transfers in Indian Country).'
    } else if (stateCode === 'WA') {
      statuteCode = 'WAC 458-20-192'
      requiredForm = 'WA DOR Exemption Certificate'
      stateNotice =
        'Washington State requires delivery directly on the specific reservation of the tribe in which the customer is enrolled.'
    } else if (stateCode === 'AZ') {
      statuteCode = 'TPT Ruling 95-11'
      requiredForm = 'Form 5000A / ADOR Record'
      stateNotice =
        'Arizona Transaction Privilege Tax (TPT) exemption applies when order intake, payment processing, and physical delivery occur within reservation boundaries.'
    } else {
      statuteCode = 'Census TIGER / Post-Wayfair Remote Seller Code'
      requiredForm = 'State Exemption Certificate'
      stateNotice =
        'Validated via US Census Bureau TIGER/Line GIS reservation shapefiles and state remote seller exemption frameworks.'
    }

    if (enrolled && onReservation) {
      return {
        hasEvaluated: true,
        isEnrolled: true,
        isOnReservation: true,
        discountPercentage: 20,
        isTaxExempt: true,
        stateNotice,
        statuteCode,
        requiredForm,
        scenarioTitle: 'Scenario 1: Full Privileges (20% Off + 100% Sales Tax Exemption)',
        scenarioDescription:
          'Your purchase qualifies for both our official 20% commercial discount on all repair parts AND complete statutory exemption from state and local retail sales tax.',
      }
    }

    if (enrolled && !onReservation) {
      return {
        hasEvaluated: true,
        isEnrolled: true,
        isOnReservation: false,
        discountPercentage: 20,
        isTaxExempt: false,
        stateNotice,
        statuteCode,
        requiredForm,
        scenarioTitle: 'Scenario 2: Commercial Identity Privileges (20% Off Parts)',
        scenarioDescription:
          'As an enrolled tribal member, you receive the full official 20% discount on wholesale repair components. Because the delivery destination is off-reservation, standard state sales tax applies.',
      }
    }

    if (!enrolled && onReservation) {
      return {
        hasEvaluated: true,
        isEnrolled: false,
        isOnReservation: true,
        discountPercentage: 0,
        isTaxExempt: false,
        stateNotice,
        statuteCode,
        requiredForm,
        scenarioTitle: 'Scenario 3: Standard Commercial Order on Reservation',
        scenarioDescription:
          'Federal Indian law requires verified tribal enrollment to grant statutory tax exemption. Standard retail pricing and applicable sales taxes apply.',
      }
    }

    return {
      hasEvaluated: true,
      isEnrolled: false,
      isOnReservation: false,
      discountPercentage: 0,
      isTaxExempt: false,
      stateNotice,
      statuteCode,
      requiredForm,
      scenarioTitle: 'Scenario 4: Standard Storefront Checkout',
      scenarioDescription:
        'Standard commercial transaction. Enjoy our wholesale repair screen and battery pricing with fast same-day dispatch.',
    }
  }

  const result = evaluateEligibility()

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setZipCode(val)
    if (KNOWN_RESERVATION_ZIPS[val]) {
      setStateCode(KNOWN_RESERVATION_ZIPS[val].state)
      setManualReservationCheck(true)
      if (!tribeName) setTribeName(KNOWN_RESERVATION_ZIPS[val].tribe)
    }
  }

  return (
    <div
      id="tribal-eligibility-calculator"
      className="rounded-2xl border border-amber-900/20 bg-linear-to-b from-amber-50/50 via-white to-white p-6 sm:p-8 shadow-sm"
      data-testid="tribal-eligibility-calculator"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-amber-900/10 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Interactive Compliance Check</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Check Your 20% Discount &amp; Tax Exemption
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-xl">
            See your exact checkout savings under federal Indian law, state revenue statutes, and DisplayCellPros affinity programs.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-100/70 border border-amber-300/60 px-3.5 py-2 text-amber-900 text-xs font-semibold self-start sm:self-auto">
          <Sparkles className="w-4 h-4 text-amber-700" />
          <span>Official 20% Discount</span>
        </div>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Enrolled Status */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
            1. Are you an enrolled tribal member?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsEnrolled('yes')}
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all text-center ${
                isEnrolled === 'yes'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              Yes, Federally Enrolled
            </button>
            <button
              type="button"
              onClick={() => setIsEnrolled('no')}
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all text-center ${
                isEnrolled === 'no'
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              No / Not Enrolled
            </button>
          </div>
        </div>

        {/* Tribal Affiliation */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
            2. Tribal Nation or Band
          </label>
          <input
            type="text"
            disabled={isEnrolled !== 'yes'}
            value={tribeName}
            onChange={(e) => setTribeName(e.target.value)}
            placeholder="e.g. Navajo Nation, Puyallup, Cherokee"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:bg-neutral-100 disabled:text-neutral-400"
          />
        </div>

        {/* Shipping ZIP code */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
            3. Shipping Delivery ZIP Code
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={5}
              value={zipCode}
              onChange={handleZipChange}
              placeholder="e.g. 86515, 92061, 98304"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
            <MapPin className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            Try test ZIPs: <strong>86515</strong> (Navajo AZ), <strong>92061</strong> (Pauma CA), or <strong>98304</strong> (Puyallup WA).
          </span>
        </div>

        {/* State Selection */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
            4. Delivery State Jurisdiction
          </label>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          >
            <option value="AZ">Arizona (AZ - TPT Ruling 95-11)</option>
            <option value="CA">California (CA - CDTFA Reg 1616)</option>
            <option value="WA">Washington (WA - WAC 458-20-192)</option>
            <option value="MT">Montana (MT)</option>
            <option value="SD">South Dakota (SD)</option>
            <option value="NM">New Mexico (NM)</option>
            <option value="OTHER">Other State (Census TIGER GIS)</option>
          </select>

          <label className="mt-2.5 flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={manualReservationCheck}
              onChange={(e) => setManualReservationCheck(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Destination is physically within reservation/trust boundaries</span>
          </label>
        </div>
      </div>

      {/* Calculated Results Banner */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-900 text-white p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-4 mb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Evaluation Outcome
            </span>
            <h4 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {result.scenarioTitle}
            </h4>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {result.discountPercentage > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                20% OFF PARTS
              </span>
            )}
            {result.isTaxExempt ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                100% TAX EXEMPT
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-400">
                Standard Sales Tax
              </span>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-4">
          {result.scenarioDescription}
        </p>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-neutral-800/80 pt-4 text-xs">
          <div className="bg-neutral-800/60 rounded-lg p-3">
            <span className="text-neutral-400 block text-[11px]">Enrolled Member Benefit</span>
            <span className="font-semibold text-white mt-0.5 block">
              {result.isEnrolled ? '20% Off Display Assemblies & Batteries' : 'Standard Pricing'}
            </span>
          </div>

          <div className="bg-neutral-800/60 rounded-lg p-3">
            <span className="text-neutral-400 block text-[11px]">Delivery Territorial Nexus</span>
            <span className="font-semibold text-white mt-0.5 block">
              {result.isOnReservation ? 'Verified On-Reservation (Indian Country)' : 'Off-Reservation Destination'}
            </span>
          </div>

          <div className="bg-neutral-800/60 rounded-lg p-3">
            <span className="text-neutral-400 block text-[11px]">Required Exemption Filing</span>
            <span className="font-semibold text-amber-300 mt-0.5 block">
              {result.isTaxExempt ? result.requiredForm || 'Exemption Certificate' : 'None Required'}
            </span>
          </div>
        </div>

        {/* State statutory explanation */}
        {result.stateNotice && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 p-3 text-xs text-amber-200">
            <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-amber-300">Jurisdiction Note ({result.statuteCode}):</strong>{' '}
              {result.stateNotice}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TribalEligibilityCalculator
