const DEFAULT_TIMEOUT_MS = 10000

function parseArgs(argv) {
  const args = { url: 'http://localhost:3000' }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--url') args.url = argv[index + 1]
  }
  return args
}

async function request(baseUrl, route, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      ...options,
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/html',
        ...(options.headers || {}),
      },
    })
    return {
      status: response.status,
      location: response.headers.get('location') || '',
      headers: response.headers,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function runSecurityTests(baseUrl) {
  const results = []

  async function expect(name, callback) {
    try {
      await callback()
      results.push({ name, outcome: 'PASS' })
    } catch (error) {
      results.push({ name, outcome: 'FAIL', detail: error.message })
    }
  }

  await expect('homepage security headers', async () => {
    const response = await request(baseUrl, '/')
    if (response.status >= 500) throw new Error(`unexpected HTTP ${response.status}`)
    if (!response.headers.get('content-security-policy')?.includes("default-src 'self'")) {
      throw new Error('default-src CSP directive is missing')
    }
    if (response.headers.get('x-content-type-options') !== 'nosniff') {
      throw new Error('X-Content-Type-Options is missing')
    }
  })

  await expect('account login rejects non-GET', async () => {
    const response = await request(baseUrl, '/api/account/login', { method: 'POST' })
    if (response.status !== 405) throw new Error(`expected 405, got ${response.status}`)
  })

  await expect('account callback rejects non-GET', async () => {
    const response = await request(baseUrl, '/api/account/callback', { method: 'POST' })
    if (response.status !== 405) throw new Error(`expected 405, got ${response.status}`)
  })

  await expect('logout blocks external return targets', async () => {
    const response = await request(baseUrl, '/api/account/logout?returnTo=https%3A%2F%2Fevil.example', { method: 'GET' })
    if (response.status !== 302) throw new Error(`expected 302, got ${response.status}`)
    if (response.location.includes('evil.example')) throw new Error('external redirect target was preserved')
  })

  await expect('agent search rejects unsupported methods', async () => {
    const response = await request(baseUrl, '/api/agent/search', { method: 'PUT' })
    if (response.status !== 405) throw new Error(`expected 405, got ${response.status}`)
  })

  await expect('agent cart rejects unsupported methods', async () => {
    const response = await request(baseUrl, '/api/agent/cart', { method: 'GET' })
    if (response.status !== 405) throw new Error(`expected 405, got ${response.status}`)
  })

  await expect('newsletter rejects unsupported methods', async () => {
    const response = await request(baseUrl, '/api/newsletter/subscribe', { method: 'GET' })
    if (response.status !== 405) throw new Error(`expected 405, got ${response.status}`)
  })

  return results
}

async function main() {
  const { url } = parseArgs(process.argv.slice(2))
  const results = await runSecurityTests(url.replace(/\/$/, ''))
  const failed = results.filter((result) => result.outcome === 'FAIL')
  console.log('\nSecurity smoke test results:\n')
  results.forEach((result) => {
    console.log(`  ${result.outcome === 'PASS' ? '✓' : '✗'} ${result.name}${result.detail ? ` — ${result.detail}` : ''}`)
  })
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed\n`)
  process.exitCode = failed.length > 0 ? 1 : 0
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Security smoke tests could not run: ${error.message}`)
    process.exitCode = 1
  })
}

module.exports = { runSecurityTests }
