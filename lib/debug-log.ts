/**
 * Development-only console logging for client components.
 * Next.js inlines NODE_ENV at build time, so in production builds this is a no-op
 * and customers' browsers get no debug output.
 */
export function debugLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
}
