const fs = require('fs')
const path = require('path')

describe('Free Prepaid Shipping Kit Request Form & Printable Label', () => {
  const componentPath = path.resolve(__dirname, '../components/MailInRepairRequest.tsx')

  test('MailInRepairRequest component includes Free Prepaid Shipping Kit Request section', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('Free Prepaid Shipping Kit')
    expect(content).toContain('Prepaid Shipping Label')
    expect(content).toContain('Printable Packing Slip')
  })
})
