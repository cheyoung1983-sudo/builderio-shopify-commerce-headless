const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8')

const COMPONENT = 'components/services/HowYourRepairWorks.tsx'

describe('How Your Repair Works infographic copy', () => {
  const src = read(COMPONENT)
  // Customer-facing copy only: drop the header comment block.
  const copy = src.replace(/\/\*\*[\s\S]*?\*\//g, '')
  // Visible step and heading strings only (no class names).
  const text = [...copy.matchAll(/(?:title|body|subtitle): '([^']*)'/g)].map((m) => m[1]).join('\n')

  test('is rendered on /services', () => {
    const page = read('pages/services.tsx')
    expect(page).toMatch(/import \{ HowYourRepairWorks \} from '..\/components\/services\/HowYourRepairWorks'/)
    expect(page).toContain('<HowYourRepairWorks')
  })

  test('uses an ordered list with decorative icons hidden from screen readers', () => {
    expect(copy).toContain('<ol')
    expect(copy).toContain('aria-labelledby')
    const svgs = copy.match(/<svg\b[^>]*>/g) || []
    expect(svgs.length).toBeGreaterThan(0)
    for (const tag of svgs) expect(tag).toContain('aria-hidden="true"')
  })

  test('$40 is stated without naming it (name still undecided) and is credited toward the repair', () => {
    expect(copy).toContain('Pay $40 and we mail you a kit.')
    expect(copy).toContain('The $40 is credited toward an approved repair.')
    expect(copy).not.toMatch(/diagnostic fee|mail-in kit \(\$40\)|kit fee|mail-in service/i)
  })

  test('included prepaid label and ground-only return shipping', () => {
    expect(copy).toContain('prepaid label for sending your device to us')
    expect(copy).toContain('with the included label')
    expect(copy).toContain('ground shipping')
    expect(copy).not.toMatch(/overnight|priority air|two-day|\$45/i)
  })

  test('$25 trip fee only on the on-site track', () => {
    const mailIn = copy.slice(copy.indexOf('MAIL_IN_STEPS'), copy.indexOf('const TRACKS'))
    expect(mailIn).not.toContain('$25')
    expect(copy).toContain('On-site visits have a $25 trip fee.')
  })

  test('no removed pages, tracking promises, turnaround promises, storefront, or tribal discount', () => {
    expect(copy).not.toMatch(/track-repair|order-tracking|track (it )?online|real-time|live status/i)
    expect(text.split('\n').length).toBeGreaterThanOrEqual(12)
    expect(text).not.toMatch(/\b\d+\s*(-|–|to)?\s*\d*\s*(hours?|h\b|days?|minutes?)|same[- ]day|on the spot|fast|quick/i)
    expect(copy).not.toMatch(/drop off|drop-off|pick it up|walk-in|our shop|storefront/i)
    expect(copy).not.toMatch(/tribal|20%/i)
  })
})
