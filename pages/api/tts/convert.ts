import type { NextApiRequest, NextApiResponse } from 'next'

function addWavHeader(pcmBuffer: Buffer, sampleRate: number = 16000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = pcmBuffer.length
  const chunkSize = 36 + dataSize

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(chunkSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcmBuffer] as any)
}

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
        'Accept': output_format.startsWith('pcm') ? 'audio/pcm' : 'audio/mpeg',
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

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    const isPcm = output_format.startsWith('pcm')
    
    let finalBuffer = audioBuffer
    let mimeType = 'audio/mpeg'
    let extension = 'mp3'

    if (isPcm) {
      let sampleRate = 16000
      if (output_format.includes('22050')) sampleRate = 22050
      else if (output_format.includes('44100')) sampleRate = 44100
      finalBuffer = addWavHeader(audioBuffer, sampleRate, 1, 16)
      mimeType = 'audio/wav'
      extension = 'wav'
    }

    const base64Audio = finalBuffer.toString('base64')

    return res.status(200).json({
      ok: true,
      audioBase64: `data:${mimeType};base64,${base64Audio}`,
      format: extension,
    })
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message })
  }
}
