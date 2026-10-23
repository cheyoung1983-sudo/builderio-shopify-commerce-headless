const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8')
const libUrl = pathToFileURL(path.join(repoRoot, 'lib/repair-lookup.ts')).href

function runLookup(record, rms, email) {
  const script = `
    const m = await import(${JSON.stringify(libUrl)})
    const source = { async get(id) { return id === 'DCP-RMS-000123' ? ${JSON.stringify(record)} : null } }
    const input = m.normalizeLookupInput(${JSON.stringify(rms)}, ${JSON.stringify(email)})
    const out = input ? await m.lookupRepair(source, input.rms, input.email) : null
    const none = input ? await m.lookupRepair(null, input.rms, input.email) : null
    process.stdout.write(JSON.stringify({ out, none }))
  `
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }))
}

// Sample record: example.com data only.
const sample = {
  status: 'bench_diagnostic',
  updatedAt: '2026-01-01T00:00:00.000Z',
  estimatedCompletion: 'Tomorrow',
  itemDetails: { deviceBrand: 'Apple', deviceModel: 'iPhone 15', serialOrImei: '000000000000000', passcodeProvided: '0000', notes: 'n' },
  shippingKit: { email: 'Sample@Example.com', phone: '(000) 000-0000', recipientName: 'Sample', address: { street: '1 Example St' } },
}

describe('repair lookup returns only safe fields', () => {
  test('match returns rms, model, status, update time and ETA only', () => {
    const { out } = runLookup(sample, ' dcp-rms-000123 ', 'sample@example.com')
    expect(out).toEqual({
      rmsNumber: 'DCP-RMS-000123',
      deviceModel: 'Apple iPhone 15',
      status: 'bench_diagnostic',
      updatedAt: '2026-01-01T00:00:00.000Z',
      estimatedCompletion: 'Tomorrow',
    })
    const s = JSON.stringify(out)
    for (const leak of ['0000', 'phone', 'address', 'example.com', 'Sample', 'notes']) expect(s).not.toContain(leak)
  })

  test('email mismatch and unknown id are both null; no data source is null', () => {
    expect(runLookup(sample, 'DCP-RMS-000123', 'other@example.com').out).toBeNull()
    expect(runLookup(sample, 'DCP-RMS-999999', 'sample@example.com').out).toBeNull()
    expect(runLookup(sample, 'DCP-RMS-000123', 'sample@example.com').none).toBeNull()
    expect(runLookup(sample, '', 'x').out).toBeNull()
  })
})

describe('lookup API and Auth0 routes fail closed', () => {
  const api = read('pages/api/repair-requests/lookup.ts')
  const auth = read('pages/api/auth/[...auth0].ts')
  const lib = read('lib/auth0.ts')

  test('lookup API is POST-only, rate limited, generic not-found, no demo data', () => {
    expect(api).toMatch(/req\.method !== 'POST'/)
    expect(api).toMatch(/createRateLimiter/)
    expect(api).toMatch(/status\(429\)/)
    expect(api).not.toMatch(/DEMO|cleanEmail|\$\{/)
  })

  test('Auth0: no placeholder secrets, no fake profile, 503 / 401', () => {
    expect(lib).not.toMatch(/placeholder/i)
    expect(auth).not.toMatch(/demo|example\.com/i)
    expect(auth).toMatch(/status\(503\)/)
    expect(auth).toMatch(/status\(401\)/)
  })

  test('no personal email in shipped source', () => {
    const files = execFileSync('git', ['ls-files', 'components', 'pages', 'lib', 'hooks', 'public', 'config'], { cwd: repoRoot, encoding: 'utf8' })
      .split('\n')
      .filter((f) => /\.(t|j)sx?$|\.json$/.test(f))
      // Server-only tribal admin sample (Flow's area); never sent to the browser.
      .filter((f) => f !== 'pages/api/tribal/admin/export-audit.ts')
    for (const f of files) expect(`${f}: ${read(f)}`).not.toMatch(/cheyoung1983@gmail\.com/)
  })
})
