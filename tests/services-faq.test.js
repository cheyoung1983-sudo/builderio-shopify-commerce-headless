const fs = require('fs')
const path = require('path')

describe('Services & Discounts FAQ Education Hub', () => {
  const pagePath = path.resolve(__dirname, '../pages/services-faq.tsx')
  const faqPath = path.resolve(__dirname, '../pages/faq.tsx')
  const tribalCalcPath = path.resolve(__dirname, '../components/services/TribalEligibilityCalculator.tsx')
  const repairEstPath = path.resolve(__dirname, '../components/services/MailInRepairEstimator.tsx')
  const faqAccordionPath = path.resolve(__dirname, '../components/services/ServicesFaqAccordion.tsx')

  test('all required customer education pages and components exist', () => {
    expect(fs.existsSync(pagePath)).toBe(true)
    expect(fs.existsSync(faqPath)).toBe(true)
    expect(fs.existsSync(tribalCalcPath)).toBe(true)
    expect(fs.existsSync(repairEstPath)).toBe(true)
    expect(fs.existsSync(faqAccordionPath)).toBe(true)
  })

  test('TribalEligibilityCalculator implements 20% official discount and statutory criteria', () => {
    const content = fs.readFileSync(tribalCalcPath, 'utf8')
    expect(content).toContain('discountPercentage: 20')
    expect(content).toContain('20%')
    expect(content).toContain('Official 20% Discount')
    expect(content).toContain('CDTFA Reg 1616')
    expect(content).toContain('WAC 458-20-192')
    expect(content).toContain('TPT Ruling 95-11')
    expect(content).toContain('Scenario 1: Full Privileges (20% Off + 100% Sales Tax Exemption)')
    expect(content).toContain('Scenario 2: Commercial Identity Privileges (20% Off Parts)')
  })

  test('MailInRepairEstimator implements 5-stage lifecycle, battery safety, and $0 return freight', () => {
    const content = fs.readFileSync(repairEstPath, 'utf8')
    expect(content).toContain('FREE ($0.00)')
    expect(content).toContain('outboundOvernightFreight = 0.0')
    expect(content).toContain('returnGroundFreight = 0.0')
    expect(content).toContain('Pre-Shipment SOP')
    expect(content).toContain('IATA PI 967')
    expect(content).toContain('49 CFR 173.185')
    expect(content).toContain('Pre-Auth Hold')
    expect(content).toContain('$25')
  })

  test('ServicesFaqAccordion contains comprehensive Q&As for both documents', () => {
    const content = fs.readFileSync(faqAccordionPath, 'utf8')
    expect(content).toContain('20% Official Commercial Identity Discount')
    expect(content).toContain('tribal-tax')
    expect(content).toContain('tribal-discount')
    expect(content).toContain('mail-in-repair')
    expect(content).toContain('battery-safety')
    expect(content).toContain('Form CDTFA-146-RES')
    expect(content).toContain('WAC 458-20-192')
    expect(content).toContain('UN3481')
    expect(content).toContain('Pay-On-Use')
  })

  test('Navbar and Footer include links to the Services & FAQ hub', () => {
    const navContent = fs.readFileSync(path.resolve(__dirname, '../components/common/Navbar.tsx'), 'utf8')
    const footerContent = fs.readFileSync(path.resolve(__dirname, '../components/common/Footer.tsx'), 'utf8')

    expect(navContent).toContain('/services-faq')
    expect(footerContent).toContain('/services-faq')
    expect(footerContent).toContain('20% Tribal Discount')
    expect(footerContent).toContain('Mail-In Device Repair')
  })
})
