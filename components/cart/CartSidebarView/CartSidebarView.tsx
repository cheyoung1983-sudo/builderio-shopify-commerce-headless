/** @jsxRuntime classic */
/** @jsx jsx */
import React from 'react'
import { Box, jsx, Text, Card, Grid, Divider, NavLink } from 'theme-ui'
import { FC, useEffect, useState } from 'react'
import { Bag } from '@components/icons'
import { useCart, useCheckoutUrl } from '@lib/shopify/storefront-data-hooks'
import { getPrice } from '@lib/shopify/storefront-data-hooks/src/utils/product'
import CartItem from '../CartItem'
import { BuilderComponent, builder } from '@builder.io/react'
import env from '@config/env'

const CartSidebarView: FC = () => {
  const checkoutUrl = useCheckoutUrl()
  const cart = useCart()
  const items = cart?.lineItems ?? []
  const isEmpty = items.length === 0
  const currencyCode =
    (items[0] as any)?.variant?.priceV2?.currencyCode || 'USD'
  const subtotalAmount = cart?.subtotalPrice
  const subTotal =
    typeof subtotalAmount === 'string'
      ? getPrice(subtotalAmount, currencyCode)
      : 'Calculating at checkout'
  const total = subTotal
  const [cartUpsell, setCartUpsell] = useState()

  useEffect(() => {
    async function fetchContent() {
      const items = cart?.lineItems || []
      const cartUpsellContent = await builder
        .get('cart-upsell-sidebar', {
          cacheSeconds: 120,
          userAttributes: {
            itemInCart: items.map((item: any) => item.variant.product.handle),
          } as any,
        })
        .toPromise()
      setCartUpsell(cartUpsellContent)
    }
    fetchContent()
  }, [cart?.lineItems])

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
              <Text>Shipping and tax:</Text>
              <Text sx={{ marginLeft: 'auto' }}>Calculated at checkout</Text>
            </Grid>

            <Divider />
            <Grid gap={1} columns={2}>
              <Text variant="bold">Estimated Total:</Text>
              <Text variant="bold" sx={{ marginLeft: 'auto' }}>
                {total}
              </Text>
            </Grid>
          </Card>
          <BuilderComponent content={cartUpsell} model="cart-upsell-sidebar" />
          {checkoutUrl && (
            <NavLink
              as="a"
              variant="nav"
              sx={{ width: '100%', m: 2, p: 12, textAlign: 'center' }}
              href={checkoutUrl}
            >
              Secure Checkout
            </NavLink>
          )}
          {!checkoutUrl && (
            <Text sx={{ m: 2, textAlign: 'center' }}>
              Checkout is loading. Please try again in a moment.
            </Text>
          )}
        </>
      )}
    </Box>
  )
}

export default CartSidebarView
