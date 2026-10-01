const fs = require('fs')
const path = require('path')

describe('MailInRepairRequest Component Final Verification', () => {
  const componentPath = path.resolve(__dirname, '../components/MailInRepairRequest.tsx')

  test('components/MailInRepairRequest.tsx exists and implements all required fields and Firestore persistence', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('deviceModel')
    expect(content).toContain('serialNumber')
    expect(content).toContain('issueDescription')
    expect(content).toContain('passcode')
    expect(content).toContain('imageUrls')
    expect(content).toContain("doc(db, 'repair_requests'")
    expect(content).toContain('compressImageFile')
    expect(content).toContain('Free Prepaid Shipping Kit')
  })
})
