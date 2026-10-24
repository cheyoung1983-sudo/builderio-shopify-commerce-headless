const { execFileSync } = require('node:child_process')
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')

function runHelper(testFnBody) {
  const helperUrl = pathToFileURL(path.join(repoRoot, 'lib/analytics/google-tag.ts')).href
  const script = `
    const { parseGoogleTagId, getGoogleTagScriptSrc } = await import(${JSON.stringify(helperUrl)})
    console.log(JSON.stringify((() => { ${testFnBody} })()))
  `
  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })
  return JSON.parse(output.trim().split('\n').pop())
}

describe('Google tag (gtag.js) loader', () => {
  const componentPath = path.join(repoRoot, 'components/analytics/GoogleTag.tsx')
  const appPath = path.join(repoRoot, 'pages/_app.tsx')

  test('is not rendered when the ID is unset, blank or invalid', () => {
    const result = runHelper(`
      return [undefined, null, '', '   ', 'UA-123456-1', 'g-abc123', 'G-', 'G-abc', 'G-ABC 123',
        'G-ABC123"></script><script>alert(1)</script>', 'G-ABC123&x=1', 42, {}]
        .map((v) => [parseGoogleTagId(v), getGoogleTagScriptSrc(v)])
    `)
    for (const pair of result) expect(pair).toEqual([null, null])
  })

  test('is rendered with the gtag.js loader URL when the ID is valid', () => {
    const result = runHelper(`
      return [parseGoogleTagId('G-ABC123XYZ9'), getGoogleTagScriptSrc('G-ABC123XYZ9'), parseGoogleTagId('  G-ABC123XYZ9 ')]
    `)
    expect(result).toEqual([
      'G-ABC123XYZ9',
      'https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9',
      'G-ABC123XYZ9',
    ])
  })

  test('component renders nothing without a valid ID and uses next/script afterInteractive', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain("from 'next/script'")
    expect(content).toContain('strategy="afterInteractive"')
    expect(content).toContain('process.env.NEXT_PUBLIC_GA_ID')
    expect(content).toMatch(/if \(!tagId \|\| !src\) return null/)
    expect(content).toContain("gtag('config', tagId)")
  })

  test('the measurement ID is never hardcoded in code', () => {
    for (const rel of ['components/analytics/GoogleTag.tsx', 'lib/analytics/google-tag.ts', 'pages/_app.tsx']) {
      expect(fs.readFileSync(path.join(repoRoot, rel), 'utf8')).not.toMatch(/G-[A-Z0-9]{6,}/)
    }
  })

  test('does not use an inline script (the CSP has no script-src unsafe-inline)', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).not.toContain('dangerouslySetInnerHTML')
    expect(content).not.toContain('<script')
  })

  test('is mounted once from pages/_app.tsx', () => {
    const app = fs.readFileSync(appPath, 'utf8')
    expect(app).toContain("import GoogleTag from '@components/analytics/GoogleTag'")
    expect(app.match(/<GoogleTag \/>/g)).toHaveLength(1)
  })

  test('CSP already allows the Google tag hosts for script, connect and img', () => {
    const cfg = fs.readFileSync(path.join(repoRoot, 'next.config.js'), 'utf8')
    const directive = (name) => cfg.split('\n').filter((l) => l.includes(name)).join('\n')
    expect(directive('script-src')).toContain('https://www.googletagmanager.com')
    expect(cfg).toContain('https://www.google-analytics.com')
    expect(directive('img-src')).toContain('https://www.google-analytics.com')
    expect(directive('img-src')).toContain('https://analytics.google.com')
    expect(cfg).toContain('https://analytics.google.com https://region1.analytics.google.com')
  })

  test('.env.example documents NEXT_PUBLIC_GA_ID with a blank default', () => {
    const env = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8')
    expect(env).toMatch(/^NEXT_PUBLIC_GA_ID=$/m)
  })
})
