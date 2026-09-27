'use client'

import React, { useEffect, useRef } from 'react'

export interface AudioWaveformVisualizerProps {
  /** Active state of the voice agent */
  status: 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'thinking'
  /** Current output audio volume (0.0 to 1.0) */
  outputVolume?: number
  /** Current microphone input volume (0.0 to 1.0) */
  inputVolume?: number
  /** Size of the visualizer canvas (width & height in px) */
  size?: number
  /** Glow intensity multiplier */
  glowIntensity?: number
  /** Optional custom class names */
  className?: string
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  status,
  outputVolume = 0,
  inputVolume = 0,
  size = 64,
  glowIntensity = 1,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const phaseRef = useRef<number>(0)
  const smoothedVolRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // High-DPI screen scaling
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const center = size / 2
    const baseRadius = size * 0.28

    const render = () => {
      ctx.clearRect(0, 0, size, size)

      // Determine active target volume
      const targetVol =
        status === 'speaking'
          ? Math.max(0.2, outputVolume * 1.5)
          : status === 'listening'
          ? Math.max(0.15, inputVolume * 1.8)
          : status === 'connecting' || status === 'thinking'
          ? 0.35
          : 0.05

      // Smooth volume interpolation
      smoothedVolRef.current += (targetVol - smoothedVolRef.current) * 0.15
      const currentVol = Math.min(1.0, smoothedVolRef.current)

      phaseRef.current += status === 'speaking' ? 0.08 : status === 'listening' ? 0.05 : 0.02

      // Outer glow pulse
      if (status === 'speaking' || status === 'listening' || status === 'thinking') {
        const glowRadius = baseRadius + currentVol * 14 * glowIntensity
        const glowGrad = ctx.createRadialGradient(
          center,
          center,
          baseRadius * 0.5,
          center,
          center,
          glowRadius
        )

        if (status === 'speaking') {
          glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.45)')
          glowGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.25)')
          glowGrad.addColorStop(1, 'rgba(6, 182, 212, 0)')
        } else if (status === 'listening') {
          glowGrad.addColorStop(0, 'rgba(59, 130, 246, 0.45)')
          glowGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.25)')
          glowGrad.addColorStop(1, 'rgba(99, 102, 241, 0)')
        } else {
          glowGrad.addColorStop(0, 'rgba(234, 179, 8, 0.35)')
          glowGrad.addColorStop(1, 'rgba(234, 179, 8, 0)')
        }

        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(center, center, glowRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Multi-harmonic undulating waveform ring
      const numPoints = 36
      const angleStep = (Math.PI * 2) / numPoints

      ctx.beginPath()
      for (let i = 0; i < numPoints; i++) {
        const angle = i * angleStep
        const harmonic1 = Math.sin(angle * 3 + phaseRef.current) * (currentVol * 6)
        const harmonic2 = Math.cos(angle * 5 - phaseRef.current * 1.5) * (currentVol * 4)
        const harmonic3 = Math.sin(angle * 2 + phaseRef.current * 0.7) * 2

        const r = baseRadius + harmonic1 + harmonic2 + harmonic3
        const x = center + Math.cos(angle) * r
        const y = center + Math.sin(angle) * r

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()

      // Core fill gradient
      const coreGrad = ctx.createLinearGradient(0, 0, size, size)
      if (status === 'speaking') {
        coreGrad.addColorStop(0, '#10B981')
        coreGrad.addColorStop(0.5, '#059669')
        coreGrad.addColorStop(1, '#06B6D4')
      } else if (status === 'listening') {
        coreGrad.addColorStop(0, '#3B82F6')
        coreGrad.addColorStop(0.5, '#2563EB')
        coreGrad.addColorStop(1, '#6366F1')
      } else if (status === 'thinking' || status === 'connecting') {
        coreGrad.addColorStop(0, '#F59E0B')
        coreGrad.addColorStop(1, '#D97706')
      } else {
        coreGrad.addColorStop(0, '#475569')
        coreGrad.addColorStop(1, '#334155')
      }

      ctx.fillStyle = coreGrad
      ctx.fill()

      // Crisp outer stroke
      ctx.lineWidth = 1.5
      ctx.strokeStyle =
        status === 'speaking'
          ? 'rgba(167, 243, 208, 0.9)'
          : status === 'listening'
          ? 'rgba(191, 219, 254, 0.9)'
          : 'rgba(255, 255, 255, 0.3)'
      ctx.stroke()

      // Inner radial core highlight
      ctx.beginPath()
      ctx.arc(center, center, baseRadius * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.fill()

      animFrameIdRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [status, outputVolume, inputVolume, size, glowIntensity])

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />
    </div>
  )
}

export default AudioWaveformVisualizer
