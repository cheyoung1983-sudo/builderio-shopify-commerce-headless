import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * Hydration-safe mount detection hook using useSyncExternalStore.
 * Returns `false` on server, `true` on client immediately after hydration,
 * avoiding any synchronous setState calls during the hydration phase.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export default useIsMounted
