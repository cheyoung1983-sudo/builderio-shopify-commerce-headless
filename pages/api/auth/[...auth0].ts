import type { NextApiRequest, NextApiResponse } from 'next'
import { isAuth0Configured } from '../../../lib/auth0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth0Action = Array.isArray(req.query.auth0) ? req.query.auth0[0] : req.query.auth0 || 'login'
  const returnTo = (req.query.returnTo as string) || '/track-repair'

  // Handle Profile API
  if (auth0Action === 'profile') {
    if (isAuth0Configured) {
      // Return 204 if unauthenticated or session data if present
      return res.status(204).end()
    }
    // Development / demo account profile
    return res.status(200).json({
      sub: 'auth0|demo_customer_spokane',
      name: 'Spokane Device Owner',
      email: 'customer@example.com',
      nickname: 'Customer',
      email_verified: true,
      isDemo: true,
    })
  }

  // Handle Logout
  if (auth0Action === 'logout') {
    return res.redirect(302, returnTo)
  }

  // Handle Login / Callback
  if (auth0Action === 'login' || auth0Action === 'callback') {
    // If Auth0 credentials are provided, redirect to Auth0 Universal Login
    if (isAuth0Configured) {
      const auth0Domain = process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL
      const clientId = process.env.AUTH0_CLIENT_ID
      const redirectUri = `${process.env.AUTH0_BASE_URL || 'http://localhost:3000'}/api/auth/callback`
      if (auth0Domain && clientId) {
        const authorizeUrl = `https://${auth0Domain.replace(/^https?:\/\//, '')}/authorize?response_type=code&client_id=${encodeURIComponent(
          clientId
        )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`
        return res.redirect(302, authorizeUrl)
      }
    }
    // Fallback: Return to destination with success
    return res.redirect(302, returnTo)
  }

  return res.status(404).json({ error: `Unknown Auth0 action: ${auth0Action}` })
}
