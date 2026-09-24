import React, { useState, useSyncExternalStore } from 'react'
import { Share2, Copy, Check, ExternalLink } from 'lucide-react'

// External store subscription for client-side Web Share API support detection
const emptySubscribe = () => () => {}
const getClientWebShareSnapshot = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const getServerWebShareSnapshot = () => false

export interface SocialShareButtonsProps {
  /** The canonical URL to share. If omitted, uses the current page URL. */
  url?: string
  /** Product or page title to share */
  title?: string
  /** Short text summary or product description for the share payload */
  description?: string
  /** Custom container class name */
  className?: string
  /** Display variant: 'default' (full bar with labels), 'compact' (smaller buttons), 'pills' (rounded pills) */
  variant?: 'default' | 'compact' | 'pills'
  /** Whether to show the "Share this product" section header */
  showLabel?: boolean
  /** Custom label text */
  labelText?: string
}

export const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
  url,
  title = '',
  description = '',
  className = '',
  variant = 'default',
  showLabel = true,
  labelText = 'Share this product',
}) => {
  const [copied, setCopied] = useState<boolean>(false)
  const [copyFeedback, setCopyFeedback] = useState<string>('')

  // Detect Web Share API capability safely without cascading render effects
  const canWebShare = useSyncExternalStore(
    emptySubscribe,
    getClientWebShareSnapshot,
    getServerWebShareSnapshot
  )

  // Resolve target URL safely without cascading setState in effect
  const getTargetUrl = (): string => {
    if (url) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }
      if (typeof window !== 'undefined') {
        return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
      }
      return url
    }
    if (typeof window !== 'undefined') {
      return window.location.href
    }
    return ''
  }

  const shareUrl = getTargetUrl()

  // Share text payload
  const shareText = title
    ? description
      ? `${title} — ${description.slice(0, 100)}...`
      : title
    : 'Check out this product'

  // Copy Link Handler with robust fallback
  const handleCopyLink = async () => {
    const targetUrl = shareUrl || (typeof window !== 'undefined' ? window.location.href : '')
    if (!targetUrl) return

    let success = false

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(targetUrl)
        success = true
      } catch (err) {
        console.warn('[SocialShare] Clipboard API write failed, attempting fallback:', err)
      }
    }

    // Fallback for restricted iframe or older browser environments
    if (!success && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = targetUrl
        textarea.style.position = 'fixed'
        textarea.style.top = '0'
        textarea.style.left = '0'
        textarea.style.opacity = '0'
        textarea.style.pointerEvents = 'none'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const execSuccess = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (execSuccess) {
          success = true
        }
      } catch (fallbackErr) {
        console.warn('[SocialShare] execCommand fallback failed:', fallbackErr)
      }
    }

    if (success) {
      setCopied(true)
      setCopyFeedback('Product link copied to clipboard!')
      setTimeout(() => {
        setCopied(false)
        setCopyFeedback('')
      }, 2500)
    }
  }

  // Web Share API Handler
  const handleWebShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title || 'Product Details',
          text: shareText,
          url: shareUrl || (typeof window !== 'undefined' ? window.location.href : ''),
        })
      } catch (err: any) {
        // AbortError is triggered when user cancels or dismisses the share sheet; ignore it safely
        if (err?.name !== 'AbortError') {
          console.warn('[SocialShare] Web Share API failed, falling back to copy link:', err)
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  // Helper to open social share window
  const openSocialWindow = (shareWindowUrl: string, windowName: string) => {
    if (typeof window === 'undefined') return
    const width = 600
    const height = 480
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX)
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY)
    window.open(
      shareWindowUrl,
      windowName,
      `toolbar=no,location=yes,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
    )
  }

  // Social Links
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(shareUrl)}`

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`

  const isCompact = variant === 'compact'
  const isPills = variant === 'pills'

  return (
    <div
      id="product-social-share-container"
      className={`space-y-2.5 ${className}`}
      aria-label="Social sharing options"
    >
      {showLabel && (
        <div className="flex items-center justify-between gap-2">
          <span
            id="social-share-label"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-neutral-500" />
            {labelText}
          </span>
          {copied && (
            <span
              id="social-share-feedback"
              role="status"
              aria-live="polite"
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 animate-fade-in flex items-center gap-1"
            >
              <Check className="w-3 h-3 text-emerald-600" />
              Copied to clipboard!
            </span>
          )}
        </div>
      )}

      {/* Sharing Buttons Row */}
      <div
        id="social-share-buttons-group"
        className={`flex flex-wrap items-center gap-2 ${
          isCompact ? 'text-xs' : 'text-sm'
        }`}
      >
        {/* 1. Native Device Web Share API Button (when supported) */}
        {canWebShare && (
          <button
            id="share-native-device-btn"
            type="button"
            onClick={handleWebShare}
            aria-label="Share via device options (Web Share)"
            title="Share via device options"
            className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-400 focus:outline-hidden ${
              isPills
                ? 'rounded-full px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white'
                : isCompact
                ? 'rounded-lg px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
                : 'rounded-xl px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/15'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Share via Device</span>
          </button>
        )}

        {/* 2. Twitter / X Sharing Button */}
        <button
          id="share-twitter-btn"
          type="button"
          onClick={() => openSocialWindow(twitterShareUrl, 'share-twitter')}
          aria-label={`Share ${title || 'product'} on Twitter`}
          title="Share on Twitter / X"
          className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-neutral-400 focus:outline-hidden ${
            isPills
              ? 'rounded-full px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white'
              : isCompact
              ? 'rounded-lg px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200'
              : 'rounded-xl px-3.5 py-2 bg-neutral-900 hover:bg-black text-white'
          }`}
        >
          <span className="font-bold text-xs tracking-tight">𝕏</span>
          <span>Twitter</span>
          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
        </button>

        {/* 3. Facebook Sharing Button */}
        <button
          id="share-facebook-btn"
          type="button"
          onClick={() => openSocialWindow(facebookShareUrl, 'share-facebook')}
          aria-label={`Share ${title || 'product'} on Facebook`}
          title="Share on Facebook"
          className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-400 focus:outline-hidden ${
            isPills
              ? 'rounded-full px-3.5 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white'
              : isCompact
              ? 'rounded-lg px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
              : 'rounded-xl px-3.5 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-blue-500/15'
          }`}
        >
          <span className="font-bold text-xs">f</span>
          <span>Facebook</span>
          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
        </button>

        {/* 4. Copy Link Button */}
        <button
          id="share-copylink-btn"
          type="button"
          onClick={handleCopyLink}
          aria-label="Copy product link to clipboard"
          title="Copy direct product link"
          className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-neutral-400 focus:outline-hidden ${
            copied
              ? 'bg-emerald-600 text-white border-transparent'
              : 'bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 border border-neutral-300'
          } ${
            isPills
              ? 'rounded-full px-3.5 py-1.5'
              : isCompact
              ? 'rounded-lg px-2.5 py-1.5'
              : 'rounded-xl px-3.5 py-2'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 animate-scaleIn text-white stroke-[2.5]" />
              <span className="font-semibold text-white">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-neutral-500" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      {/* Hidden screen-reader announcement */}
      {copyFeedback && (
        <div className="sr-only" role="status" aria-live="assertive">
          {copyFeedback}
        </div>
      )}
    </div>
  )
}

export default SocialShareButtons
