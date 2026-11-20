const crypto = require('node:crypto')

/**
 * Generates an ephemeral RSA-2048 keypair and helper functions to mint valid,
 * cryptographically signed RS256 Firebase ID tokens for testing `verifyFirebaseIdToken`
 * without hitting Google's network endpoints.
 */
function createFirebaseJwtMock(projectId = 'dcpllcrev4') {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  })
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' })
  const kid = 'test-firebase-kid-1'

  function signIdToken({
    email = 'ryan@displaycellpros.com',
    email_verified = true,
    sub = 'firebase-owner-uid-1',
    aud = projectId,
    iss = `https://securetoken.google.com/${projectId}`,
    expiresInSeconds = 3600,
    alg = 'RS256',
    tokenKid = kid,
  } = {}) {
    const nowSec = Math.floor(Date.now() / 1000)
    const header = Buffer.from(JSON.stringify({ alg, kid: tokenKid, typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({
        aud,
        iss,
        sub,
        email,
        email_verified,
        auth_time: nowSec - 10,
        iat: nowSec - 10,
        exp: nowSec + expiresInSeconds,
      })
    ).toString('base64url')

    const signer = crypto.createSign('RSA-SHA256')
    signer.update(`${header}.${payload}`)
    signer.end()
    const signature = signer.sign(privateKey).toString('base64url')
    return `${header}.${payload}.${signature}`
  }

  return {
    kid,
    publicPem,
    certsPayload: { [kid]: publicPem },
    signIdToken,
  }
}

module.exports = { createFirebaseJwtMock }
