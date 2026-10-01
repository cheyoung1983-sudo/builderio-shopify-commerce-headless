import React, { useState } from 'react'

interface AiDisclosureBannerProps {
  onAgree: () => void
  companyName?: string
}

export const AiDisclosureBanner: React.FC<AiDisclosureBannerProps> = ({
  onAgree,
  companyName = 'Display Cell Pros',
}) => {
  const [agreed, setAgreed] = useState(() => {
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('dcp_ai_consent_accepted') === 'true'
      if (consent) {
        onAgree()
      }
      return consent
    }
    return false
  })

  const handleConsent = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dcp_ai_consent_accepted', 'true')
    }
    setAgreed(true)
    onAgree()
  }

  if (agreed) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900 text-white shadow-2xl border-t border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-sm">
        <p className="font-semibold text-amber-400">
          AI Interaction & Recording Notice
        </p>
        <p className="mt-1 text-gray-300">
          You are interacting with an AI voice/chat assistant powered by{' '}
          {companyName}. By proceeding, you consent to recording, transcription,
          and processing by ElevenLabs and third-party providers for service
          fulfillment.
        </p>
      </div>
      <button
        onClick={handleConsent}
        className="px-5 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition-colors whitespace-nowrap"
      >
        I Agree
      </button>
    </div>
  )
}
