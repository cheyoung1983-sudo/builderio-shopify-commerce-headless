// Runs pages/api/repair-requests/index.ts with stubbed Firebase and prints one JSON result.
// Usage: node --experimental-strip-types --no-warnings --import ./register.mjs run-repair-requests-api.mjs '<json body>'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const { default: handler } = await import(pathToFileURL(path.join(repoRoot, 'pages/api/repair-requests/index.ts')).href)

const body = JSON.parse(process.argv[2])
let statusCode = 200
let json = null
const res = {
  setHeader() {},
  status(code) { statusCode = code; return res },
  json(payload) { json = payload; return res },
}
console.info = () => {}
await handler({ method: 'POST', body }, res)
console.log(JSON.stringify({ statusCode, json, setDocCalls: globalThis.__setDocCalls || [] }))
