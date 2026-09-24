'use client'

import React, { useState, useMemo } from 'react'
import {
  MapPin,
  ShieldCheck,
  Building2,
  Compass,
  Layers,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { GeofenceResult } from '../../lib/tribal/types'
import { KNOWN_TRIBAL_NATIONS } from '../../lib/tribal/geofencing'

export interface AianaReservationMapProps {
  shippingAddress?: {
    address1?: string
    city?: string
    province?: string
    zip?: string
  }
  geofenceResult?: GeofenceResult | null
  className?: string
}

export function AianaReservationMap({
  shippingAddress,
  geofenceResult,
  className = '',
}: AianaReservationMapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [selectedNationId, setSelectedNationId] = useState<string>('navajo-nation')
  const [activeTab, setActiveTab] = useState<'map' | 'boundaries' | 'jurisdiction'>('map')

  // Find matched nation from geofence or fallback to selected
  const matchedNation = useMemo(() => {
    if (geofenceResult?.tribalNation) {
      const found = KNOWN_TRIBAL_NATIONS.find(
        (n) => n.name.toLowerCase() === geofenceResult.tribalNation?.toLowerCase()
      )
      if (found) return found
    }
    return KNOWN_TRIBAL_NATIONS.find((n) => n.id === selectedNationId) || KNOWN_TRIBAL_NATIONS[0]
  }, [geofenceResult, selectedNationId])

  const isUserOnReservation = geofenceResult?.onReservation ?? false

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            AIANA Reservation Boundary & Geofence Map
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Visualizing trust land boundaries and tax jurisdiction relative to your delivery location.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interactive Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('boundaries')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'boundaries' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nation Directory
          </button>
        </div>
      </div>

      {activeTab === 'map' ? (
        <div className="space-y-4">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isUserOnReservation
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {isUserOnReservation ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>
                  {isUserOnReservation
                    ? '📍 Delivery Location Verified On-Reservation'
                    : '📍 Delivery Location Off-Reservation'}
                </span>
                <span className="font-mono bg-white/80 px-2 py-0.5 rounded border text-[10px]">
                  AIANA: {matchedNation.aianaCode}
                </span>
              </div>
              <p className="text-slate-600">
                {geofenceResult?.message ||
                  (isUserOnReservation
                    ? `Eligible for statutory state and local sales tax exemption within ${matchedNation.reservationName}.`
                    : `Commercial 20% member discount is active. Standard state sales tax applies for off-reservation delivery.`)}
              </p>
            </div>
          </div>

          {/* Interactive SVG Canvas Map */}
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[320px]">
            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-slate-800/90 border border-slate-700 p-1 rounded-xl shadow-lg">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2))]
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* SVG Visualizer */}
            <div
              className="relative z-0 transition-transform duration-300 w-full max-w-lg aspect-[16/9] flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <svg viewBox="0 0 500 300" className="w-full h-full drop-shadow-2xl">
                {/* State Boundary */}
                <path
                  d="M 50 50 Q 250 20 450 60 Q 480 150 430 250 Q 250 280 60 240 Q 30 150 50 50 Z"
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth="2"
                />

                {/* AIANA Reservation Polygon Trust Land */}
                <path
                  d="M 120 90 Q 220 70 340 110 Q 380 180 300 220 Q 180 230 110 180 Q 90 120 120 90 Z"
                  fill={isUserOnReservation ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.15)'}
                  stroke={isUserOnReservation ? '#34d399' : '#818cf8'}
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />

                <text x="140" y="140" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {matchedNation.reservationName.length > 28
                    ? `${matchedNation.reservationName.substring(0, 26)}...`
                    : matchedNation.reservationName}
                </text>
                <text x="140" y="156" fill="#64748b" fontSize="9" fontFamily="monospace">
                  AIANA Code: {matchedNation.aianaCode} | State: {matchedNation.state}
                </text>

                {/* User Location Pin */}
                <g transform="translate(260, 160)">
                  <circle cx="0" cy="0" r="16" fill="rgba(244, 63, 94, 0.2)" className="animate-ping" />
                  <circle cx="0" cy="0" r="8" fill="#f43f5e" />
                  <circle cx="0" cy="0" r="4" fill="#ffffff" />
                  <text x="14" y="4" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                    {shippingAddress?.city || 'Shipping Location'} ({shippingAddress?.zip || 'ZIP'})
                  </text>
                </g>
              </svg>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 bg-slate-800/90 border border-slate-700 px-4 py-2.5 rounded-xl text-[11px] text-slate-300">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                  AIANA Reservation Trust Land
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  Delivery Address Pin
                </span>
              </div>
              <span className="font-mono text-slate-400">
                Jurisdiction: {matchedNation.name}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Nation Directory Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {KNOWN_TRIBAL_NATIONS.map((nation) => {
              const isSelected = nation.id === matchedNation.id
              return (
                <div
                  key={nation.id}
                  onClick={() => setSelectedNationId(nation.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{nation.name}</h4>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border">
                      {nation.state}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">{nation.reservationName}</p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>AIANA: {nation.aianaCode}</span>
                    <span className={nation.isSelfAdministered ? 'text-emerald-600 font-bold' : ''}>
                      {nation.isSelfAdministered ? 'Self-Administered' : 'Federal Trust'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default AianaReservationMap
