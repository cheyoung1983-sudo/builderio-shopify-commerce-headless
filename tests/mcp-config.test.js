const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runMcpScript(testFnBody) {
  const repoRoot = path.resolve(__dirname, '..')
  const mcpUrl = pathToFileURL(path.join(repoRoot, 'config/mcp.ts')).href

  const script = `
    const mcpMod = await import(${JSON.stringify(mcpUrl)})
    const {
      isMcpAllowedForWorkspace,
      validateMcpServerConfig,
      sanitizeMcpHeaders,
      DEFAULT_MCP_APPROVAL_POLICY,
      DEFAULT_MCP_WORKSPACE_SETTINGS,
    } = mcpMod

    ${testFnBody}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  const lines = output.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  const lastJsonLine = lines.reverse().find((l) => l.startsWith('{') && l.endsWith('}'))
  if (!lastJsonLine) {
    throw new Error(`No JSON output line found in script output:\n${output}`)
  }
  return JSON.parse(lastJsonLine)
}

describe('ElevenLabs MCP Configuration & Security Module', () => {
  test('isMcpAllowedForWorkspace permits default workspace settings', () => {
    const res = runMcpScript(`
      const check = isMcpAllowedForWorkspace()
      console.log(JSON.stringify(check))
    `)
    expect(res.allowed).toBe(true)
  })

  test('isMcpAllowedForWorkspace rejects when can_use_mcp_servers is false', () => {
    const res = runMcpScript(`
      const check = isMcpAllowedForWorkspace({ can_use_mcp_servers: false })
      console.log(JSON.stringify(check))
    `)
    expect(res.allowed).toBe(false)
    expect(res.reason).toContain('can_use_mcp_servers is false')
  })

  test('isMcpAllowedForWorkspace rejects under Zero Retention Mode (ZRM) or HIPAA', () => {
    const zrmRes = runMcpScript(`
      const check = isMcpAllowedForWorkspace({ can_use_mcp_servers: true, zeroRetentionModeActive: true })
      console.log(JSON.stringify(check))
    `)
    expect(zrmRes.allowed).toBe(false)
    expect(zrmRes.reason).toContain('Zero Retention Mode')

    const hipaaRes = runMcpScript(`
      const check = isMcpAllowedForWorkspace({ can_use_mcp_servers: true, hipaaComplianceActive: true })
      console.log(JSON.stringify(check))
    `)
    expect(hipaaRes.allowed).toBe(false)
    expect(hipaaRes.reason).toContain('HIPAA')
  })

  test('validateMcpServerConfig validates properly formatted servers', () => {
    const validRes = runMcpScript(`
      const check = validateMcpServerConfig({
        name: 'Shopify Storefront MCP',
        url: 'https://mcp.shopify.com/api',
        transport: 'SSE',
        approvalPolicy: { mode: 'always_ask' }
      })
      console.log(JSON.stringify(check))
    `)
    expect(validRes.valid).toBe(true)
    expect(validRes.errors).toHaveLength(0)

    const invalidRes = runMcpScript(`
      const check = validateMcpServerConfig({
        name: '',
        url: 'invalid_url',
        transport: 'INVALID'
      })
      console.log(JSON.stringify(check))
    `)
    expect(invalidRes.valid).toBe(false)
    expect(invalidRes.errors.length).toBeGreaterThanOrEqual(2)
  })

  test('sanitizeMcpHeaders strips authorization and secret keys', () => {
    const sanitized = runMcpScript(`
      const headers = {
        'content-type': 'application/json',
        'authorization': 'Bearer sk_live_secret_123',
        'x-api-key': 'secret_456',
        'custom-id': 'client_1'
      }
      console.log(JSON.stringify(sanitizeMcpHeaders(headers)))
    `)
    expect(sanitized['content-type']).toBe('application/json')
    expect(sanitized['authorization']).toBe('[REDACTED]')
    expect(sanitized['x-api-key']).toBe('[REDACTED]')
    expect(sanitized['custom-id']).toBe('client_1')
  })
})
