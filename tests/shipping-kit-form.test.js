const fs = require('fs')
const path = require('path')

describe('Shipping Kit Request Form & Printable Label', () => {
  const componentPath = path.resolve(__dirname, '../components/MailInRepairRequest.tsx')

  test('MailInRepairRequest component includes Shipping Kit Request section', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('Request a Shipping Kit')
    expect(content).toContain('MAIL_IN_SHIPPING_POLICY')
    expect(content).not.toContain('Free Prepaid Shipping Kit')
    expect(content).not.toContain('100% free')
    expect(content).toContain('Printable Packing Slip')
  })
})
