import { useSyncExternalStore } from 'react'

let isHydrated = false
const subscribers = new Set<() => void>()

if (typeof window !== 'undefined') {
  // Defer notification until after initial hydration render finishes
  queueMicrotask(() => {
    isHydrated = true
    subscribers.forEach((callback) => callback())
  })
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

function getClientSnapshot(): boolean {
  return isHydrated
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Hydration-safe mount detection hook.
 * Returns `false` on both server and initial client hydration render.
 * After initial hydration completes, it updates to `true` via external store subscription,
 * eliminating React Hydration Errors (#418, #423) and complying with ESLint rules.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

export default useIsMounted
