const fs = require('fs')
const path = require('path')

describe('SendGrid Firebase Cloud Functions Integration', () => {
  const functionsPkgPath = path.resolve(__dirname, '../functions/package.json')
  const functionsIndexPath = path.resolve(__dirname, '../functions/src/index.ts')

  test('functions/package.json exists and includes @sendgrid/mail and firebase-functions', () => {
    expect(fs.existsSync(functionsPkgPath)).toBe(true)
    const pkg = JSON.parse(fs.readFileSync(functionsPkgPath, 'utf8'))
    expect(pkg.dependencies['@sendgrid/mail']).toBeDefined()
    expect(pkg.dependencies['firebase-functions']).toBeDefined()
  })

  test('functions/src/index.ts exports onRepairStatusChanged trigger on repair_requests/{requestId}', () => {
    expect(fs.existsSync(functionsIndexPath)).toBe(true)
    const content = fs.readFileSync(functionsIndexPath, 'utf8')
    expect(content).toContain('onRepairStatusChanged')
    expect(content).toContain("repair_requests/{requestId}")
    expect(content).toContain('sgMail.send')
    expect(content).toContain('rmsTrackingNumber')
    expect(content).toContain('Track Live Repair Progress')
  })
})
