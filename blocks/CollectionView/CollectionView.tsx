import React, { FC, useState, useEffect } from 'react'
import { NextSeo } from 'next-seo'
import { jsx } from 'theme-ui'
import { Box, Heading } from '@theme-ui/components'
import shopifyConfig from '@config/shopify'
import { ProductGrid, ProductGridProps } from '../ProductGrid/ProductGrid'
import { ProductGridSkeleton } from '@components/products/ProductGridSkeleton'
import { getCollection } from '@lib/shopify/storefront-data-hooks/src/api/operations'
import { sanitizeRichText } from '@lib/sanitize-html'

interface Props {
  className?: string
  children?: any
  collection: string | any // ShopifyBuy.Collection once their types are up to date
  productGridOptions: ProductGridProps
  renderSeo?: boolean
}

const CollectionPreview: FC<Props> = ({
  collection: initialCollection,
  productGridOptions,
  renderSeo,
}) => {
  const [collection, setCollection] = useState(initialCollection)
  const [loading, setLoading] = useState(false)

  // Reset local state when the `collection` prop changes, without an
  // effect: React's documented "adjusting state during render" pattern —
  // triggers an immediate re-render instead of an extra post-commit one.
  const [prevInitialCollection, setPrevInitialCollection] = useState(initialCollection)
  if (initialCollection !== prevInitialCollection) {
    setPrevInitialCollection(initialCollection)
    setCollection(initialCollection)
  }

  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true)
      const result = await getCollection(shopifyConfig, {
        handle: collection,
      })
      if (result) {
        setCollection(result)
      }
      setLoading(false)
    }
    if (typeof collection === 'string') {
      fetchCollection()
    }
  }, [collection])

  if (!collection || typeof collection === 'string' || loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <ProductGridSkeleton count={8} showControls={true} />
      </div>
    )
  }

  const { title, description, products } = collection

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }} key={collection.id}>
      {renderSeo && (
        <NextSeo
          title={collection.title}
          description={collection.description}
          openGraph={{
            type: 'website',
            title,
            description,
          }}
        />
      )}
      <div sx={{ display: 'flex', flexDirection: 'column' }}>
        <span sx={{ mt: 0, mb: 2 }}>
          <Heading>{collection.title}</Heading>
        </span>
        <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(collection.description!) }} />
      </div>
      <Box sx={{ p: 5 }}>
        <ProductGrid {...productGridOptions} products={products} />
      </Box>
    </Box>
  )
}

export default CollectionPreview
