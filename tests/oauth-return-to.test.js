const { execFileSync } = require('node:child_process')
const path = require('node:path')

// Extract sanitizeReturnTo from the route source so the test does not pull in Next/Shopify deps.
const repoRoot = path.resolve(__dirname, '..')
function sanitize(values) {
  const src = require('node:fs').readFileSync(path.join(repoRoot, 'pages/api/account/login.ts'), 'utf8')
  const start = src.indexOf('export function sanitizeReturnTo')
  const end = src.indexOf('\n}\n', start) + 2
  const fn = src.slice(start, end).replace('export ', '').replace('(value: unknown): string', '(value)')
  const script = `${fn}\nconsole.log(JSON.stringify(${JSON.stringify(values)}.map(sanitizeReturnTo)))`
  return JSON.parse(execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' }).trim())
}

describe('sanitizeReturnTo (Shopify customer-account OAuth)', () => {
  test('keeps same-origin paths', () => {
    expect(sanitize(['/account/orders', '/products/x?y=1#z'])).toEqual(['/account/orders', '/products/x?y=1#z'])
  })

  test('rejects open-redirect variants', () => {
    const bad = ['//evil.com', '/\t/evil.com', '/\n/evil.com', '/\\evil.com', 'https://evil.com', '/redirect:x', ' /account', '', 'evil.com', '/' + 'a'.repeat(3000)]
    expect(sanitize(bad)).toEqual(bad.map(() => '/account'))
  })
})
