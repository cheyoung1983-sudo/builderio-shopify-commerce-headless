import { useEffect } from 'react'
import { useUI } from '@components/common/context'
import { useCart } from '../../../context/CartContext'

/**
 * The voice agent asks to show the cart by dispatching a DOM "open-cart"
 * event. Route it to the single cart sidebar (CartSidebarView) so there is
 * only ever one cart panel, and tell the agent what the shopper sees.
 */
export default function OpenCartBridge() {
  const { openSidebar } = useUI()
  const cart = useCart()

  useEffect(() => {
    const handleOpenCart = () => {
      openSidebar?.()
      const count = cart?.items?.length || 0
      const total = cart?.subtotalFormatted || '$0.00'
      window.dispatchEvent(
        new CustomEvent('elevenlabs:contextual_update', {
          detail: { text: `User opened cart drawer (${count} item(s), subtotal: ${total})` },
        })
      )
    }
    document.addEventListener('open-cart', handleOpenCart)
    return () => document.removeEventListener('open-cart', handleOpenCart)
  }, [openSidebar, cart])

  return null
}
