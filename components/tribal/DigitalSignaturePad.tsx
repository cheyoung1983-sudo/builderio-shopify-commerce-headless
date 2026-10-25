'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Eraser, CheckCircle2 } from 'lucide-react'

interface DigitalSignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void
  disabled?: boolean
}

export function DigitalSignaturePad({ onSignatureChange, disabled = false }: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const dataUrlRef = useRef<string | null>(null)

  const initContext = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const width = rect.width || 400
    const height = 120

    let savedImage: HTMLImageElement | null = null
    if (hasDrawn && canvas.width > 0 && canvas.height > 0) {
      const dataUrl = canvas.toDataURL('image/png')
      savedImage = new Image()
      savedImage.src = dataUrl
    }

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    initContext(ctx)

    if (savedImage) {
      savedImage.onload = () => {
        ctx.drawImage(savedImage!, 0, 0, width, height)
      }
    }
  }, [hasDrawn, initContext])

  useEffect(() => {
    setupCanvas()

    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      setupCanvas()
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [setupCanvas])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(canvas)
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0

    let clientX = 0
    let clientY = 0

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('clientX' in e) {
      clientX = e.clientX
      clientY = e.clientY
    }

    const cssX = clientX - rect.left - borderLeft - paddingLeft
    const cssY = clientY - rect.top - borderTop - paddingTop

    return { x: cssX, y: cssY }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return
    if ('touches' in e && e.cancelable) {
      e.preventDefault()
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    initContext(ctx)
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return
    if ('touches' in e && e.cancelable) {
      e.preventDefault()
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    initContext(ctx)
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
      dataUrlRef.current = dataUrl
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
    initContext(ctx)
    setHasDrawn(false)
    dataUrlRef.current = null
    onSignatureChange(null)
  }

  return (
    <div className="w-full space-y-2" ref={containerRef}>
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
