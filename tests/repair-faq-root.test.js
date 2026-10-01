const fs = require('fs')
const path = require('path')

describe('Root RepairFAQ Component Exists', () => {
  const rootCompPath = path.resolve(__dirname, '../components/RepairFAQ.tsx')

  test('components/RepairFAQ.tsx exists and re-exports ServicesFaqAccordion', () => {
    expect(fs.existsSync(rootCompPath)).toBe(true)
    const content = fs.readFileSync(rootCompPath, 'utf8')
    expect(content).toContain('RepairFAQ')
    expect(content).toContain('./services/ServicesFaqAccordion')
  })
})
