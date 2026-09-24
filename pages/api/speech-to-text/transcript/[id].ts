import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use GET or DELETE.' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing or invalid transcription_id' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(400).json({
      ok: false,
      error: 'ELEVENLABS_API_KEY is not configured in environment.',
    })
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/speech-to-text/transcripts/${encodeURIComponent(id)}`, {
      method: req.method,
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let parsedError = errorText
      try {
        parsedError = JSON.parse(errorText)
      } catch (e) {
        // ignore
      }
      return res.status(response.status).json({
        ok: false,
        status: response.status,
        error: parsedError,
      })
    }

    if (req.method === 'DELETE') {
      return res.status(200).json({
        ok: true,
        message: 'Delete completed successfully.',
      })
    }

    const data = await response.json()
    return res.status(200).json({
      ok: true,
      transcript: data,
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: (err as Error).message,
    })
  }
}
