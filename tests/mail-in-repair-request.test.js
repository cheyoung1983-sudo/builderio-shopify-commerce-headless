const fs = require('fs')
const path = require('path')

describe('Mail-In Repair Request & Shipping Kit Form', () => {
  const formPath = path.resolve(__dirname, '../components/services/MailInRepairRequestForm.tsx')
  const apiPath = path.resolve(__dirname, '../pages/api/repair-requests/index.ts')
  const rulesPath = path.resolve(__dirname, '../firestore.rules')
  const pagePath = path.resolve(__dirname, '../pages/services-faq.tsx')

  test('MailInRepairRequestForm component exists', () => {
    expect(fs.existsSync(formPath)).toBe(true)
  })

  test('form includes item diagnostic details, serial/IMEI, symptoms, and lock options', () => {
    const content = fs.readFileSync(formPath, 'utf8')
    expect(content).toContain('deviceBrand')
    expect(content).toContain('deviceModel')
    expect(content).toContain('serialOrImei')
    expect(content).toContain('SYMPTOM_OPTIONS')
    expect(content).toContain('screen_cracked')
    expect(content).toContain('battery_degraded')
    expect(content).toContain('passcode')
    expect(content).toContain('lockStatus')
    expect(content).toContain('cosmeticCondition')
  })

  test('form captures complete shipping kit delivery address and courier choices', () => {
    const content = fs.readFileSync(formPath, 'utf8')
    expect(content).toContain('recipientName')
    expect(content).toContain('street')
    expect(content).toContain('city')
    expect(content).toContain('zip')
    expect(content).toContain('courierPreference')
    expect(content).toContain('UPS_OVERNIGHT')
    expect(content).toContain('FEDEX_OVERNIGHT')
    expect(content).toContain('electrostatic_foam_mailer')
  })

  test('form enforces mandatory Pre-Flight Safety SOP checklist', () => {
    const content = fs.readFileSync(formPath, 'utf8')
    expect(content).toContain('backedUp')
    expect(content).toContain('locksDisabled')
    expect(content).toContain('batteryUnder30')
    expect(content).toContain('accessoriesRemoved')
    expect(content).toContain('Mandatory Pre-Flight Shipping SOP Checklist')
  })

  test('form generates RMS tracking code and includes printable packing slip modal', () => {
    const content = fs.readFileSync(formPath, 'utf8')
    expect(content).toContain('DCP-RMS-')
    expect(content).toContain('ShowPackingSlipModal')
    expect(content).toContain('DisplayCellPros Lab Packing Slip')
    expect(content).toContain('data-testid="mail-in-repair-request-form"')
  })

  test('API route pages/api/repair-requests/index.ts processes payloads and writes to Firestore', () => {
    expect(fs.existsSync(apiPath)).toBe(true)
    const apiContent = fs.readFileSync(apiPath, 'utf8')
    expect(apiContent).toContain('repair_requests')
    expect(apiContent).toContain('rmsNumber')
    expect(apiContent).toContain('itemDetails')
    expect(apiContent).toContain('shippingKit')
  })

  test('firestore.rules protects repair_requests collection', () => {
    const rules = fs.readFileSync(rulesPath, 'utf8')
    expect(rules).toContain('match /repair_requests/{rmsNumber}')
  })

  test('services-faq.tsx renders the MailInRepairRequestForm', () => {
    const pageContent = fs.readFileSync(pagePath, 'utf8')
    expect(pageContent).toContain('MailInRepairRequestForm')
  })
})
