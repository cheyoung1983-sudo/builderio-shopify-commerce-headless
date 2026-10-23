import type { NextApiRequest } from 'next'

/**
 * Read the untouched request body as a Buffer. Used by API routes that set
 * `export const config = { api: { bodyParser: false } }` so they can parse
 * the body exactly like the former App Router `req.json()` / `req.formData()`.
 */
export async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Mirror App Router behavior for unsupported methods: 405 + Allow header.
 * Returns true when the request was rejected.
 */
export function rejectMethod(
  req: NextApiRequest,
  res: { setHeader: (k: string, v: string) => unknown; status: (c: number) => { end: () => unknown } },
  allowed: string[],
): boolean {
  const method = req.method || 'GET'
  if (allowed.includes(method)) return false
  res.setHeader('Allow', allowed.join(', '))
  res.status(405).end()
  return true
}
