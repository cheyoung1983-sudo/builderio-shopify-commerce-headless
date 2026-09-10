import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  CornerDownLeft,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import {
  searchStorefrontProducts,
  ShopifyProductNode,
  StorefrontGraphQLError,
} from '../../services/shopify'

export interface SearchBarProps {
  /** Placeholder text in the search input */
  placeholder?: string
  /** Controlled value */
  value?: string
  /** Default search query if uncontrolled */
  defaultValue?: string
  /** Callback fired on input keystroke */
  onChange?: (value: string) => void
  /** Callback fired with debounced or submitted search query */
  onSearch?: (term: string) => void
  /** Callback fired right before the Shopify Storefront API request starts */
  onQueryStart?: () => void
  /** Callback fired when Shopify Storefront API returns products */
  onProductsFetched?: (
    products: ShopifyProductNode[],
    term: string,
    errors?: StorefrontGraphQLError[]
  ) => void
  /** Callback fired on query error */
  onError?: (error: string) => void
  /** External loading state override */
  isLoading?: boolean
  /** Whether the component should automatically query the Shopify Storefront API */
  autoQueryShopify?: boolean
  /** Debounce delay in milliseconds (default: 350) */
  debounceMs?: number
  /** Quick filter suggestion chips */
  suggestions?: string[]
  /** Hide quick suggestions */
  hideSuggestions?: boolean
  /** Total results count to display in status */
  resultCount?: number
  /** Custom class names */
  className?: string
  /** Component ID */
  id?: string
  /** Shopify Storefront API sortKey (e.g. 'PRICE', 'RELEVANCE', 'TITLE') */
  sortKey?: string
  /** Reverse sorting order */
  reverse?: boolean
}

