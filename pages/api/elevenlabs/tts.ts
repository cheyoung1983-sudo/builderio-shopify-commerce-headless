import type { NextApiRequest, NextApiResponse } from 'next'
import { elevenLabsRequest } from '../../../services/elevenlabs.ts'
import { readRawBody, rejectMethod } from '../../../lib/api/read-raw-body.ts'

// Moved from app/api/elevenlabs/tts/route.ts (pure move). 404 in production via proxy.ts.
export const config = { api: { bodyParser: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (rejectMethod(req, res, ['POST', 'OPTIONS'])) return
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'OPTIONS, POST')
    return res.status(204).end()
  }
  try {
    const { text, voiceId } = JSON.parse((await readRawBody(req)).toString('utf8'))

    const response = await elevenLabsRequest(`/text-to-speech/${voiceId}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })

    const audio = Buffer.from(await response.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    return res.status(200).send(audio)
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
