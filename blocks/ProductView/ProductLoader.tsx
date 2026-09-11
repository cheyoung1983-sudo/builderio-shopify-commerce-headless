import React, { useState, useEffect } from 'react'
import { jsx } from 'theme-ui'
import { getProduct } from '@lib/shopify/storefront-data-hooks/src/api/operations'
import shopifyConfig from '@config/shopify'
import { ProductDetailSkeleton } from '@components/products/ProductDetailSkeleton'

interface Props {
  className?: string
  children: (product: any) => React.ReactElement
  product: string | ShopifyBuy.Product
}

const ProductLoader: React.FC<Props> = ({
  product: initialProduct,
  children,
}) => {
  const [product, setProduct] = useState(initialProduct)
  const [loading, setLoading] = useState(false)

  // Reset local state when the `product` prop changes, without an effect:
  // React's documented "adjusting state during render" pattern — triggers
  // an immediate re-render instead of an extra post-commit one.
  const [prevInitialProduct, setPrevInitialProduct] = useState(initialProduct)
  if (initialProduct !== prevInitialProduct) {
    setPrevInitialProduct(initialProduct)
    setProduct(initialProduct)
  }

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      const result = await getProduct(shopifyConfig, {
        handle: String(product),
      })
      setProduct(result)
      setLoading(false)
    }
    if (typeof product === 'string') {
      fetchProduct()
    }
  }, [product])

  if (!product || typeof product === 'string' || loading) {
    return <ProductDetailSkeleton asModal={false} />
  }
  return children(product)
}

export default ProductLoader
