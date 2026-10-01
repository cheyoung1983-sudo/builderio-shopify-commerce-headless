const fs = require('fs')
const path = require('path')

describe('MailInRepairRequest Component', () => {
  const componentPath = path.resolve(__dirname, '../components/MailInRepairRequest.tsx')

  test('components/MailInRepairRequest.tsx exists', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  test('includes form for device details (model, serial, issue, passcode)', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('deviceModel')
    expect(content).toContain('serialNumber')
    expect(content).toContain('issueDescription')
    expect(content).toContain('passcode')
  })

  test('includes multi-image upload file picker with camera capture and compression', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('capture="environment"')
    expect(content).toContain('compressImageFile')
    expect(content).toContain('imageUrls')
    expect(content).toContain('Multi-Image Upload File Picker')
  })

  test('saves data to Firestore collection named repair_requests', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain("doc(db, 'repair_requests',")
    expect(content).toContain('setDoc')
    expect(content).toContain('repair_requests')
  })
})
