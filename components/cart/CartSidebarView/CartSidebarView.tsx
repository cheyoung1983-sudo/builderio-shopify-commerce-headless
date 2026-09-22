import React from 'react'
import { Box, jsx, Text, Card, Grid, Divider, NavLink } from 'theme-ui'
import { FC, useEffect, useState } from 'react'
import { Bag } from '@components/icons'
import { useCart, useCheckoutUrl } from '@lib/shopify/storefront-data-hooks'
import { useCart as useModernCart } from '../../../context/CartContext'
import CartItem from '../CartItem'
import { BuilderComponent, builder } from '@builder.io/react'
import builderConfig from '@config/builder'
import env from '@config/env'

const CartSidebarView: FC = () => {
  const cart = useCart()
  const modernCart = useModernCart()

  const modernLineItems = (modernCart?.items || []).map((it) => ({
    id: it.lineId || it.id,
    title: it.title,
    quantity: it.quantity,
    variant: {
      id: it.variantId,
      title: it.variantTitle || 'Default Title',
      price: it.price?.amount || '0.00',
      priceV2: {
        amount: it.price?.amount || '0.00',
        currencyCode: it.price?.currencyCode || 'USD',
      },
      image: it.image
        ? {
            id: it.variantId,
            src: it.image.url || it.image.src || '',
            altText: it.title,
          }
        : null,
      product: {
        id: it.productId || '',
        handle: it.handle || '',
        title: it.title,
      },
      selectedOptions: it.options || [],
    },
  }))

  const rawSubTotal =
    ((cart as any)?.subtotalPrice as any)?.amount || (cart as any)?.subtotalPrice
  const rawTotal =
    ((cart as any)?.totalPrice as any)?.amount ||
    (cart as any)?.totalPrice ||
    rawSubTotal
  const currencyCode =
    (cart?.subtotalPrice as any)?.currencyCode ||
    (cart?.lineItems?.[0] as any)?.variant?.priceV2?.currencyCode ||
    modernCart?.currencyCode ||
    'USD'

  const formatMoney = (val: any) => {
    if (!val || val === '-') return '-'
    const num = parseFloat(val)
    if (isNaN(num)) return val
    return `$${num.toFixed(2)} ${currencyCode !== 'USD' ? currencyCode : ''}`.trim()
  }

  const items =
    cart?.lineItems && cart.lineItems.length > 0
      ? cart.lineItems
      : modernLineItems
  const isEmpty = items.length === 0

  const subTotal =
    cart?.lineItems && cart.lineItems.length > 0
      ? formatMoney(rawSubTotal)
      : modernCart?.subtotalFormatted || '$0.00'
  const total =
    cart?.lineItems && cart.lineItems.length > 0
      ? formatMoney(rawTotal)
      : modernCart?.subtotalFormatted || '$0.00'

  const checkoutUrl =
    useCheckoutUrl() ||
    modernCart?.checkoutUrl ||
    (cart as any)?.webUrl ||
    (cart as any)?.checkoutUrl
  const [cartUpsell, setCartUpsell] = useState()

  const itemHandles = items
    .map((item: any) => item?.variant?.product?.handle)
    .filter(Boolean)
    .join(',')

  useEffect(() => {
    async function fetchContent() {
      if (!builderConfig.apiKey || !builderConfig.cartUpsellModel) return
      try {
        const cartUpsellContent = await builder
          .get(builderConfig.cartUpsellModel, {
            cacheSeconds: 120,
            userAttributes: {
              itemInCart: itemHandles ? itemHandles.split(',') : [],
            } as any,
          })
          .toPromise()
        setCartUpsell(cartUpsellContent)
      } catch (e) {
        console.warn('Failed to fetch cart-upsell-sidebar:', e)
      }
    }
    fetchContent()
  }, [itemHandles])

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        paddingBottom: 5,
        bg: 'text',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2,
        color: 'background',
        ...(isEmpty && { justifyContent: 'center' }),
      }}
    >
      {isEmpty ? (
        <>
          <Bag />
          Your cart is empty
          <Text>
            Biscuit oat cake wafer icing ice cream tiramisu pudding cupcake.
          </Text>
        </>
      ) : (
        <>
          {items.map((item: any) => (
            <CartItem
              key={item.id}
              item={item}
              // todo update types
              currencyCode={item.variant?.priceV2?.currencyCode || 'USD'}
            />
          ))}
          <Card sx={{ marginLeft: 'auto', minWidth: '10rem', paddingLeft: 5 }}>
            <Grid gap={1} columns={2} sx={{ my: 3 }}>
              <Text>Subtotal:</Text>
              <Text sx={{ marginLeft: 'auto' }}>{subTotal}</Text>
              <Text>Shipping:</Text>
              <Text sx={{ marginLeft: 'auto' }}> - </Text>
              <Text>Tax: </Text>
              <Text sx={{ marginLeft: 'auto' }}> - </Text>
            </Grid>

            <Divider />
            <Grid gap={1} columns={2}>
              <Text variant="bold">Estimated Total:</Text>
              <Text variant="bold" sx={{ marginLeft: 'auto' }}>
                {total}
              </Text>
            </Grid>
          </Card>
          {cartUpsell && builderConfig.cartUpsellModel && (
            <BuilderComponent content={cartUpsell} model={builderConfig.cartUpsellModel} />
          )}
          {checkoutUrl && (
            <NavLink
              variant="nav"
              sx={{
                width: '100%',
                m: 2,
                p: 3,
                textAlign: 'center',
                bg: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: 8,
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  bg: '#047857',
                  color: '#ffffff',
                },
              }}
              href={checkoutUrl!}
            >
              Proceed to Checkout
            </NavLink>
          )}
        </>
      )}
    </Box>
  )
}

export default CartSidebarView
