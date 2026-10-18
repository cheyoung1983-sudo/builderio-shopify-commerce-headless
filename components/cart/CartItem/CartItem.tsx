import { Box, jsx, Grid, Input, Text, IconButton } from 'theme-ui'
import React, { ChangeEvent, useState } from 'react'
import Image from 'next/image'
import { Plus, Minus } from '@components/icons'
import { getPrice } from '@lib/shopify/storefront-data-hooks/src/utils/product'
import { useCart as useModernCart } from '../../../context/CartContext'
import Link from '@components/common/Link'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '@lib/image'
/** Cart line as passed in by CartSidebarView (mapped from CartContext items). */
export interface CartLineView {
  id: string
  title: string
  quantity: number
  variant: {
    id: string
    title: string
    price: string
    priceV2: { amount: string; currencyCode: string }
    image: { id: string; src: string; url?: string; altText?: string | null } | null
    product: { id: string; handle: string; title: string }
    selectedOptions: Array<{ name: string; value: string }>
  }
}

const CartItem = ({
  item,
  currencyCode,
}: {
  item: CartLineView
  currencyCode: string
}) => {
  const modernCart = useModernCart()
  const [quantity, setQuantity] = useState(item.quantity)
  const [removing, setRemoving] = useState(false)
  const updateQuantity = async (quantity: number) => {
    // CartContext is the single source of truth; it syncs Shopify itself.
    await modernCart.updateQuantity(item.variant?.id || item.id, quantity)
  }
  const handleQuantity = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)

    if (Number.isInteger(val) && val >= 0) {
      setQuantity(val)
    }
  }
  const handleBlur = () => {
    const val = Number(quantity)

    if (val !== item.quantity) {
      updateQuantity(val)
    }
  }
  const increaseQuantity = (n = 1) => {
    const val = Number(quantity) + n

    if (Number.isInteger(val) && val >= 0) {
      setQuantity(val)
      updateQuantity(val)
    }
  }
  const handleRemove = async () => {
    setRemoving(true)

    await modernCart.removeItem(item.variant?.id || item.id)
    setRemoving(false)
  }

  // Reset the quantity input when item.quantity changes elsewhere (e.g. a
  // cart update from another component), without an effect: React's
  // documented "adjusting state during render" pattern.
  const [prevItemQuantity, setPrevItemQuantity] = useState(item.quantity)
  if (item.quantity !== prevItemQuantity) {
    setPrevItemQuantity(item.quantity)
    setQuantity(item.quantity)
  }

  const imgSrc = item.variant?.image?.src || item.variant?.image?.url || ''
  const altText = item.variant?.image?.altText || item.title || 'Product Image'
  const priceAmount = item.variant?.priceV2?.amount || item.variant?.price || '0'
  const currency = item.variant?.priceV2?.currencyCode || currencyCode || 'USD'
  const productHandle = item.variant?.product?.handle || ''

  return (
    <Grid
      gap={3}
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        my: 3,
        mx: 0,
      }}
      columns={['96px minmax(0, 1fr)', '130px minmax(0, 1fr)']}
    >
      <div
        sx={{
          padding: 1,
          border: '1px solid gray',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: ['96px', '130px'],
          height: ['96px', '130px'],
          boxSizing: 'border-box',
          overflow: 'hidden',
          backgroundColor: '#f8f8f8',
        }}
      >
        {imgSrc ? (
          <Image
            height={130}
            width={130}
            alt={altText}
            src={imgSrc}
            placeholder="blur"
            blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
            sizes={RESPONSIVE_IMAGE_SIZES.cartItem}
            loading="lazy"
          />
        ) : (
          <div sx={{ fontSize: 1, color: 'gray' }}>No image</div>
        )}
      </div>
      <div sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <Link
          href={productHandle ? `/product/${productHandle}/` : '#'}
          sx={{ fontSize: 3, m: 0, fontWeight: 700 }}
        >
          <>
            {item.title}
            <Text
              sx={{
                fontSize: 4,
                fontWeight: 700,
                display: 'block',
                marginLeft: 'auto',
              }}
            >
              {getPrice(priceAmount, currency)}
            </Text>
          </>
        </Link>
        <ul sx={{ mt: 2, mb: 0, padding: 0, listStyle: 'none' }}>
          <li>
            <div sx={{ display: 'flex', justifyItems: 'center' }}>
              <IconButton
                type="button"
                aria-label={`Decrease quantity of ${item.title}`}
                onClick={() => increaseQuantity(-1)}
              >
                <Minus width={18} height={18} />
              </IconButton>

              <label>
                <Input
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                  }}
                  aria-label={`Quantity of ${item.title}`}
                  type="number"
                  max={99}
                  min={0}
                  value={quantity}
                  onChange={handleQuantity}
                  onBlur={handleBlur}
                />
              </label>
              <IconButton
                type="button"
                aria-label={`Increase quantity of ${item.title}`}
                onClick={() => increaseQuantity(1)}
              >
                <Plus width={18} height={18} />
              </IconButton>
            </div>
          </li>
          <li>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              aria-label={`Remove ${item.title}`}
              sx={{
                mt: 2,
                p: 0,
                bg: 'transparent',
                border: 'none',
                color: 'inherit',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 1,
              }}
            >
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </li>
          {(item.variant?.selectedOptions || []).map((option) => (
            <li key={option.value}>
              {option.name}:{option.value}
            </li>
          ))}
        </ul>
      </div>
    </Grid>
  )
}

/**
 *         

 */

export default CartItem
