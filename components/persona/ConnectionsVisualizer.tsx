'use client'

import React from 'react'
import { Network, Database, GitBranch, ArrowRightLeft, FileCode, Users } from 'lucide-react'

export interface ConnectionsVisualizerProps {
  className?: string
}

export function ConnectionsVisualizer({ className = '' }: ConnectionsVisualizerProps) {
  return (
    <div className={`p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
          <Network className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-neutral-900">Connections & Relations Visualizer</h3>
          <p className="text-xs text-neutral-500">Mapping formal associations across Transactions, Accounts, and Workflows</p>
        </div>
      </div>

      {/* Visualizer Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Node: Transactions */}
        <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-white">
            <FileCode className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold">Transactions</span>
          </div>
          <p className="text-[11px] text-neutral-400">Triggers Persona Workflows across the product ecosystem.</p>
        </div>

        {/* Node: Accounts */}
        <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold">Accounts</span>
          </div>
          <p className="text-[11px] text-neutral-400">Source-of-truth connection point for user identity data.</p>
        </div>

        {/* Node: Workflows */}
        <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-white">
            <GitBranch className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold">Workflows</span>
          </div>
          <p className="text-[11px] text-neutral-400">Orchestrates business logic and queries related objects.</p>
        </div>
      </div>

      {/* Connection Logic Info */}
      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3">
        <ArrowRightLeft className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h5 className="text-xs font-bold text-blue-900">Relation Schema Mapping</h5>
          <p className="text-xs text-blue-800 leading-relaxed">
            Formal relations connect Transactions to Accounts via key-based relationship fields. Configure your schema to mirror your business&apos;s worldview, enabling cross-product querying of related objects in Workflow Runs.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ConnectionsVisualizer
