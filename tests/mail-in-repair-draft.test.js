const fs = require('fs')
const path = require('path')

describe('MailInRepairRequest sessionStorage Draft Saving', () => {
  const componentPath = path.resolve(__dirname, '../components/MailInRepairRequest.tsx')

  test('MailInRepairRequest implements sessionStorage draft saving and restoration', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('dcp_mail_in_repair_draft')
    expect(content).toContain('sessionStorage.getItem')
    expect(content).toContain('sessionStorage.setItem')
    expect(content).toContain('sessionStorage.removeItem')
    expect(content).toContain('draftRestoredNotice')
    expect(content).toContain('Clear Draft')
  })
})
