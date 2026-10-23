import { Auth0Client } from '@auth0/nextjs-auth0/server'

/**
 * Auth0 configuration. Reads env only; there are no baked-in fallbacks.
 * Without AUTH0_SECRET, AUTH0_DOMAIN (or AUTH0_ISSUER_BASE_URL), AUTH0_CLIENT_ID
 * and AUTH0_CLIENT_SECRET, every Auth0 route fails closed.
 */
export const isAuth0Configured = Boolean(
  process.env.AUTH0_SECRET &&
    (process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL) &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET
)

/**
 * The login/callback/session flow is not implemented yet, so sign-in is
 * reported as unavailable even once the env vars are set. Flip this only
 * when the full code exchange and session handling are in place.
 */
export const isAuth0LoginImplemented = false

export const isAuth0Enabled = isAuth0Configured && isAuth0LoginImplemented

let clientInstance: Auth0Client | null = null

/** Returns the Auth0 client, or null when Auth0 isn't configured. */
export function getAuth0Client(): Auth0Client | null {
  if (!isAuth0Configured) return null
  if (!clientInstance) clientInstance = new Auth0Client()
  return clientInstance
}
