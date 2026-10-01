const fs = require('fs')
const path = require('path')

describe('Root RepairStatusTracker Component Exists', () => {
  const rootCompPath = path.resolve(__dirname, '../components/RepairStatusTracker.tsx')

  test('components/RepairStatusTracker.tsx exists and re-exports RepairStatusTracker', () => {
    expect(fs.existsSync(rootCompPath)).toBe(true)
    const content = fs.readFileSync(rootCompPath, 'utf8')
    expect(content).toContain('RepairStatusTracker')
  })
})
