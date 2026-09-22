import React, { FC, useState, useEffect, useRef } from 'react'
import useSafeRouter from '@lib/hooks/useSafeRouter'
import { ExpandModal } from '@components/modals'
import { Cross } from '@components/icons'
import { PredictiveSearch } from '@components/search/PredictiveSearch'
import { Search as SearchIcon } from 'lucide-react'

interface Props {
  className?: string
  id?: string
}

const Searchbar: FC<Props> = ({ className, id }) => {
  const router = useSafeRouter()
  const { q } = router.query
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [overlayTop, setOverlayTop] = useState(0)

  const pathWithoutQuery = router.asPath.split('?')[0]
  const [prevPath, setPrevPath] = useState(pathWithoutQuery)
  if (pathWithoutQuery !== prevPath) {
    setPrevPath(pathWithoutQuery)
    setIsOpen(false)
  }

  useEffect(() => {
    if (isOpen) {
      setOverlayTop((buttonRef.current?.getBoundingClientRect().bottom || 0) + 12)
    }
  }, [isOpen])

  // Global Cmd+K / Ctrl+K keyboard shortcut to open predictive search
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen])

  return (
    <React.Fragment>
      <ExpandModal
        overlayProps={{
          style: {
            maxWidth: '100%',
            width: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            overflow: 'auto',
            top: overlayTop,
            zIndex: 90,
          },
        }}
        isOpen={isOpen}
      >
        <div
          id="predictive-search-modal-container"
          className="w-full max-w-2xl mx-auto p-3 sm:p-5 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200/90 text-neutral-900"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <SearchIcon className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Predictive Product Search
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close search"
              className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Cross />
            </button>
          </div>

          <PredictiveSearch
            id="header-predictive-search"
            autoFocus
            initialQuery={q ? String(q) : ''}
            showSyntaxTips={true}
            onSearchSubmit={(searchTerm) => {
              setIsOpen(false)
              router.push(`/search?q=${encodeURIComponent(searchTerm)}`)
            }}
          />
        </div>
      </ExpandModal>

      <button
        ref={buttonRef}
        id={id || 'navbar-search-toggle-btn'}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close search' : 'Search catalog with predictive auto-suggestions'}
        aria-expanded={isOpen}
        title="Search products (Cmd+K)"
        className={
          className ||
          'relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-neutral-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer'
        }
      >
        {isOpen ? (
          <Cross />
        ) : (
          <SearchIcon className="w-5 h-5 text-neutral-700 hover:text-emerald-600 transition-colors" />
        )}
      </button>
    </React.Fragment>
  )
}

export default Searchbar
