const fs = require('fs')
const path = require('path')

describe('ApprovalSettings Component & Utilities', () => {
  const componentPath = path.resolve(__dirname, '../components/mcp/ApprovalSettings.tsx')

  test('components/mcp/ApprovalSettings.tsx file exists', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  test('defines mode toggles for Always Ask, Fine-Grained, and No Approval', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain("'always_ask'")
    expect(content).toContain("'fine_grained'")
    expect(content).toContain("'no_approval'")
    expect(content).toContain('Always Ask')
    expect(content).toContain('Fine-Grained')
    expect(content).toContain('No Approval')
    expect(content).toContain('formatApprovalPolicyLabel')
    expect(content).toContain('getApprovalPolicyDescription')
    expect(content).toContain('ApprovalSettings')
  })

  test('includes security warning for No Approval mode', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('no_approval')
    expect(content).toContain('Security Warning')
  })
})
