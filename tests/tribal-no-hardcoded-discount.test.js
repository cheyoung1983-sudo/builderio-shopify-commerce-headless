const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { pathToFileURL } = require('url')

const root = path.resolve(__dirname, '..')
const appDirs = ['blocks', 'components', 'config', 'context', 'hooks', 'lib', 'pages', 'services', 'extensions', 'proxy.ts']

function walk(p, out = []) {
  const full = path.join(root, p)
  if (!fs.existsSync(full)) return out
  const st = fs.statSync(full)
  if (st.isFile()) return out.concat(full)
  for (const name of fs.readdirSync(full)) {
    if (name === 'node_modules' || name === '.next' || name === 'dist') continue
    walk(path.join(p, name), out)
  }
  return out
}

describe('No hardcoded tribal discount code / ID in app code', () => {
  test('TRIBAL-MEMBER-20 and the Shopify discount ID do not appear in app sources', () => {
    const hits = []
    for (const dir of appDirs) {
      for (const file of walk(dir)) {
        if (!/\.(ts|tsx|js|jsx|cjs|mjs|json|graphql|toml|md)$/.test(file)) continue
        const text = fs.readFileSync(file, 'utf8')
        if (text.includes('TRIBAL-MEMBER-20') || text.includes('1826009317748')) hits.push(path.relative(root, file))
      }
    }
    expect(hits).toEqual([])
  })
})

describe('/api/tribal/check-enrollment never verifies', () => {
  test('POST returns 501 manual review, verified:false, no code; GET returns 405', () => {
    const routeUrl = pathToFileURL(path.join(root, 'pages/api/tribal/check-enrollment.ts')).href
    const script = `
      const mod = await import(${JSON.stringify(routeUrl)})
      const run = (method, body) => {
        const out = { headers: {} }
        const res = {
          setHeader: (k, v) => { out.headers[k] = v },
          status: (c) => { out.status = c; return res },
          json: (b) => { out.body = b; return out },
        }
        mod.default({ method, body }, res)
        return out
      }
      const ids = ['NN-94821', 'ABCD', 'anything-goes-12345']
      const posts = ids.map((id) => run('POST', {
        firstName: 'A', lastName: 'B', tribalNation: 'Navajo Nation', tribalEnrollmentId: id,
        customerEmail: 'a@example.org', shippingAddress: { address1: '1 Main St' },
      }))
      console.log(JSON.stringify({ posts, get: run('GET', {}) }))
    `
    const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
    })
    const { posts, get } = JSON.parse(output.trim().split('\n').pop())
    for (const r of posts) {
      expect(r.status).toBe(501)
      expect(r.body.verified).toBe(false)
      expect(r.body.success).toBe(false)
      expect(r.body.manualVerificationRequired).toBe(true)
      expect(r.body.discountApplied).toBe(false)
      expect(r.body.taxExemptionApplied).toBe(false)
      expect(r.body.discount).toBeUndefined()
      expect(JSON.stringify(r.body)).not.toMatch(/TRIBAL-MEMBER/)
    }
    expect(get.status).toBe(405)
  })
})
