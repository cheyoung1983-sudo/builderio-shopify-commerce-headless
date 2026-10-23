import type { NextApiRequest, NextApiResponse } from 'next'
import { elevenLabsRequest } from '../../../services/elevenlabs.ts'
import { readRawBody, rejectMethod } from '../../../lib/api/read-raw-body.ts'

// Moved from app/api/elevenlabs/stt/route.ts (pure move). 404 in production via proxy.ts.
export const config = { api: { bodyParser: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (rejectMethod(req, res, ['POST', 'OPTIONS'])) return
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'OPTIONS, POST')
    return res.status(204).end()
  }
  try {
    // Re-create a Web Request so multipart parsing matches the old req.formData().
    const raw = await readRawBody(req)
    const webReq = new Request('http://localhost/api/elevenlabs/stt', {
      method: 'POST',
      headers: { 'content-type': String(req.headers['content-type'] || '') },
      body: new Uint8Array(raw),
    })
    const formData = await webReq.formData()

    // ElevenLabs STT expects audio file
    const response = await elevenLabsRequest(`/speech-to-text`, {
      method: 'POST',
      body: formData,
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY as string },
    })

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
