'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useIsMounted } from '@lib/hooks/useIsMounted'

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

  if (!isMounted) {
    return null
  }

  return (
    <aside
      id="floating-voice-agent-root-container"
      aria-label="Spokane Repair Voice Assistant"
      className={`fixed bottom-6 right-6 z-[90] pointer-events-none ${className}`}
    >
      <Suspense fallback={null}>
        <ElevenLabsAgent />
      </Suspense>
    </aside>
  )
}

export default FloatingVoiceAgentWrapper
