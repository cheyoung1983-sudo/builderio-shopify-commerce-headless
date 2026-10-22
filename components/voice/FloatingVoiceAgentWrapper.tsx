'use client'

import React, { Suspense, useContext, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useIsMounted } from '@lib/hooks/useIsMounted'
import { UIContext } from '@components/common/context'
import { CartContext } from '../../context/CartContext'

import AudioWaveformVisualizer from './AudioWaveformVisualizer'

// The real agent pulls in @elevenlabs/client + LiveKit (~180 KB gzipped).
// It is only downloaded once the shopper shows intent (hover/focus/tap on the
// launcher), so it no longer competes with the page's first paint.
const loadAgent = () => import('@components/ElevenLabsAgent')
const ElevenLabsAgent = dynamic(loadAgent, {
  ssr: false,
  loading: () => <VoiceLauncherStub />,
}) as React.ComponentType<{ initialOpen?: boolean }>

/** Lightweight copy of the agent's closed "Offline" launcher button. */
function VoiceLauncherStub({
  onActivate,
  onIntent,
}: {
  onActivate?: () => void
  onIntent?: () => void
}) {
  return (
    <div
      id="elevenlabs-voice-agent-container"
      className="fixed bottom-20 sm:bottom-22 right-4 sm:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none select-none"
    >
      <button
        id="elevenlabs-agent-toggle-btn"
        type="button"
        onClick={onActivate}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        onTouchStart={onIntent}
        aria-label="Open Spokane Repair Voice Specialist"
        title="Spokane Repair Voice Specialist • Click to talk"
        className="pointer-events-auto group relative flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full shadow-2xl backdrop-blur-xl border border-white/20 transition-all duration-300 hover:scale-[1.03] cursor-pointer bg-neutral-900 text-white hover:bg-black hover:scale-105"
      >
        <div className="relative flex items-center justify-center shrink-0">
          <AudioWaveformVisualizer status="disconnected" outputVolume={0} inputVolume={0} size={28} />
        </div>
        <div className="flex flex-col text-left leading-tight pr-0.5">
          <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
            <span>Repair AI</span>
          </span>
          <span className="text-[10px] text-white/80 font-medium hidden sm:inline">Spokane On-Site</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs bg-neutral-800 text-neutral-300 border-neutral-700/80">
          Offline
        </span>
      </button>
    </div>
  )
}

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
  // null = not loaded yet; false = loaded closed; true = loaded and opened by a tap
  const [activated, setActivated] = useState<null | boolean>(null)

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
        {activated === null ? (
          <VoiceLauncherStub
            onIntent={() => { void loadAgent() }}
            onActivate={() => setActivated(true)}
          />
        ) : (
          <ElevenLabsAgent initialOpen={activated} />
        )}
      </Suspense>
    </aside>
  )
}

export default FloatingVoiceAgentWrapper
