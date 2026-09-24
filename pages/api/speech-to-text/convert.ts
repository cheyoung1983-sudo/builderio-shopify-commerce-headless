import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import FormData from 'form-data'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'ELEVENLABS_API_KEY is not configured in environment.' })
  }

  const form = formidable({ multiples: false })

  form.parse(req, async (err: any, fields: formidable.Fields, files: formidable.Files) => {
    if (err) {
      return res.status(400).json({ ok: false, error: 'Failed to parse form data' })
    }

    try {
      const formData = new FormData()
      
      const modelId = Array.isArray(fields.model_id) ? fields.model_id[0] : fields.model_id || 'scribe_v2'
      formData.append('model_id', modelId)

      const sourceUrl = Array.isArray(fields.source_url) ? fields.source_url[0] : fields.source_url
      if (sourceUrl) {
        formData.append('source_url', sourceUrl)
      }

      const fileField = files.file
      const fileObj = Array.isArray(fileField) ? fileField[0] : fileField
      if (fileObj && fileObj.filepath) {
        const fileStream = fs.createReadStream(fileObj.filepath)
        formData.append('file', fileStream, fileObj.originalFilename || 'audio.mp3')
      }

      const optionalParams = [
        'language_code', 'tag_audio_events', 'num_speakers', 'timestamps_granularity',
        'diarize', 'diarization_threshold', 'file_format', 'webhook', 'webhook_id',
        'temperature', 'seed', 'use_multi_channel', 'multichannel_output_style',
        'webhook_metadata', 'entity_detection', 'no_verbatim', 'use_speaker_library',
        'detect_speaker_roles', 'entity_redaction', 'entity_redaction_mode', 'keyterms'
      ]

      for (const param of optionalParams) {
        const val = Array.isArray(fields[param]) ? fields[param][0] : fields[param]
        if (val !== undefined && val !== null && val !== '') {
          formData.append(param, String(val))
        }
      }

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          ...formData.getHeaders(),
        },
        body: formData as any,
      })

      const responseText = await response.text()
      let data = responseText
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        // ignore
      }

      if (!response.ok) {
        return res.status(response.status).json({
          ok: false,
          status: response.status,
          error: data,
        })
      }

      return res.status(200).json({
        ok: true,
        result: data,
      })
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: (error as Error).message,
      })
    }
  })
}
