import type { GetServerSideProps } from 'next'
import { fetchStorefrontCart } from '@services/shopify'

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const rawCartId = params?.cartId as string
  if (!rawCartId) {
    return { redirect: { destination: '/cart', permanent: false } }
  }

  try {
    const cartId = rawCartId.startsWith('gid://')
      ? rawCartId
      : `gid://shopify/Cart/${rawCartId}`

    const res = await fetchStorefrontCart(cartId)
    const cart = res?.data?.cart

    if (cart?.checkoutUrl) {
      return {
        redirect: {
          destination: cart.checkoutUrl,
          permanent: false,
        },
      }
    }
  } catch (error) {
    console.error('[CartPermalink] Failed to fetch cart for permalink:', error)
  }

  return {
    redirect: {
      destination: '/cart',
      permanent: false,
    },
  }
}

export default function CartPermalinkRedirect() {
  return null
}
