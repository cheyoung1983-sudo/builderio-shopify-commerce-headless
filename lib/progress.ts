import NProgress from 'nprogress'

// Configure NProgress with sleek responsive settings
if (typeof window !== 'undefined') {
  NProgress.configure({
    showSpinner: false,
    trickle: true,
    trickleSpeed: 180,
    minimum: 0.1,
    speed: 300,
    easing: 'ease-out',
  })
}

// Track concurrent async tasks (page transitions, Shopify API queries/mutations)
let activeCount = 0
let finishTimer: NodeJS.Timeout | null = null

/**
 * Increment active loading counter and start NProgress if first task
 */
export function startLoading(): void {
  if (typeof window === 'undefined') return

  if (finishTimer) {
    clearTimeout(finishTimer)
    finishTimer = null
  }

  if (activeCount === 0) {
    NProgress.start()
  }
  activeCount++
}

/**
 * Decrement active loading counter and complete NProgress when all tasks finish
 */
export function stopLoading(): void {
  if (typeof window === 'undefined') return

  activeCount = Math.max(0, activeCount - 1)

  if (activeCount === 0) {
    if (finishTimer) {
      clearTimeout(finishTimer)
    }
    // Small delay to allow consecutive micro-tasks to coalesce smoothly without bar flicker
    finishTimer = setTimeout(() => {
      if (activeCount === 0) {
        NProgress.done()
      }
    }, 120)
  }
}

/**
 * Force stop all progress animations immediately
 */
export function forceStopLoading(): void {
  if (typeof window === 'undefined') return
  if (finishTimer) {
    clearTimeout(finishTimer)
    finishTimer = null
  }
  activeCount = 0
  NProgress.done(true)
}

/**
 * Helper to wrap any async Shopify API or fetch operation with progress tracking
 */
export async function withProgress<T>(promise: Promise<T> | (() => Promise<T>)): Promise<T> {
  startLoading()
  try {
    return typeof promise === 'function' ? await promise() : await promise
  } finally {
    stopLoading()
  }
}

export { NProgress }
export default NProgress
