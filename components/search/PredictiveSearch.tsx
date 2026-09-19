import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  usePredictiveSearch,
  UsePredictiveSearchReturn,
} from '../../services/predictive-search'
import { parseShopifySearchQuery } from '../../lib/shopify-search-syntax'
import { sanitizeRichText } from '../../lib/sanitize-html'

export interface PredictiveSearchProps {
  id?: string
  placeholder?: string
  initialQuery?: string
  className?: string
  onSearchSubmit?: (query: string) => void
  showSyntaxTips?: boolean
  autoFocus?: boolean
  compact?: boolean
}

const QUICK_SYNTAX_EXAMPLES = [
  { label: 'vendor:Samsung', query: 'vendor:Samsung' },
  { label: 'price:>50', query: 'price:>50' },
  { label: 'tag:oled', query: 'tag:oled' },
  { label: 'title:Galaxy*', query: 'title:Galaxy*' },
  { label: 'NOT Apple', query: 'NOT Apple' },
]

export const PredictiveSearch: React.FC<PredictiveSearchProps> = ({
  id = 'predictive-search',
  placeholder = 'Search products, brands, or syntax (e.g. vendor:Samsung, price:>50)...',
  initialQuery = '',
  className = '',
  onSearchSubmit,
  showSyntaxTips = true,
  autoFocus = false,
  compact = false,
}) => {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    searchTerm,
    setSearchTerm,
    isOpen,
    setIsOpen,
    loading,
    products,
    collections,
    pages,
    queries,
    totalResultsCount,
    clear,
  } = usePredictiveSearch({ initialQuery, delay: 250, limit: 6 })

  // Active option keyboard index
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [showSyntaxHelper, setShowSyntaxHelper] = useState(false)

  // Collect all selectable items in flat array for sequential arrow navigation
  const allSelectableItems: Array<{
    id: string
    title: string
    url: string
    type: 'query' | 'product' | 'collection' | 'page'
  }> = [
    ...queries.map((q) => ({
      id: `query-${q.text}`,
      title: q.text,
      url: q.url,
      type: 'query' as const,
    })),
    ...products.map((p) => ({
      id: `product-${p.id}`,
      title: p.title,
      url: p.url,
      type: 'product' as const,
    })),
    ...collections.map((c) => ({
      id: `col-${c.id}`,
      title: c.title,
      url: c.url,
      type: 'collection' as const,
    })),
    ...pages.map((pg) => ({
      id: `page-${pg.id}`,
      title: pg.title,
      url: pg.url,
      type: 'page' as const,
    })),
  ]

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setShowSyntaxHelper(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setIsOpen])

  // Reset selected index when results or search term changes during render
  const [prevSearchKey, setPrevSearchKey] = useState('')
  const currentSearchKey = `${searchTerm}_${products.length}_${queries.length}`
  if (prevSearchKey !== currentSearchKey) {
    setPrevSearchKey(currentSearchKey)
    setSelectedIndex(-1)
  }

  // Parse current query for live syntax validation warnings
  const syntaxCheck = searchTerm.trim()
    ? parseShopifySearchQuery(searchTerm)
    : null

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen && searchTerm.trim()) {
        setIsOpen(true)
        return
      }
      setSelectedIndex((prev) =>
        prev < allSelectableItems.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : allSelectableItems.length - 1
      )
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && allSelectableItems[selectedIndex]) {
        e.preventDefault()
        const selected = allSelectableItems[selectedIndex]
        setIsOpen(false)
        router.push(selected.url)
      } else {
        // Submit standard search form
        e.preventDefault()
        submitSearch(searchTerm)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setShowSyntaxHelper(false)
    }
  }

  const submitSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setIsOpen(false)
    setShowSyntaxHelper(false)
    if (onSearchSubmit) {
      onSearchSubmit(trimmed)
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    }
  }

  const applySyntaxChip = (syntax: string) => {
    const newTerm = searchTerm ? `${searchTerm.trim()} ${syntax}` : syntax
    setSearchTerm(newTerm)
    inputRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      id={id}
      className={`relative w-full max-w-3xl ${className}`}
    >
      {/* Search Input Form */}
      <form
        action="/search"
        method="get"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          submitSearch(searchTerm)
        }}
        className="relative flex items-center w-full"
      >
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-results`}
          className="relative w-full"
        >
          <div className="relative flex items-center">
            {/* Search Icon */}
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Input field with ARIA semantics */}
            <input
              ref={inputRef}
              id={`${id}-input`}
              type="search"
              name="q"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (!isOpen && e.target.value.trim()) {
                  setIsOpen(true)
                }
              }}
              onFocus={() => {
                if (searchTerm.trim() && totalResultsCount > 0) {
                  setIsOpen(true)
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              autoFocus={autoFocus}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={`${id}-results`}
              aria-expanded={isOpen}
              aria-activedescendant={
                selectedIndex >= 0 && allSelectableItems[selectedIndex]
                  ? allSelectableItems[selectedIndex].id
                  : undefined
              }
              className={`w-full pl-11 pr-24 ${
                compact ? 'py-2 text-sm' : 'py-3 text-base'
              } bg-white text-gray-900 border border-gray-300 rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />

            {/* Hidden inputs conforming to Shopify storefront search specification */}
            <input type="hidden" name="type" value="product,collection,page" />
            <input
              type="hidden"
              name="options[unavailable_products]"
              value="last"
            />
            <input type="hidden" name="options[prefix]" value="last" />

            {/* Right Action Icons (Loading / Clear / Syntax Info) */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {loading && (
                <div
                  className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
                  aria-label="Loading suggestions"
                />
              )}

              {searchTerm && (
                <button
                  type="button"
                  id={`${id}-clear`}
                  onClick={clear}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                  aria-label="Clear search input"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              {showSyntaxTips && (
                <button
                  type="button"
                  id={`${id}-syntax-help-toggle`}
                  onClick={() => setShowSyntaxHelper((prev) => !prev)}
                  className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
                    showSyntaxHelper
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Shopify Search Syntax Helper"
                  aria-label="Toggle Shopify search syntax guide"
                >
                  syntax
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Syntax Diagnostics warning banner (if malformed syntax or unclosed quotes) */}
      {syntaxCheck && syntaxCheck.warnings.length > 0 && (
        <div className="mt-1.5 px-3 py-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-center gap-2">
          <svg
            className="w-4 h-4 text-amber-500 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="truncate">
            {syntaxCheck.warnings[0].message}
          </div>
        </div>
      )}

      {/* Quick Syntax Chips Drawer */}
      {showSyntaxHelper && (
        <div className="absolute left-0 right-0 top-full mt-2 p-3 bg-white border border-gray-200 rounded-xl shadow-lg z-30 text-xs text-gray-700">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
            <span className="font-semibold text-gray-900">
              Shopify Search Syntax Guide
            </span>
            <button
              onClick={() => setShowSyntaxHelper(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-600 mb-2.5">
            Filter like an expert using Shopify&apos;s official search grammar:
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {QUICK_SYNTAX_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => applySyntaxChip(ex.query)}
                className="px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-gray-200 rounded text-xs font-mono transition-colors"
              >
                + {ex.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-500 font-mono text-[11px]">
            <div>• title:Apple (field match)</div>
            <div>• price:&gt;50 (comparators)</div>
            <div>• NOT screen (exclusion)</div>
            <div>• &quot;Caramel Apple&quot; (phrase)</div>
            <div>• head* (prefix wildcard)</div>
            <div>• (A OR B) AND C (boolean)</div>
          </div>
        </div>
      )}

      {/* Predictive Search Results Dropdown */}
      {isOpen && searchTerm.trim() && (
        <div
          id={`${id}-results`}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* 1. Query Suggestions */}
          {queries.length > 0 && (
            <div className="p-2">
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Suggested Searches
              </div>
              <ul className="space-y-0.5">
                {queries.map((q) => {
                  const itemIndex = allSelectableItems.findIndex(
                    (item) => item.id === `query-${q.text}`
                  )
                  const isSelected = selectedIndex === itemIndex

                  return (
                    <li
                      key={q.text}
                      id={`query-${q.text}`}
                      role="option"
                      aria-selected={isSelected}
                      className={`flex items-center px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSearchTerm(q.text)
                        submitSearch(q.text)
                      }}
                    >
                      <svg
                        className="w-3.5 h-3.5 mr-2.5 text-gray-400 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: sanitizeRichText(q.styled_text),
                        }}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* 2. Product Suggestions */}
          {products.length > 0 && (
            <div className="p-2">
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Products ({products.length})
              </div>
              <ul className="divide-y divide-gray-50">
                {products.map((p) => {
                  const itemIndex = allSelectableItems.findIndex(
                    (item) => item.id === `product-${p.id}`
                  )
                  const isSelected = selectedIndex === itemIndex

                  return (
                    <li
                      key={p.id}
                      id={`product-${p.id}`}
                      role="option"
                      aria-selected={isSelected}
                      className={`rounded-lg transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Link
                        href={p.url}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-2.5 py-2"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-11 h-11 bg-gray-100 rounded-md overflow-hidden shrink-0 border border-gray-200">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.title}
                              fill
                              sizes="44px"
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-mono">
                              N/A
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {p.title}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {p.vendor && <span>{p.vendor}</span>}
                            {p.vendor && <span>•</span>}
                            <span className="font-semibold text-gray-900">
                              {p.price}
                            </span>
                            {!p.available && (
                              <span className="text-[10px] uppercase font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                                Sold Out
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <svg
                          className="w-4 h-4 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* 3. Collections & Pages Suggestions */}
          {(collections.length > 0 || pages.length > 0) && (
            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50/50">
              {collections.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Collections
                  </div>
                  <ul className="space-y-0.5">
                    {collections.map((c) => {
                      const itemIndex = allSelectableItems.findIndex(
                        (item) => item.id === `col-${c.id}`
                      )
                      const isSelected = selectedIndex === itemIndex

                      return (
                        <li
                          key={c.id}
                          id={`col-${c.id}`}
                          role="option"
                          aria-selected={isSelected}
                          className={`rounded-md ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-white'
                          }`}
                        >
                          <Link
                            href={c.url}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center px-2 py-1 text-xs text-gray-800 font-medium truncate"
                          >
                            📁 {c.title}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {pages.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Pages
                  </div>
                  <ul className="space-y-0.5">
                    {pages.map((pg) => {
                      const itemIndex = allSelectableItems.findIndex(
                        (item) => item.id === `page-${pg.id}`
                      )
                      const isSelected = selectedIndex === itemIndex

                      return (
                        <li
                          key={pg.id}
                          id={`page-${pg.id}`}
                          role="option"
                          aria-selected={isSelected}
                          className={`rounded-md ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-white'
                          }`}
                        >
                          <Link
                            href={pg.url}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center px-2 py-1 text-xs text-gray-800 font-medium truncate"
                          >
                            📄 {pg.title}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {totalResultsCount === 0 && !loading && (
            <div className="p-6 text-center text-sm text-gray-500">
              No direct suggestions found for &ldquo;{searchTerm}&rdquo;.
              <div className="mt-1 text-xs text-gray-400">
                Press Enter or click below to perform a complete store search.
              </div>
            </div>
          )}

          {/* Footer CTA: "Search for '{terms}'" button matching Shopify spec */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              id={`${id}-submit-footer`}
              onClick={() => submitSearch(searchTerm)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <span>Search store for &ldquo;{searchTerm}&rdquo;</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
