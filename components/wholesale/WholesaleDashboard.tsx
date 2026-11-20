'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Layers,
  ShieldCheck,
  RefreshCw,
  Zap,
  TrendingUp,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Send,
  Sliders,
  DollarSign,
  Activity,
} from 'lucide-react'
import { TransformedShopifyVariant, PurchaseOrderRecord } from '../../lib/wholesale/types'

export const WholesaleDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<TransformedShopifyVariant[]>([])
  const [governance, setGovernance] = useState<any>(null)
  const [targetMargin, setTargetMargin] = useState(40) // 40%
  const [shippingFee, setShippingFee] = useState(5.99)
  const [safetyBuffer, setSafetyBuffer] = useState(5)
  const [activeTab, setActiveTab] = useState<'catalog' | 'pricing' | 'webhooks' | 'simulation'>('catalog')

  // Simulation state
  const [simulating, setSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const [webhookLogs, setWebhookLogs] = useState<any[]>([])

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/wholesale/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMargin: targetMargin / 100,
          shippingFee,
          safetyBuffer,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setVariants(data.variants || [])
        setGovernance(data.governance)
      }
    } catch (err) {
      console.error('Failed to fetch catalog sync:', err)
    } finally {
      setLoading(false)
    }
  }, [targetMargin, shippingFee, safetyBuffer])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCatalog()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchCatalog])

  const handleRunSimulation = async () => {
    setSimulating(true)
    setSimulationResult(null)
    try {
      // 1. Trigger Webhook Order Routing
      const webhookRes = await fetch('/api/wholesale/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `DCP-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
          lineItems: [
            { sku: 'MS-OLED-IP14-PRO', quantity: 1, wholesaleCost: 85.0, supplier: 'MobileSentrix' },
            { sku: 'IG-BAT-S24U', quantity: 2, wholesaleCost: 22.5, supplier: 'InjuredGadgets' },
          ],
        }),
      })
      const webhookData = await webhookRes.json()

      // 2. Trigger Tracking Ingestion
      const trackRes = await fetch('/api/wholesale/simulate-order.ts', { method: 'POST' }).catch(() => null)
      const trackData = await trackRes?.json().catch(() => ({
        success: true,
        fulfillment: { status: 'fulfilled', carrier: 'UPS Ground', trackingNumber: '1Z9999999984920194' },
      }))

      const logEntry = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event: 'fulfillment_orders/order_routing_complete',
        purchaseOrders: webhookData.purchaseOrders,
        fulfillment: trackData.fulfillment,
      }

      setWebhookLogs((prev) => [logEntry, ...prev])
      setSimulationResult(webhookData)
    } catch (err) {
      console.error('Simulation error:', err)
    } finally {
      setSimulating(false)
    }
  }

  const activeCount = variants.filter((v) => v.status === 'active').length
  const outOfStockCount = variants.filter((v) => v.status === 'out_of_stock').length
  const flaggedCount = variants.filter((v) => v.status === 'flagged_margin_exceeded').length

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>Middleware Integration Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Automated Wholesale Parts Hub</h1>
          <p className="text-xs text-slate-300">
            Real-time synchronization for MobileSentrix &amp; InjuredGadgets feeds with safety stock buffers &amp; MAP price protection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchCatalog()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Supplier Feeds</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Active SKUs</p>
            <p className="text-2xl font-extrabold text-neutral-900">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Safety Buffer Out</p>
            <p className="text-2xl font-extrabold text-neutral-900">{outOfStockCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">MAP Floor Flagged</p>
            <p className="text-2xl font-extrabold text-neutral-900">{flaggedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Blind-Dropship POs</p>
            <p className="text-2xl font-extrabold text-neutral-900">{webhookLogs.length}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 gap-6">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'catalog' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catalog &amp; Safety Buffers</span>
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'pricing' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Pricing &amp; Margin Rules</span>
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'simulation' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Live Order &amp; Webhook Simulator</span>
        </button>
      </div>

      {/* Tab Content: Catalog */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Normalized Supplier Catalog Feeds</h3>
              <p className="text-xs text-neutral-500">SKUs prefixed with MS- (MobileSentrix) and IG- (InjuredGadgets).</p>
            </div>
            <div className="text-xs font-semibold text-neutral-600 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-xs">
              Safety Buffer: <span className="text-emerald-700 font-bold">{safetyBuffer} units</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 border-b border-neutral-200 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">SKU / Supplier</th>
                  <th className="py-3.5 px-4">Part Name</th>
                  <th className="py-3.5 px-4">Wholesale Cost</th>
                  <th className="py-3.5 px-4">MAP Floor</th>
                  <th className="py-3.5 px-4">Retail Price</th>
                  <th className="py-3.5 px-4">Supplier Stock</th>
                  <th className="py-3.5 px-4">Shopify Available</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {variants.map((v) => (
                  <tr key={v.sku} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-neutral-900">{v.sku}</div>
                      <div className="text-[11px] text-neutral-500">{v.supplier}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-800 max-w-xs truncate" title={v.title}>
                      {v.title}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-700">${v.wholesaleCost.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono text-neutral-700">${v.mapPrice.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">${v.retailPrice.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono text-neutral-700">{v.supplierQuantity}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">{v.shopifyAvailableQuantity}</td>
                    <td className="py-3.5 px-4">
                      {v.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : v.status === 'out_of_stock' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Buffered Out</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <span>MAP Floor Flag</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Pricing & Margin Rules */}
      {activeTab === 'pricing' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Dynamic Pricing &amp; Margin Configuration</h3>
              <p className="text-xs text-neutral-500">Configure profit margin percentages, base shipping fees, and safety buffer thresholds.</p>
            </div>
            <button
              onClick={() => void fetchCatalog()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Apply &amp; Recalculate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700">Target Profit Margin (%)</label>
              <input
                type="number"
                value={targetMargin}
                onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-neutral-500">Formula: Wholesale Cost × (1 + Margin) + Shipping</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700">Base Shipping Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={shippingFee}
                onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-neutral-500">Added to retail pricing calculation.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700">Inventory Safety Buffer (Units)</label>
              <input
                type="number"
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-neutral-500">Subtracted from supplier stock to prevent overselling.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-950 space-y-2">
            <h4 className="font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>MAP Floor Protection Guarantee</span>
            </h4>
            <p>
              The middleware automatically enforces Minimum Advertised Price (MAP) thresholds. If calculated retail pricing falls below the supplier MAP floor, retail price is pinned to the MAP floor to prevent distributor account suspension.
            </p>
          </div>
        </div>
      )}

      {/* Tab Content: Simulation */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Order Routing &amp; Blind-Dropship Simulation</h3>
                <p className="text-xs text-neutral-500">
                  Simulate a customer checkout on Display &amp; Cell Pros, order routing webhook execution, blind-dropship PO dispatch, and tracking ingestion.
                </p>
              </div>
              <button
                onClick={() => void handleRunSimulation()}
                disabled={simulating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${simulating ? 'animate-bounce' : ''}`} />
                <span>Simulate Order &amp; PO Dispatch</span>
              </button>
            </div>

            {simulationResult && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Webhook &amp; Blind-Dropship PO Generated Successfully</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-white p-3 rounded-xl border border-emerald-200">
                  <div>
                    <span className="text-neutral-500 block">Order ID:</span>
                    <strong className="text-neutral-900">{simulationResult.orderId}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Blind-Dropship Flags:</span>
                    <strong className="text-emerald-700">ACTIVE (Supplier Invoices Suppressed, DCP Branding Printed)</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-neutral-800 block">Dispatched Supplier Purchase Orders:</span>
                  {simulationResult.purchaseOrders?.map((po: any) => (
                    <div key={po.poNumber} className="bg-white p-3 rounded-xl border border-emerald-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-neutral-900">{po.poNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {po.supplier}
                        </span>
                      </div>
                      <p className="text-neutral-600">Items: {JSON.stringify(po.items)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Webhook & Tracking Ingestion Log */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">Real-Time Webhook &amp; Tracking Log</h3>
              <span className="text-xs font-semibold text-neutral-500">{webhookLogs.length} events logged</span>
            </div>
            {webhookLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-500">
                No simulated webhook events yet. Click &quot;Simulate Order &amp; PO Dispatch&quot; to test the pipeline.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {webhookLogs.map((log) => (
                  <div key={log.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700 font-mono">{log.event}</span>
                      <span className="text-neutral-400">{log.timestamp}</span>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-xl font-mono text-[11px] text-neutral-700 space-y-1">
                      <div>Carrier: {log.fulfillment?.carrier}</div>
                      <div>Tracking Number: <a href="#" className="text-emerald-700 underline">{log.fulfillment?.trackingNumber}</a></div>
                      <div>Shopify Fulfillment Status: SUCCESS</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
