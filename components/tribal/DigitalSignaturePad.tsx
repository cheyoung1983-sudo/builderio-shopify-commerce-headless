'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Eraser, CheckCircle2 } from 'lucide-react'

interface DigitalSignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void
  disabled?: boolean
}

export function DigitalSignaturePad({ onSignatureChange, disabled = false }: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set high DPI canvas resolution
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = (rect.width || 400) * dpr
    canvas.height = (rect.height || 140) * dpr
    ctx.scale(dpr, dpr)

    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
    return { x: 0, y: 0 }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas && hasDrawn) {
      const dataUrl = canvas.toDataURL('image/png')
      onSignatureChange(dataUrl)
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasDrawn(false)
    onSignatureChange(null)
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span className="flex items-center gap-1.5">
          Sign Exemption Certificate Digital Declaration
          {hasDrawn && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />}
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={disabled || !hasDrawn}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 disabled:opacity-40 text-xs px-2 py-0.5 rounded border border-slate-200 transition-colors"
        >
          <Eraser className="w-3 h-3" />
          Clear
        </button>
      </div>

      <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden hover:border-slate-400 transition-colors">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: '100%', height: '120px', touchAction: 'none' }}
          className="cursor-crosshair block"
        />
        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Sign here using mouse, trackpad, or finger
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500 leading-tight">
        By signing above, you confirm under penalty of perjury that all enrollment details and delivery statements are true and accurate.
      </p>
    </div>
  )
}
