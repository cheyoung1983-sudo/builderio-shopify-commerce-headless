'use client'

import React, { useState } from 'react'
import {
  Wrench,
  Package,
  Truck,
  BatteryCharging,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react'

export interface RepairDeviceOption {
  id: string
  name: string
  category: 'phone' | 'tablet' | 'laptop'
  partCost: number
  laborCost: number
  estimatedTatHours: string
}

const DEVICE_OPTIONS: RepairDeviceOption[] = [
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro / 15 Pro Max', category: 'phone', partCost: 189.99, laborCost: 35.0, estimatedTatHours: '24-48 hrs' },
  { id: 'iphone-14-13', name: 'iPhone 14 / 13 OLED Display', category: 'phone', partCost: 129.99, laborCost: 35.0, estimatedTatHours: '24-48 hrs' },
  { id: 'samsung-s24-ultra', name: 'Samsung Galaxy S24 Ultra', category: 'phone', partCost: 219.99, laborCost: 35.0, estimatedTatHours: '24-48 hrs' },
  { id: 'pixel-8-pro', name: 'Google Pixel 8 Pro OLED', category: 'phone', partCost: 149.99, laborCost: 35.0, estimatedTatHours: '24-48 hrs' },
  { id: 'ipad-pro-11', name: 'iPad Pro 11" LCD & Digitizer', category: 'tablet', partCost: 169.99, laborCost: 45.0, estimatedTatHours: '48 hrs' },
  { id: 'macbook-air-m2', name: 'MacBook Air M2 Retina Panel', category: 'laptop', partCost: 289.99, laborCost: 55.0, estimatedTatHours: '48-72 hrs' },
]

export const MailInRepairEstimator: React.FC = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('iphone-15-pro')
  const [issueType, setIssueType] = useState<'screen' | 'battery' | 'both'>('screen')
  const [backedUp, setBackedUp] = useState<boolean>(true)
  const [locksDisabled, setLocksDisabled] = useState<boolean>(true)
  const [batteryUnder30, setBatteryUnder30] = useState<boolean>(true)
  const [accessoriesRemoved, setAccessoriesRemoved] = useState<boolean>(true)
  const [kitRequested, setKitRequested] = useState<boolean>(false)
  const [ticketId, setTicketId] = useState<string>('')

  const selectedDevice = DEVICE_OPTIONS.find((d) => d.id === selectedDeviceId) || DEVICE_OPTIONS[0]

  // Calculate pricing
  const basePart = issueType === 'battery' ? 49.99 : selectedDevice.partCost
  const batteryAddon = issueType === 'both' ? 39.99 : 0
  const totalPart = basePart + batteryAddon
  const labor = selectedDevice.laborCost
  const outboundOvernightFreight = 0.0 // Complimentary
  const returnGroundFreight = 0.0 // Complimentary
  const totalRepairPrice = totalPart + labor

  const isSopReady = backedUp && locksDisabled && batteryUnder30 && accessoriesRemoved

  const handleRequestKit = (e: React.FormEvent) => {
    e.preventDefault()
    const generatedTicket = 'DCP-RMS-' + Math.floor(100000 + Math.random() * 900000)
    setTicketId(generatedTicket)
    setKitRequested(true)
  }

  return (
    <div
      id="mail-in-repair-estimator"
      className="rounded-2xl border border-emerald-900/20 bg-linear-to-b from-emerald-50/40 via-white to-white p-6 sm:p-8 shadow-sm"
      data-testid="mail-in-repair-estimator"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-900/10 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold tracking-wider uppercase mb-1">
            <Package className="w-4 h-4 text-emerald-700" />
            <span>White-Glove Reverse Logistics</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Mail-In Repair Estimator &amp; Express Kit
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-xl">
            Free outbound overnight shipping kit, custom ESD foam packaging, and insured return delivery at zero extra shipping cost.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100/70 border border-emerald-300/60 px-3.5 py-2 text-emerald-900 text-xs font-semibold self-start sm:self-auto">
          <Truck className="w-4 h-4 text-emerald-700" />
          <span>$0 Free Return Freight</span>
        </div>
      </div>

      {/* Estimator Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Device & Diagnostic controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Device Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
              1. Select Hardware Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEVICE_OPTIONS.map((dev) => (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => setSelectedDeviceId(dev.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedDeviceId === dev.id
                      ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-semibold ring-1 ring-emerald-600/40'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="text-xs font-medium">{dev.name}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Est. Turnaround: {dev.estimatedTatHours}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Service Needed */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
              2. Service &amp; Component Replacement
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setIssueType('screen')}
                className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${
                  issueType === 'screen'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                Screen / OLED
              </button>
              <button
                type="button"
                onClick={() => setIssueType('battery')}
                className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${
                  issueType === 'battery'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                Battery Only
              </button>
              <button
                type="button"
                onClick={() => setIssueType('both')}
                className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${
                  issueType === 'both'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                Screen + Battery
              </button>
            </div>
          </div>

          {/* Mandatory Pre-Shipment SOP Checklist */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Mandatory Customer Pre-Shipment SOP</span>
            </div>
            <div className="space-y-2.5 text-xs text-neutral-700">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backedUp}
                  onChange={(e) => setBackedUp(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <strong>1. Local/Cloud Data Backup:</strong> I have backed up my data. (Depots cannot guarantee data during board service).
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locksDisabled}
                  onChange={(e) => setLocksDisabled(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <strong>2. Security Locks Disabled:</strong> Apple Find My / Google FRP / Passcodes removed for bench hardware diagnostic testing.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batteryUnder30}
                  onChange={(e) => setBatteryUnder30(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <strong>3. Battery Discharged &lt;30% SoC:</strong> Compliant with DOT 49 CFR 173.185 &amp; IATA PI 967 dangerous goods air transport rules.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accessoriesRemoved}
                  onChange={(e) => setAccessoriesRemoved(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <strong>4. Accessories Stripped:</strong> Cases, screen protectors, SIM cards, and memory cards removed.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right column: Summary Card & Action */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 text-white p-5 sm:p-6 shadow-md h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Transparent Cost Summary
                </span>
                <span className="text-[11px] text-neutral-400">All-Inclusive Bundle</span>
              </div>

              {/* Line items */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-neutral-300">
                  <span>OEM-Grade Replacement Component</span>
                  <span className="font-mono">${totalPart.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Certified Bench Labor &amp; QA Testing</span>
                  <span className="font-mono">${labor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Outbound Express Shipping Kit (Overnight)</span>
                  <span className="text-emerald-400 font-semibold">FREE ($0.00)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Inbound Reverse Transit (Pay-On-Use)</span>
                  <span className="text-emerald-400 font-semibold">FREE ($0.00)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Insured Return Ground Freight</span>
                  <span className="text-emerald-400 font-semibold">FREE ($0.00)</span>
                </div>

                <div className="border-t border-neutral-800 pt-3 mt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Estimated Total</span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">
                    ${totalRepairPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pre-auth & Safety note */}
              <div className="mt-5 space-y-2 rounded-lg bg-neutral-800/70 p-3 text-[11px] text-neutral-300 leading-relaxed">
                <p>
                  <strong>Pre-Auth Hold:</strong> A temporary $25 pre-authorization hold is placed at checkout and automatically released when our central depot scans the arriving kit.
                </p>
                <p>
                  <strong>Secondary Approval Gate:</strong> If our diagnostic bus scan reveals unexpected hidden damage (e.g. liquid ingress), work pauses and we text you photos with an itemized approval link.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 pt-4 border-t border-neutral-800">
              {kitRequested ? (
                <div className="rounded-lg bg-emerald-950/60 border border-emerald-500/40 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Express Kit Dispatch Initiated!</span>
                  </div>
                  <p className="text-[11px] text-neutral-300">
                    Repair Ticket: <strong className="font-mono text-white">{ticketId}</strong>
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Your UN3481 compliant mailer kit will arrive via UPS Next Day / FedEx Priority Overnight within 24 hours.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!isSopReady}
                  onClick={handleRequestKit}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    isSopReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <span>Request Free Mail-In Shipping Kit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {!isSopReady && (
                <p className="text-[11px] text-amber-400 text-center mt-2">
                  Please acknowledge the 4 pre-shipment safety items to proceed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MailInRepairEstimator
