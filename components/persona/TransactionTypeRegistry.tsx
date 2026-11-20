'use client'

import React, { useState } from 'react'
import { Database, Archive, Search, Settings, AlertTriangle } from 'lucide-react'

export interface TransactionType {
  id: string
  name: string
  fields: string[]
  archived: boolean
}

export function TransactionTypeRegistry({ className = '' }: { className?: string }) {
  const [registry] = useState<TransactionType[]>([
    { id: 'tt_123', name: 'Identity Verification', fields: ['name_first', 'birthdate', 'address_country_code'], archived: false },
    { id: 'tt_456', name: 'Database Screening', fields: ['tax_identification_number', 'document_number'], archived: false },
  ])

  return (
    <div className={`p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-5 ${className}`}>
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Transaction Type Registry & Field Schema</h3>
            <p className="text-xs text-neutral-500">Explore and archive transaction types and associated field schemas</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {registry.map((tt) => (
          <div key={tt.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-neutral-900">{tt.name}</p>
              <code className="text-[10px] text-neutral-500 font-mono">{tt.id}</code>
              <div className="flex gap-1.5 mt-2">
                {tt.fields.map((f) => (
                  <span key={f} className="text-[10px] bg-neutral-200 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            </div>
            <button type="button" className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Archive className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TransactionTypeRegistry