const DEFAULT_SUGGESTIONS = ['Galaxy S22', 'OLED', 'LCD', 'Ultra', 'Samsung']

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search screen replacements, parts, models...',
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSearch,
  onQueryStart,
  onProductsFetched,
  onError,
  isLoading: controlledLoading,
  autoQueryShopify = true,
  debounceMs = 350,
  suggestions = DEFAULT_SUGGESTIONS,
  hideSuggestions = false,
  resultCount,
  className = '',
  id = 'storefront-search-bar',
  sortKey,
  reverse,
}) => {
  const isControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState<string>(defaultValue)
  const [isQuerying, setIsQuerying] = useState<boolean>(false)
  const [activeQuery, setActiveQuery] = useState<string>(defaultValue)
  const [hasSearched, setHasSearched] = useState<boolean>(Boolean(defaultValue))

  const queryTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const latestTermRef = useRef<string>(isControlled ? controlledValue : internalValue)

  const currentValue = isControlled ? controlledValue : internalValue
  latestTermRef.current = currentValue
  const loading = controlledLoading ?? isQuerying

  // Execute Storefront API query for the given term
  const executeQuery = useCallback(
    async (term: string) => {
      const trimmed = term.trim()
      setActiveQuery(trimmed)
      setHasSearched(Boolean(trimmed))
      onSearch?.(trimmed)

      if (!autoQueryShopify) return

      try {
        setIsQuerying(true)
        onQueryStart?.()

        const res = await searchStorefrontProducts(trimmed, {
          onlyAvailable: true,
          sortKey,
          reverse,
        })

        // Guard against race conditions if query changed while fetching
        if (latestTermRef.current.trim() === trimmed) {
          if (!res.ok && res.products.length === 0) {
            const err = res.errors?.[0]?.message || 'No products found for this search'
            onError?.(err)
          }
          onProductsFetched?.(res.products, trimmed, res.errors)
        }
      } catch (err: any) {
        if (latestTermRef.current.trim() === trimmed) {
          const msg = err?.message || 'Failed to query Shopify Storefront API'
          onError?.(msg)
        }
      } finally {
        if (latestTermRef.current.trim() === trimmed) {
          setIsQuerying(false)
        }
      }
    },
    [autoQueryShopify, onSearch, onQueryStart, onProductsFetched, onError, sortKey, reverse]
  )

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value
    if (!isControlled) {
      setInternalValue(nextVal)
    }
    onChange?.(nextVal)

    if (queryTimerRef.current) {
      clearTimeout(queryTimerRef.current)
    }

    queryTimerRef.current = setTimeout(() => {
      executeQuery(nextVal)
    }, debounceMs)
  }

  // Handle instant submit on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (queryTimerRef.current) {
        clearTimeout(queryTimerRef.current)
      }
      executeQuery(currentValue)
    } else if (e.key === 'Escape') {
      handleClear()
    }
  }

  // Handle clear action
  const handleClear = () => {
    if (queryTimerRef.current) {
      clearTimeout(queryTimerRef.current)
    }
    if (!isControlled) {
      setInternalValue('')
    }
    onChange?.('')
    executeQuery('')
    inputRef.current?.focus()
  }

  // Handle suggestion chip click
  const handleSelectSuggestion = (suggestion: string) => {
    if (queryTimerRef.current) {
      clearTimeout(queryTimerRef.current)
    }
    if (!isControlled) {
      setInternalValue(suggestion)
    }
    onChange?.(suggestion)
    executeQuery(suggestion)
  }

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (queryTimerRef.current) {
        clearTimeout(queryTimerRef.current)
      }
    }
  }, [])

  return (
    <div id={id} className={`w-full ${className}`}>
      {/* Search Bar Input Container */}
      <div className="relative flex items-center w-full">
        {/* Leading Search Icon / Loading Spinner */}
        <div className="absolute left-3.5 flex items-center pointer-events-none text-neutral-400">
          {loading ? (
            <Loader2
              id={`${id}-spinner`}
              className="w-4 h-4 text-emerald-600 animate-spin"
              aria-label="Querying Shopify Storefront API"
            />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        {/* Input Element */}
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="search"
          role="searchbox"
          aria-label={placeholder}
          aria-busy={loading}
          placeholder={placeholder}
          value={currentValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full pl-10 pr-20 py-2.5 text-sm bg-neutral-50/80 hover:bg-neutral-50 focus:bg-white border rounded-xl transition-all duration-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 ${
            loading
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500/20'
          }`}
        />

        {/* Trailing Controls (Clear Button & Submit Indicator) */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {currentValue && (
            <button
              id={`${id}-clear-btn`}
              type="button"
              onClick={handleClear}
              aria-label="Clear search input"
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors"
              title="Clear search (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            id={`${id}-submit-btn`}
            type="button"
            onClick={() => executeQuery(currentValue)}
            aria-label="Submit search"
            className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-700 bg-neutral-200/50 hover:bg-neutral-200 rounded transition-colors"
            title="Press Enter to search immediately"
          >
            <span>Search</span>
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Query Status / Results Indicator */}
      {activeQuery && (
        <div
          id={`${id}-status`}
          className="mt-2 flex items-center justify-between text-xs text-neutral-600 px-1"
        >
          <div className="flex items-center gap-1.5 truncate">
            {loading ? (
              <span className="text-emerald-700 flex items-center gap-1 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                Querying Shopify Storefront API for &ldquo;{activeQuery}&rdquo;...
              </span>
            ) : (
              <span>
                Shopify Storefront results for{' '}
                <strong className="text-neutral-900 font-semibold">&ldquo;{activeQuery}&rdquo;</strong>
                {typeof resultCount === 'number' && (
                  <span className="ml-1 text-neutral-500">({resultCount} {resultCount === 1 ? 'product' : 'products'})</span>
                )}
              </span>
            )}
          </div>

          <button
            id={`${id}-reset-link`}
            type="button"
            onClick={handleClear}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline ml-2 whitespace-nowrap"
          >
            Reset Catalog
          </button>
        </div>
      )}

      {/* Quick Search Suggestion Chips */}
      {!hideSuggestions && suggestions.length > 0 && (
        <div
          id={`${id}-suggestions`}
          className="mt-2.5 flex items-center gap-1.5 flex-wrap text-xs"
        >
          <span className="text-neutral-400 font-medium flex items-center gap-1 text-[11px] mr-0.5">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Quick search:
          </span>
          {suggestions.map((suggestion) => {
            const isSelected = activeQuery.toLowerCase() === suggestion.toLowerCase()
            return (
              <button
                key={suggestion}
                id={`${id}-suggestion-${suggestion.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-200/60'
                }`}
              >
                {suggestion}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SearchBar
