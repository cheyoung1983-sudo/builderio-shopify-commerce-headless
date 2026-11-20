import { Auth0Client } from '@auth0/nextjs-auth0/server'

export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
export const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID

export const isAuth0Enabled = Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID)

export const auth0 = new Auth0Client({
  domain: AUTH0_DOMAIN || 'AUTH0_DOMAIN_MISSING',
  clientId: AUTH0_CLIENT_ID || 'AUTH0_CLIENT_ID_MISSING',
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  appBaseUrl: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  routes: {
    callback: '/auth/callback',
    login: '/auth/login',
    logout: '/auth/logout',
  },
})
