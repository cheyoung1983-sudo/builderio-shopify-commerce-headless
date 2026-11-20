import type { NextApiRequest, NextApiResponse } from 'next'
import { auth0 } from '../../../lib/auth0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await auth0.getSession(req)
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Attempt to get access token. 
    const { token } = await auth0.getAccessToken(req, res)

    return res.status(200).json({ accessToken: token })
  } catch (error: any) {
    console.error('[Auth0 Token API Error]:', error)
    return res.status(500).json({ error: 'Failed to retrieve access token' })
  }
}
