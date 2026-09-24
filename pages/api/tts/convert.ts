import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' })
  }

  const { text, voice_id = 'JBFqnCBsd6RMkjVDRZzb', model_id = 'eleven_v3', output_format = 'mp3_44100_128' } = req.body || {}

  if (!text) {
    return res.status(400).json({ ok: false, error: 'Missing text parameter' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'ELEVENLABS_API_KEY is not configured in environment.' })
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice_id)}?output_format=${encodeURIComponent(output_format)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      let parsed = errText
      try {
        parsed = JSON.parse(errText)
      } catch (e) {
        // ignore
      }
      return res.status(response.status).json({ ok: false, error: parsed })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    return res.status(200).json({
      ok: true,
      audioBase64: `data:audio/mp3;base64,${base64Audio}`,
    })
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message })
  }
}
