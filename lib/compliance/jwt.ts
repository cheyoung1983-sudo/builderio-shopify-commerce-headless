import crypto from 'crypto'

export function verifySpeechEngineJwt(token: string, apiKey: string): boolean {
  if (!token || !apiKey) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [headerB64, payloadB64, signatureB64] = parts

  try {
    const hmacSecret = crypto.createHash('sha256').update(apiKey).digest()
    const expectedSignature = crypto
      .createHmac('sha256', Uint8Array.from(hmacSecret))
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url')

    const sigBuf = Uint8Array.from(Buffer.from(signatureB64))
    const expectedBuf = Uint8Array.from(Buffer.from(expectedSignature))

    if (
      sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return false
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8')
    const decoded = JSON.parse(payloadJson)

    const now = Math.floor(Date.now() / 1000)
    const leeway = 60

    if (decoded.exp && typeof decoded.exp === 'number') {
      if (now > decoded.exp + leeway) {
        return false
      }
    }

    return (
      decoded.iss === 'https://api.elevenlabs.io/convai/speech-engine' &&
      decoded.sub === 'convai_speech_engine_upstream'
    )
  } catch (error) {
    return false
  }
}
