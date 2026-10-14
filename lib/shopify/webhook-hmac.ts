/**
 * Shopify webhook HMAC verification (server-only).
 *
 * Shopify signs each webhook with HMAC-SHA256 over the *raw* request body and
 * sends the base64 digest in `X-Shopify-Hmac-Sha256`. Verification must use the
 * exact bytes received (never a re-serialized JSON object) and a timing-safe
 * comparison.
 *
 * Secret: SHOPIFY_WEBHOOK_SECRET, falling back to SHOPIFY_CLIENT_SECRET (app
 * webhooks are signed with the app's client secret).
 */

import crypto from 'node:crypto'

if (typeof window !== 'undefined') {
  throw new Error('lib/shopify/webhook-hmac is server-only and must not be bundled for the browser.')
}

/** Copy into a plain Uint8Array (avoids Buffer/ArrayBufferLike typing mismatches). */
function toBytes(value: string | Buffer): Uint8Array {
  return typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value as any)
}

export function getShopifyWebhookSecret(): string {
  const candidates = [process.env.SHOPIFY_WEBHOOK_SECRET, process.env.SHOPIFY_CLIENT_SECRET]
  for (const value of candidates) {
    if (value && value !== 'undefined' && value.trim()) return value.trim()
  }
  return ''
}

/** Base64 HMAC-SHA256 digest of the raw body (useful for tests/fixtures). */
export function computeShopifyWebhookHmac(rawBody: string | Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(toBytes(rawBody)).digest('base64')
}

/**
 * Returns true only when a secret is configured, a header is present, and the
 * header matches the HMAC of the raw body. Missing secret or header => false.
 */
export function verifyShopifyHmac(
  rawBody: string | Buffer,
  hmacHeader: string | string[] | undefined | null,
  secret: string = getShopifyWebhookSecret()
): boolean {
  if (!secret) return false
  const header = Array.isArray(hmacHeader) ? hmacHeader[0] : hmacHeader
  if (!header || typeof header !== 'string') return false
  if (rawBody === undefined || rawBody === null) return false

  const expected = new Uint8Array(crypto.createHmac('sha256', secret).update(toBytes(rawBody)).digest() as any)
  let received: Uint8Array
  try {
    received = new Uint8Array(Buffer.from(header.trim(), 'base64') as any)
  } catch {
    return false
  }
  if (received.length !== expected.length) return false
  return crypto.timingSafeEqual(received, expected)
}

/**
 * Reads the raw request body as a Buffer. Use with
 * `export const config = { api: { bodyParser: false } }`.
 * A string/Buffer `req.body` (e.g. tests, or a pre-buffered body) is used as-is;
 * a parsed object is rejected because its original bytes are gone.
 */
export async function readRawRequestBody(req: any, maxBytes = 1024 * 1024): Promise<Buffer | null> {
  if (typeof req?.body === 'string') return Buffer.from(req.body, 'utf8')
  if (Buffer.isBuffer(req?.body)) return req.body
  if (req?.body !== undefined && req?.body !== null) return null
  if (!req || typeof req[Symbol.asyncIterator] !== 'function') return null

  const chunks: Uint8Array[] = []
  let total = 0
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? toBytes(chunk) : new Uint8Array(chunk)
    total += buf.length
    if (total > maxBytes) throw new Error('Webhook payload too large')
    chunks.push(buf)
  }
  return Buffer.concat(chunks as any)
}
