import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Issues a short-lived, single-use ElevenLabs realtime Scribe token.
 *
 * Security: the raw ELEVENLABS_API_KEY must never be returned to the client.
 * On any failure this endpoint returns an error and no token.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(503).json({ ok: false, token: null, error: 'Speech-to-text is not configured.' })
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
    })

    if (!response.ok) {
      return res.status(502).json({ ok: false, token: null, error: 'Failed to obtain speech-to-text token.' })
    }

    const data = (await response.json().catch(() => null)) as { token?: unknown } | null
    const token = data && typeof data.token === 'string' ? data.token : null
    if (!token || token === apiKey) {
      return res.status(502).json({ ok: false, token: null, error: 'Failed to obtain speech-to-text token.' })
    }

    return res.status(200).json({ ok: true, token })
  } catch {
    return res.status(502).json({ ok: false, token: null, error: 'Failed to obtain speech-to-text token.' })
  }
}
