import type { NextApiRequest, NextApiResponse } from 'next'
import { isAuth0Enabled } from '../../../lib/auth0'

/**
 * Auth0 routes fail closed. Until Auth0 is configured and the login flow is
 * implemented: login/callback/logout return 503 and profile returns 401.
 * Never returns a made-up user.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const raw = req.query.auth0
  const action = Array.isArray(raw) ? raw[0] : raw

  if (action === 'profile' || action === 'me') {
    return res.status(401).json({ error: 'Not signed in' })
  }

  if (action === 'login' || action === 'callback' || action === 'logout') {
    if (!isAuth0Enabled) {
      return res.status(503).json({ error: 'Sign-in is not configured' })
    }
  }

  return res.status(404).json({ error: 'Not found' })
}
