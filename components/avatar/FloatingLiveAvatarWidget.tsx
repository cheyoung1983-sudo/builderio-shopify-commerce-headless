import React, { useState, useEffect, useRef } from 'react'
import { LiveAvatarSession } from '@heygen/liveavatar-web-sdk'

interface FloatingLiveAvatarWidgetProps {
  companyName?: string
  avatarId?: string
  contextId?: string
}

export const FloatingLiveAvatarWidget: React.FC<FloatingLiveAvatarWidgetProps> = ({
  companyName = 'Display Cell Pros',
  avatarId = '65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0',
  contextId = '158f5d55-2d4f-11f1-8d28-066a7fa2e369',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hasConsent, setHasConsent] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dcp_ai_consent_accepted') === 'true'
    }
    return false
  })

  const sessionRef = useRef<LiveAvatarSession | null>(null)
  const videoContainerRef = useRef<HTMLDivElement | null>(null)

  const startAvatarSession = async () => {
    if (!hasConsent) {
      setErrorMsg('Please accept the AI disclosure banner before starting the avatar session.')
      return
    }

    setIsConnecting(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/avatar/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId, contextId, isSandbox: true }),
      })
      const data = await res.json()

      if (!data.success || !data.sessionUrl) {
        throw new Error(data.error || 'Failed to acquire LiveAvatar session URL.')
      }

      const session = new LiveAvatarSession(data.sessionUrl, {
        autoKeepAlive: true,
        voiceChat: { defaultMuted: false },
      })

      sessionRef.current = session
      await session.start()

      setIsConnected(true)
      setIsConnecting(false)
    } catch (err: any) {
      console.error('[LiveAvatarWidget:Error]', err)
      setErrorMsg(err.message || 'Unable to connect to LiveAvatar assistant.')
      setIsConnecting(false)
    }
  }

  const stopAvatarSession = async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.stop()
      } catch (e) {
        console.error('[LiveAvatarWidget:StopError]', e)
      }
      sessionRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen ? (
        <div className="w-80 sm:w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-semibold text-sm">{companyName} AI Assistant</span>
            </div>
            <button
              onClick={() => {
                stopAvatarSession()
                setIsOpen(false)
              }}
              className="text-gray-400 hover:text-white text-lg font-bold px-2"
            >
              &times;
            </button>
          </div>

          {/* Video / Content Body */}
          <div
            ref={videoContainerRef}
            className="relative w-full aspect-video bg-black flex items-center justify-center text-center p-4"
          >
            {!isConnected && !isConnecting && (
              <div className="flex flex-col items-center justify-center space-y-3">
                <p className="text-xs text-gray-300">
                  Talk face-to-face with your live AI assistant.
                </p>
                <button
                  onClick={startAvatarSession}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl text-xs transition-colors shadow-lg"
                >
                  Start Video Session
                </button>
              </div>
            )}

            {isConnecting && (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-gray-400">Connecting to LiveAvatar...</p>
              </div>
            )}

            {errorMsg && (
              <div className="absolute inset-0 bg-red-950/90 p-4 flex items-center justify-center text-center">
                <p className="text-xs text-red-200">{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Controls Footer */}
          {isConnected && (
            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
              <button
                onClick={toggleMute}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                {isMuted ? 'Unmute Mic' : 'Mute Mic'}
              </button>
              <button
                onClick={stopAvatarSession}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                End Session
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-full shadow-2xl transition-all transform hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">Live AI Guide</span>
        </button>
      )}
    </div>
  )
}
