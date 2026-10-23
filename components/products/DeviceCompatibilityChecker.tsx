'use client'

import React, { useState, useMemo } from 'react'
import {
  Smartphone,
  ChevronRight,
  CheckCircle2,
  Wrench,
  Search,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import {
  SUPPORTED_BRANDS,
  SUPPORTED_PART_CATEGORIES,
  DeviceBrand,
  DeviceModel,
  PartCategory,
} from '../../lib/device-taxonomy'
import { useDeviceCompatibility } from '../../context/DeviceCompatibilityContext'

export interface DeviceCompatibilityCheckerProps {
  className?: string
  onDeviceSelected?: (model: DeviceModel, category?: PartCategory | null) => void
  onClear?: () => void
  compact?: boolean
}

export const DeviceCompatibilityChecker: React.FC<DeviceCompatibilityCheckerProps> = ({
  className = '',
  onDeviceSelected,
  onClear,
  compact = false,
}) => {
  const {
    selectedBrand,
    selectedModel,
    selectedCategory,
    setSelectedBrand,
    setSelectedModel,
    setSelectedCategory,
    clearCompatibilityFilter,
    hasActiveFilter,
  } = useDeviceCompatibility()

  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(!compact || !hasActiveFilter)

  // Current active brand models
  const availableModels = useMemo(() => {
    if (!selectedBrand) return []
    if (!searchQuery.trim()) return selectedBrand.models
    const q = searchQuery.toLowerCase()
    return selectedBrand.models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.modelNumbers && m.modelNumbers.some((n) => n.toLowerCase().includes(q))) ||
        m.searchKeywords.some((k) => k.toLowerCase().includes(q))
    )
  }, [selectedBrand, searchQuery])

  const handleBrandSelect = (brand: DeviceBrand) => {
    if (selectedBrand?.id === brand.id) {
      // Toggle off if already selected
      setSelectedBrand(null)
      setSelectedModel(null)
    } else {
      setSelectedBrand(brand)
      setSelectedModel(null)
    }
  }

  const handleModelSelect = (model: DeviceModel) => {
    setSelectedModel(model)
    onDeviceSelected?.(model, selectedCategory)
  }

  const handleCategorySelect = (category: PartCategory) => {
    if (selectedCategory?.id === category.id) {
      setSelectedCategory(null)
      if (selectedModel) onDeviceSelected?.(selectedModel, null)
    } else {
      setSelectedCategory(category)
      if (selectedModel) onDeviceSelected?.(selectedModel, category)
    }
  }

  const handleReset = () => {
    clearCompatibilityFilter()
    setSearchQuery('')
    onClear?.()
  }

  return (
    <div
      id="parts-compatibility-checker"
      className={`bg-white rounded-2xl border border-neutral-200/90 shadow-sm overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Header Bar with Toggle & Active Status */}
      <div className="px-5 py-4 bg-gradient-to-r from-neutral-50 via-white to-emerald-50/30 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                Phone Model Compatibility Checker
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                Guaranteed Fit
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select your phone to filter 100% verified matching replacement parts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Device
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{isOpen ? 'Minimize' : 'Select Phone'}</span>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-4">
              {/* Step 1: Select Brand */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  1. Select Brand
                </label>
                <div className="grid grid-cols-3 gap-2.5 sm:max-w-md">
                  {SUPPORTED_BRANDS.map((brand) => {
                    const isSelected = selectedBrand?.id === brand.id
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        id={`brand-btn-${brand.id}`}
                        onClick={() => handleBrandSelect(brand)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/20'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                        <span>{brand.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 2: Select Model */}
              {selectedBrand && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      2. Choose {selectedBrand.name} Model
                    </label>
                    <span className="text-[11px] text-neutral-500">
                      {availableModels.length} models available
                    </span>
                  </div>

                  {/* Model Search Filter */}
                  <div className="relative mb-2.5 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-neutral-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={`Filter ${selectedBrand.name} models (e.g. S23, A2650)...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Model Chips Grid */}
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {availableModels.map((model) => {
                      const isSelected = selectedModel?.id === model.id
                      return (
                        <button
                          key={model.id}
                          type="button"
                          id={`model-btn-${model.id}`}
                          onClick={() => handleModelSelect(model)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                            isSelected
                              ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                              : 'bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 border-neutral-200/90'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                          <span>{model.name}</span>
                          {model.releaseYear && (
                            <span className="text-[10px] text-neutral-600 ml-0.5">
                              ({model.releaseYear})
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Filter Part Category (Optional) */}
              {selectedModel && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pt-2 border-t border-neutral-100"
                >
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                    3. Filter by Component Category (Optional)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_PART_CATEGORIES.map((cat) => {
                      const isSelected =
                        (selectedCategory?.id || 'all') === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border-neutral-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Active Selection Summary & Mail-In Repair Escort */}
              {selectedModel && (
                <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/40 -mx-5 -mb-5 p-4 rounded-b-2xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-neutral-800">
                      Filtering catalog for{' '}
                      <strong className="text-emerald-800 font-semibold">
                        {selectedBrand?.name} {selectedModel.name}
                      </strong>
                      {selectedCategory && selectedCategory.id !== 'all' && (
                        <span> &bull; {selectedCategory.name}</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/services?device=${encodeURIComponent(
                        `${selectedBrand?.name || ''} ${selectedModel.name}`
                      )}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors"
                      title="Book our technicians to repair this device"
                    >
                      <Wrench className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Prefer Mail-In Repair?</span>
                      <ArrowRight className="w-3 h-3 text-emerald-700" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DeviceCompatibilityChecker
