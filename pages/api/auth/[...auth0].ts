import type { NextApiRequest, NextApiResponse } from 'next'
import { auth0 } from '../../../lib/auth0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const host = req.headers.host || 'localhost:3000'
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const url = new URL(req.url || '/api/auth', `${protocol}://${host}`)
    
    const headers = new Headers()
    Object.entries(req.headers).forEach(([k, v]) => {
      if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
    })

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
    })

    const response = await auth0.middleware(request)

    res.status(response.status)
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    const text = await response.text()
    return res.send(text)
  } catch (error: any) {
    console.error('[Auth0 Webhook Handler Error]:', error)
    return res.status(500).json({ error: error?.message || 'Auth0 authentication error' })
  }
}
