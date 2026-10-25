'use client'

import React, { useState, useRef } from 'react'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { PROFESSIONAL_TECHNICIAN_VOICE_ID } from '../../services/elevenlabs'

interface VoiceNarratorProps {
  text: string
  className?: string
}

export const VoiceNarrator: React.FC<VoiceNarratorProps> = ({ text, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playTTS = async () => {
    setIsLoading(true)
    setIsFallback(false)
    try {
      const response = await fetch('/api/elevenlabs/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: PROFESSIONAL_TECHNICIAN_VOICE_ID }),
      })

      if (!response.ok) throw new Error('ElevenLabs API failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      audio.play()
      setIsPlaying(true)
    } catch (error) {
      console.warn('ElevenLabs failed, falling back to native TTS:', error)
      setIsFallback(true)
      
      // Native Fallback
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onend = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
      setIsPlaying(true)
    } finally {
      setIsLoading(false)
    }
  }

  const stopTTS = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    window.speechSynthesis.cancel()
    setIsPlaying(false)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={isPlaying ? stopTTS : playTTS}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        <span>{isPlaying ? 'Stop' : 'Listen'}</span>
      </button>
      {isFallback && (
        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          Using browser voice
        </span>
      )}
    </div>
  )
}
