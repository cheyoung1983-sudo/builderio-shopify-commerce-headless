import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DollarSign, RotateCcw, SlidersHorizontal } from 'lucide-react'

export interface PriceRangeSliderProps {
  /** Lowest selectable price (e.g. catalog minimum) */
  min: number
  /** Highest selectable price (e.g. catalog maximum) */
  max: number
  /** Currently selected price range [min, max] */
  value: [number, number]
  /** Callback fired when the range changes */
  onChange: (range: [number, number]) => void
  /** Currency code (default: USD) */
  currencyCode?: string
  /** Minimum step between slider values */
  step?: number
  /** Number of products currently matching this price range */
  matchCount?: number
  /** Total products before price filtering */
  totalCount?: number
  /** Callback to reset the price filter back to full range */
  onReset?: () => void
  /** Whether the price filter is currently active (differs from full range) */
  isFiltered?: boolean
  /** Optional custom container class name */
  className?: string
}

export const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  currencyCode = 'USD',
  step = 1,
  matchCount,
  totalCount,
  onReset,
  isFiltered = false,
  className = '',
}) => {
  // Ensure non-zero span
  const safeMin = Math.floor(Math.max(0, min))
  const safeMax = Math.ceil(Math.max(safeMin + 10, max))

  const [localMin, setLocalMin] = useState<number>(value[0])
  const [localMax, setLocalMax] = useState<number>(value[1])
  const [inputMinStr, setInputMinStr] = useState<string>(String(Math.round(value[0])))
  const [inputMaxStr, setInputMaxStr] = useState<string>(String(Math.round(value[1])))

  // Synchronize internal state when value prop changes externally
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalMin(value[0])
    setLocalMax(value[1])
    setInputMinStr(String(Math.round(value[0])))
    setInputMaxStr(String(Math.round(value[1])))
  }, [value])

  // Calculate percentage positions for track fill
  const minPercent = useMemo(() => {
    const range = safeMax - safeMin
    if (range <= 0) return 0
    return Math.min(100, Math.max(0, ((localMin - safeMin) / range) * 100))
  }, [localMin, safeMin, safeMax])

  const maxPercent = useMemo(() => {
    const range = safeMax - safeMin
    if (range <= 0) return 100
    return Math.min(100, Math.max(0, ((localMax - safeMin) / range) * 100))
  }, [localMax, safeMin, safeMax])

  // Format currency
  const formatPrice = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(amount)
    },
    [currencyCode]
  )

  // Handle min thumb dragging
  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), localMax - step)
    setLocalMin(newMin)
    setInputMinStr(String(Math.round(newMin)))
    onChange([newMin, localMax])
  }

  // Handle max thumb dragging
  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), localMin + step)
    setLocalMax(newMax)
    setInputMaxStr(String(Math.round(newMax)))
    onChange([localMin, newMax])
  }

  // Handle min text input commit
  const handleMinInputBlur = () => {
    let parsed = parseFloat(inputMinStr)
    if (isNaN(parsed)) parsed = safeMin
    const clamped = Math.max(safeMin, Math.min(parsed, localMax - step))
    setLocalMin(clamped)
    setInputMinStr(String(Math.round(clamped)))
    onChange([clamped, localMax])
  }

  // Handle max text input commit
  const handleMaxInputBlur = () => {
    let parsed = parseFloat(inputMaxStr)
    if (isNaN(parsed)) parsed = safeMax
    const clamped = Math.min(safeMax, Math.max(parsed, localMin + step))
    setLocalMax(clamped)
    setInputMaxStr(String(Math.round(clamped)))
    onChange([localMin, clamped])
  }

  // Handle Enter key inside numeric inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isMin: boolean) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
      if (isMin) handleMinInputBlur()
      else handleMaxInputBlur()
    }
  }

  // Generate smart price preset brackets based on safeMin and safeMax
  const presets = useMemo(() => {
    const diff = safeMax - safeMin
    if (diff < 30) {
      return []
    }

    const mid1 = Math.round((safeMin + diff * 0.33) / 10) * 10
    const mid2 = Math.round((safeMin + diff * 0.66) / 10) * 10

    return [
      {
        id: 'preset-all',
        label: 'All Prices',
        range: [safeMin, safeMax] as [number, number],
      },
      {
        id: 'preset-tier1',
        label: `Under ${formatPrice(mid1)}`,
        range: [safeMin, mid1] as [number, number],
      },
      {
        id: 'preset-tier2',
        label: `${formatPrice(mid1)} – ${formatPrice(mid2)}`,
        range: [mid1, mid2] as [number, number],
      },
      {
        id: 'preset-tier3',
        label: `${formatPrice(mid2)}+`,
        range: [mid2, safeMax] as [number, number],
      },
    ]
  }, [safeMin, safeMax, formatPrice])

  return (
    <div
      id="catalog-price-range-slider-widget"
      className={`space-y-4 ${className}`}
    >
      {/* Header with active range & reset */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Price Range
          </span>
          {isFiltered && (
            <span
              id="price-filter-active-pill"
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"
            >
              Active
            </span>
          )}
        </div>

        {isFiltered && onReset && (
          <button
            type="button"
            id="price-slider-reset-btn"
            onClick={onReset}
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Selected Range Visual Badge */}
      <div
        id="price-slider-range-badge"
        className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-700"
      >
        <span className="text-neutral-500 font-medium">Current View:</span>
        <span className="font-bold text-neutral-900 text-sm">
          {formatPrice(localMin)}{' '}
          <span className="font-normal text-neutral-400">—</span>{' '}
          {formatPrice(localMax)}
        </span>
      </div>

      {/* Slider Track Area */}
      <div className="relative pt-2 pb-2 px-1">
        {/* Visual Track container */}
        <div className="relative w-full h-2 rounded-full bg-neutral-200">
          {/* Active Highlighted Range Track */}
          <div
            id="price-slider-highlight-track"
            className="absolute top-0 h-2 rounded-full bg-emerald-600 transition-all duration-75"
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(0, maxPercent - minPercent)}%`,
            }}
          />
        </div>

        {/* Dual Input Range Sliders (HTML5) */}
        <input
          type="range"
          id="price-slider-min-input"
          min={safeMin}
          max={safeMax}
          step={step}
          value={localMin}
          onChange={handleMinSliderChange}
          aria-label={`Minimum price: ${formatPrice(localMin)}`}
          className="range-slider-input top-2 left-0 z-20"
        />
        <input
          type="range"
          id="price-slider-max-input"
          min={safeMin}
          max={safeMax}
          step={step}
          value={localMax}
          onChange={handleMaxSliderChange}
          aria-label={`Maximum price: ${formatPrice(localMax)}`}
          className="range-slider-input top-2 left-0 z-20"
        />

        {/* Min / Max Labels under track */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium mt-3 px-0.5">
          <span>{formatPrice(safeMin)}</span>
          <span>{formatPrice(safeMax)}</span>
        </div>
      </div>

      {/* Numeric Min / Max Inputs for precise typing */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div>
          <label
            htmlFor="price-min-num-field"
            className="block text-[11px] font-semibold text-neutral-600 mb-1"
          >
            Min Price
          </label>
          <div className="relative rounded-lg shadow-xs">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-neutral-400 text-xs font-semibold">
              $
            </span>
            <input
              type="number"
              id="price-min-num-field"
              min={safeMin}
              max={localMax - step}
              step={step}
              value={inputMinStr}
              onChange={(e) => setInputMinStr(e.target.value)}
              onBlur={handleMinInputBlur}
              onKeyDown={(e) => handleKeyDown(e, true)}
              className="block w-full rounded-lg border border-neutral-300 bg-white py-1.5 pl-6 pr-2 text-xs font-semibold text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder={String(safeMin)}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="price-max-num-field"
            className="block text-[11px] font-semibold text-neutral-600 mb-1"
          >
            Max Price
          </label>
          <div className="relative rounded-lg shadow-xs">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-neutral-400 text-xs font-semibold">
              $
            </span>
            <input
              type="number"
              id="price-max-num-field"
              min={localMin + step}
              max={safeMax}
              step={step}
              value={inputMaxStr}
              onChange={(e) => setInputMaxStr(e.target.value)}
              onBlur={handleMaxInputBlur}
              onKeyDown={(e) => handleKeyDown(e, false)}
              className="block w-full rounded-lg border border-neutral-300 bg-white py-1.5 pl-6 pr-2 text-xs font-semibold text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder={String(safeMax)}
            />
          </div>
        </div>
      </div>

      {/* Quick Price Preset Buttons */}
      {presets.length > 0 && (
        <div className="pt-2 border-t border-neutral-100">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Quick Brackets
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const isActive =
                Math.abs(localMin - preset.range[0]) <= step &&
                Math.abs(localMax - preset.range[1]) <= step

              return (
                <button
                  key={preset.id}
                  type="button"
                  id={`price-preset-btn-${preset.id}`}
                  onClick={() => {
                    setLocalMin(preset.range[0])
                    setLocalMax(preset.range[1])
                    setInputMinStr(String(Math.round(preset.range[0])))
                    setInputMaxStr(String(Math.round(preset.range[1])))
                    onChange(preset.range)
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Product count indicator */}
      {typeof matchCount === 'number' && (
        <div
          id="price-slider-match-count"
          className="pt-1 text-[11px] text-neutral-500 flex items-center justify-between"
        >
          <span>Matching products:</span>
          <span className="font-semibold text-neutral-800">
            {matchCount} {matchCount === 1 ? 'item' : 'items'}
            {typeof totalCount === 'number' && totalCount > 0 && (
              <span className="text-neutral-400 font-normal ml-1">
                (of {totalCount})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

export default PriceRangeSlider
