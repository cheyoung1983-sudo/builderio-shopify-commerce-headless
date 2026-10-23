import { Auth0Client } from '@auth0/nextjs-auth0/server'

export const isAuth0Configured = Boolean(
  process.env.AUTH0_SECRET &&
  (process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL) &&
  process.env.AUTH0_CLIENT_ID
)

let clientInstance: Auth0Client | null = null

export function getAuth0Client(): Auth0Client {
  if (!clientInstance) {
    if (isAuth0Configured) {
      clientInstance = new Auth0Client()
    } else {
      // Provide resilient fallback configuration to ensure dev builds succeed
      // when Auth0 cloud credentials are not yet populated in the environment.
      clientInstance = new Auth0Client({
        domain: process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL || 'displaycellpros.us.auth0.com',
        clientId: process.env.AUTH0_CLIENT_ID || 'placeholder-auth0-client-id',
        clientSecret: process.env.AUTH0_CLIENT_SECRET || 'placeholder-auth0-client-secret-minimum-32-chars',
        secret: process.env.AUTH0_SECRET || 'placeholder-session-secret-must-be-at-least-32-characters-long',
        appBaseUrl: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
      })
    }
  }
  return clientInstance
}

export const auth0 = getAuth0Client()
export default auth0
