const fs = require('node:fs')
const path = require('node:path')

describe('TribalEligibilityChecker manual review content', () => {
  const componentPath = path.resolve(__dirname, '../components/tribal/TribalEligibilityChecker.tsx')

  test('component presents manual review without hidden verification or discount claims', () => {
    const content = fs.readFileSync(componentPath, 'utf8')

    expect(content).toContain('Tribal Eligibility &amp; Discount: Manual Review')
    expect(content).toContain('tribal-manual-review-notice')
    expect(content).not.toContain('verification-success-alert')
    expect(content).not.toContain('verification-duplicate-blocked-alert')
    expect(content).not.toContain('TRIBAL-MEMBER-20')
    expect(content).not.toContain('20% Tribal Discount Unlocked')
  })
})
