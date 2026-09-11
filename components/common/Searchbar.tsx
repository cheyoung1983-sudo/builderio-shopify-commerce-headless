import React, { FC, useState, useEffect, useMemo, useRef } from 'react'
import useSafeRouter from '@lib/hooks/useSafeRouter'
import shopifyConfig from '@config/shopify'
import { ProductGrid } from '@blocks/ProductGrid/ProductGrid'
import { ProductGridSkeleton } from '@components/products/ProductGridSkeleton'
import { Button, Box, jsx, Input, Label } from 'theme-ui'
import Link from 'next/link'
import { searchProducts } from '@lib/shopify/storefront-data-hooks/src/api/operations'
import { ExpandModal } from '@components/modals'
import { throttle } from 'lodash'
import { Cross } from '@components/icons'

interface Props {
  className?: string
  id?: string
}

const Searchbar: FC<Props> = () => {
  const router = useSafeRouter()
  const { q } = router.query
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const [overlayTop, setOverlayTop] = useState(0)

  const pathWithoutQuery = router.asPath.split('?')[0]
  // Close the overlay when the route changes, without an effect: this is
  // React's documented "adjusting state during render" pattern for
  // resetting state in response to a prop/derived value change — it
  // triggers an immediate re-render rather than an extra post-commit one.
  const [prevPath, setPrevPath] = useState(pathWithoutQuery)
  if (pathWithoutQuery !== prevPath) {
    setPrevPath(pathWithoutQuery)
    setIsOpen(false)
  }

  useEffect(() => {
    // Plain useEffect, not useLayoutEffect: useLayoutEffect warns on the
    // server ("does nothing on the server") since this component renders
    // during SSR, and it isn't needed here anyway — isOpen only ever
    // becomes true from a client click handler, well after hydration, so
    // there's no pre-paint flash to avoid.
    if (isOpen) {
      // Must measure the button's real layout position, which only exists
      // post-render; there is no derivable value for this before then.
      setOverlayTop((buttonRef.current?.getBoundingClientRect().bottom || 0) + 15)
    }
  }, [isOpen])

  return (
    <React.Fragment>
      <ExpandModal
        overlayProps={{
          style: {
            maxWidth: 1920,
            left: '50%',
            transform: 'translateX(-50%)',
            overflow: 'auto',
            top: overlayTop,
          },
        }}
        isOpen={isOpen}
      >
        <SearchModalContent
          initialSearch={q && String(q)}
          onSearch={(term: string) => {
            const op = q ? 'replace' : 'push'
            router[op]({
              pathname: router.asPath.split('?')[0],
              query: {
                q: term,
              },
            })
          }}
        />
      </ExpandModal>

      <Box
        ref={buttonRef}
        as={Button}
        mx={2}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Search"
      >
        {isOpen ? (
          <Cross />
        ) : (
          <svg
            width="20"
            height="22"
            viewBox="0 0 20 22"
            fill="none"
            stroke="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            />
          </svg>
        )}
      </Box>
    </React.Fragment>
  )
}

const SearchModalContent = (props: {
  initialSearch?: string
  onSearch: (term: string) => any
}) => {
  const [search, setSearch] = useState(
    props.initialSearch && String(props.initialSearch)
  )
  const [products, setProducts] = useState([] as any[])
  const [loading, setLoading] = useState(false)
  const getProducts = async (searchTerm: string) => {
    setLoading(true)
    const results = await searchProducts(shopifyConfig, String(searchTerm))
    setSearch(searchTerm)
    setProducts(results)
    setLoading(false)
    if (searchTerm) {
      props.onSearch(searchTerm)
    }
  }

  // Run once on mount to populate results for an initial search term from the
  // URL query. Intentionally excludes getProducts/search: getProducts itself
  // calls setSearch, so including them would re-run this on every keystroke.
  useEffect(() => {
    if (search) {
      // This is the sanctioned "fetch data on mount" pattern (an initial
      // search term arrived via the URL); getProducts sets a loading flag
      // before its await, same as the interactive/typing path below.
       
      // eslint-disable-next-line react-hooks/set-state-in-effect
      getProducts(search)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Throttled once for the component's lifetime so rapid typing is actually
  // throttled; recreating it per-render (to satisfy exhaustive-deps) would
  // reset the throttle window on every keystroke and defeat the throttling.
  // useMemo (not useCallback) because we're memoizing the throttled
  // function value itself, not a callback literal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttleSearch = useMemo(() => throttle(getProducts), [])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        p: [1, 2],
        width: '100%',
      }}
    >
      <Input
        type="search"
        sx={{ marginBottom: 15 }}
        defaultValue={props.initialSearch}
        placeholder="Search for products..."
        onChange={(event) => throttleSearch(event.target.value)}
      />
      {loading ? (
        <div style={{ marginTop: 10, marginBottom: 15 }}>
          <ProductGridSkeleton count={4} />
        </div>
      ) : products.length ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Label style={{ margin: 0 }}>
              Search Results for &quot;<strong>{search}</strong>&quot; ({products.length} found)
            </Label>
            <Link
              href={`/products?q=${encodeURIComponent(search || '')}`}
              style={{ fontSize: 13, color: '#059669', textDecoration: 'none', fontWeight: 600 }}
            >
              View in catalog &rarr;
            </Link>
          </div>
          <ProductGrid
            cardProps={{
              imgHeight: 540,
              imgWidth: 540,
              imgPriority: false,
            }}
            products={products}
            offset={0}
            limit={products.length}
          ></ProductGrid>
        </>
      ) : (
        <span>
          {search ? (
            <>
              There are no products that match &quot;<strong>{search}</strong>&quot;
            </>
          ) : (
            <> </>
          )}
        </span>
      )}
    </Box>
  )
}

export default Searchbar
