const fs = require('fs')
const path = require('path')

describe('SendGrid Repair Notification Cloud Function', () => {
  const funcPath = path.resolve(__dirname, '../functions/src/index.ts')
  const pkgPath = path.resolve(__dirname, '../functions/package.json')

  test('functions/src/index.ts exists and implements sendRepairStatusEmail', () => {
    expect(fs.existsSync(funcPath)).toBe(true)
    const content = fs.readFileSync(funcPath, 'utf8')
    expect(content).toContain('sendRepairStatusEmail')
    expect(content).toContain('repair_requests/')
    expect(content).toContain('onUpdate')
    expect(content).toContain('@sendgrid/mail')
    expect(content).toContain('kit_requested')
    expect(content).toContain('inbound_transit')
    expect(content).toContain('bench_triage')
    expect(content).toContain('qc_calibration')
    expect(content).toContain('outbound_delivery')
  })

  test('functions/package.json includes sendgrid dependency', () => {
    expect(fs.existsSync(pkgPath)).toBe(true)
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    expect(pkg.dependencies['@sendgrid/mail']).toBeDefined()
  })
})
