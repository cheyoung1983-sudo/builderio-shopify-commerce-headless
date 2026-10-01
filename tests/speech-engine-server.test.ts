import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verifySpeechEngineJwt } from '../lib/compliance/jwt'

function createMockJwt(
  payload: Record<string, any>,
  secret: Buffer | string,
  expiresInSec = 60
): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')

  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    exp: now + expiresInSec,
  }
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')

  const signatureB64 = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url')

  return `${headerB64}.${payloadB64}.${signatureB64}`
}

describe('Speech Engine JWT Verification', () => {
  const apiKey = 'sk_test_mock_elevenlabs_api_key_12345'
  const hmacSecret = crypto.createHash('sha256').update(apiKey).digest()

  it('should successfully verify a valid ElevenLabs Speech Engine JWT', () => {
    const validJwt = createMockJwt(
      {
        iss: 'https://api.elevenlabs.io/convai/speech-engine',
        sub: 'convai_speech_engine_upstream',
      },
      hmacSecret
    )

    const isValid = verifySpeechEngineJwt(validJwt, apiKey)
    expect(isValid).toBe(true)
  })

  it('should reject a JWT signed with an incorrect secret', () => {
    const invalidJwt = createMockJwt(
      {
        iss: 'https://api.elevenlabs.io/convai/speech-engine',
        sub: 'convai_speech_engine_upstream',
      },
      'wrong_secret'
    )

    const isValid = verifySpeechEngineJwt(invalidJwt, apiKey)
    expect(isValid).toBe(false)
  })

  it('should reject a JWT with invalid issuer or subject', () => {
    const invalidJwt = createMockJwt(
      {
        iss: 'https://invalid-issuer.com',
        sub: 'convai_speech_engine_upstream',
      },
      hmacSecret
    )

    const isValid = verifySpeechEngineJwt(invalidJwt, apiKey)
    expect(isValid).toBe(false)
  })
})
