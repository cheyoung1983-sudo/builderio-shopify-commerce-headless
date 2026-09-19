import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  PredictiveSearchResponse,
  PredictiveSearchProductItem,
  PredictiveSearchCollectionItem,
  PredictiveSearchPageItem,
  PredictiveSearchQueryItem,
} from '../pages/api/search/suggest'

export interface FetchPredictiveSearchOptions {
  q: string
  types?: string
  unavailable_products?: 'show' | 'hide' | 'last'
  prefix?: 'last' | 'none'
  limit?: number
  signal?: AbortSignal
}

/**
 * Client-side helper to call the Shopify predictive search endpoint
 */
export async function fetchPredictiveSearch(
  options: FetchPredictiveSearchOptions
): Promise<PredictiveSearchResponse> {
  const {
    q,
    types = 'product,collection,page,query',
    unavailable_products = 'last',
    prefix = 'last',
    limit = 6,
    signal,
  } = options

  if (!q || !q.trim()) {
    return {
      resources: {
        results: {
          products: [],
          collections: [],
          pages: [],
          queries: [],
        },
      },
      terms: '',
    }
  }

  const queryParams = new URLSearchParams({
    q: q.trim(),
    'resources[type]': types,
    'resources[options][unavailable_products]': unavailable_products,
    'resources[options][prefix]': prefix,
    'resources[limit]': String(limit),
  })

  const res = await fetch(`/api/search/suggest?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!res.ok) {
    throw new Error(`Predictive search failed with status ${res.status}`)
  }

  return res.json()
}

export interface UsePredictiveSearchReturn {
  searchTerm: string
  setSearchTerm: (term: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  loading: boolean
  products: PredictiveSearchProductItem[]
  collections: PredictiveSearchCollectionItem[]
  pages: PredictiveSearchPageItem[]
  queries: PredictiveSearchQueryItem[]
  totalResultsCount: number
  clear: () => void
}

const cache = new Map<string, PredictiveSearchResponse>()

/**
 * Custom React hook managing debounced predictive search state and data fetching
 */
export function usePredictiveSearch(options: {
  delay?: number
  limit?: number
  initialQuery?: string
} = {}): UsePredictiveSearchReturn {
  const { delay = 300, limit = 6, initialQuery = '' } = options

  const [searchTerm, setSearchTerm] = useState(initialQuery)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PredictiveSearchResponse['resources']['results']>({
    products: [],
    collections: [],
    pages: [],
    queries: [],
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleSetSearchTerm = useCallback(
    (term: string) => {
      setSearchTerm(term)
      const trimmed = term.trim()
      if (!trimmed) {
        setResults({ products: [], collections: [], pages: [], queries: [] })
        setIsOpen(false)
        setLoading(false)
        return
      }

      const cacheKey = `${trimmed}:${limit}`
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!
        setResults(cached.resources.results)
        setLoading(false)
        setIsOpen(true)
      }
    },
    [limit]
  )

  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (!trimmed) {
      return
    }

    const cacheKey = `${trimmed}:${limit}`
    if (cache.has(cacheKey)) {
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setLoading(true)

      try {
        const data = await fetchPredictiveSearch({
          q: trimmed,
          limit,
          signal: controller.signal,
        })

        cache.set(cacheKey, data)
        setResults(data.resources.results)
        setIsOpen(true)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[usePredictiveSearch] Request failed:', err)
        }
      } finally {
        setLoading(false)
      }
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [searchTerm, delay, limit])

  const clear = useCallback(() => {
    setSearchTerm('')
    setIsOpen(false)
    setResults({ products: [], collections: [], pages: [], queries: [] })
  }, [])

  const totalResultsCount =
    results.products.length +
    results.collections.length +
    results.pages.length +
    results.queries.length

  return {
    searchTerm,
    setSearchTerm: handleSetSearchTerm,
    isOpen,
    setIsOpen,
    loading,
    products: results.products,
    collections: results.collections,
    pages: results.pages,
    queries: results.queries,
    totalResultsCount,
    clear,
  }
}
