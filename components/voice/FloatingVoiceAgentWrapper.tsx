'use client'

import React, { Suspense, useContext, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useIsMounted } from '@lib/hooks/useIsMounted'
import { UIContext } from '@components/common/context'
import { CartContext } from '../../context/CartContext'

const ElevenLabsAgent = dynamic(() => import('@components/ElevenLabsAgent'), {
  ssr: false,
  loading: () => null,
})

export interface FloatingVoiceAgentWrapperProps {
  /** Optional custom CSS classes for the container */
  className?: string
}

/**
 * Persistent Floating Container for the ElevenLabs Realtime Voice Agent.
 * Mounts safely in RootLayout with hydration guards, providing a fixed
 * bottom-right portal for voice customer service, repair intake, and waveform visuals.
 */
export const FloatingVoiceAgentWrapper: React.FC<FloatingVoiceAgentWrapperProps> = ({
  className = '',
}) => {
  const isMounted = useIsMounted()
  // Hide the widget while either cart drawer is open so it can't cover
  // "Proceed to Checkout" on narrow screens. Read contexts directly (not the
  // throwing hooks) so the widget still renders outside the providers.
  const ui = useContext(UIContext) as { displaySidebar?: boolean } | undefined
  const cart = useContext(CartContext)
  const [drawerEventOpen, setDrawerEventOpen] = useState(false)
  useEffect(() => {
    const onState = (e: Event) =>
      setDrawerEventOpen(Boolean((e as CustomEvent<{ open?: boolean }>).detail?.open))
    window.addEventListener('cart-drawer:state', onState)
    return () => window.removeEventListener('cart-drawer:state', onState)
  }, [])
  const cartDrawerOpen = Boolean(ui?.displaySidebar || cart?.isOpen || drawerEventOpen)

  if (!isMounted) {
    return null
  }

  return (
    <aside
      id="floating-voice-agent-root-container"
      aria-label="Spokane Repair Voice Assistant"
      data-cart-open={cartDrawerOpen ? 'true' : 'false'}
      aria-hidden={cartDrawerOpen || undefined}
      hidden={cartDrawerOpen}
      className={`fixed bottom-6 right-6 z-[90] pointer-events-none ${cartDrawerOpen ? 'hidden' : ''} ${className}`}
    >
      <Suspense fallback={null}>
        <ElevenLabsAgent />
      </Suspense>
    </aside>
  )
}

export default FloatingVoiceAgentWrapper
