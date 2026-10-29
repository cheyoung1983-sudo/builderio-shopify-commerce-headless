const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const repoRoot = path.resolve(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8')

const EXPECTED_TERMS =
  'The $40 diagnostic fee is credited toward an approved repair. If you cancel before your kit ships, you get a full refund. Once your kit ships, we keep the full $40. We pay return shipping.'
const EXPECTED_FORM_ONLY = 'You must check the box to agree before paying.'
const EXPECTED_LABEL = 'I agree to the diagnostic fee and cancellation terms above.'

function loadPolicy() {
  const url = pathToFileURL(path.join(repoRoot, 'lib/pricing/mail-in-policy.ts')).href
  const script = `const m = await import(${JSON.stringify(url)});
    const at = new Date('2026-10-24T12:00:00.000Z');
    console.log(JSON.stringify({
      m: { ...m, buildTermsAcceptance: undefined },
      yes: m.buildTermsAcceptance({ accepted: true }, at),
      no: [undefined, null, {}, { accepted: false }, { accepted: 'true' }, { accepted: 1 }, 'true'].map((v) => m.buildTermsAcceptance(v, at)),
    }))`
  return JSON.parse(
    execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', script], { cwd: repoRoot, encoding: 'utf8' }).trim()
  )
}

const MAIL_IN_SURFACES = [
  'components/services/MailInRepairEstimator.tsx',
  'components/services/MailInRepairRequestForm.tsx',
  'components/services/ServicesFaqAccordion.tsx',
  'components/services/RepairRequestBridge.tsx',
  'components/services/RepairStatusLookup.tsx',
  'components/services/RepairStatusTracker.tsx',
  'components/MailInRepairRequest.tsx',
  'pages/services.tsx',
  'pages/services-faq.tsx',
  'pages/track-repair.tsx',
  'pages/api/repair-requests/index.ts',
  'lib/elevenlabs-variables.ts',
  'docs/elevenlabs-knowledge-base.md',
  'public/elevenlabs-knowledge-base.txt',
]

describe('Mail-in policy module: single source of truth', () => {
  const { m, yes, no } = loadPolicy()

  test('exact decided strings', () => {
    expect(m.MAIL_IN_TERMS).toBe(EXPECTED_TERMS)
    expect(m.MAIL_IN_FORM_ONLY_SENTENCE).toBe(EXPECTED_FORM_ONLY)
    expect(m.MAIL_IN_ACCEPT_LABEL).toBe(EXPECTED_LABEL)
    expect(m.MAIL_IN_OVERNIGHT_UPGRADE_USD).toBe(45)
    expect(m.MAIL_IN_DIAGNOSTIC_FEE_USD).toBe(40)
  })

  test('shipping policy: shop pays outbound and return, customer pays inbound label with no price stated', () => {
    expect(m.MAIL_IN_SHIPPING_POLICY).toContain('two-day USPS Priority')
    expect(m.MAIL_IN_SHIPPING_POLICY).toContain('You pay the label for sending your device to us.')
    expect(m.MAIL_IN_SHIPPING_POLICY).not.toMatch(/\$\d/)
  })

  test('$45 appears only in the overnight note, never in the terms or shipping policy', () => {
    expect(m.MAIL_IN_OVERNIGHT_NOTE).toContain('$45')
    expect(m.MAIL_IN_TERMS).not.toContain('$45')
    expect(m.MAIL_IN_SHIPPING_POLICY).not.toContain('$45')
  })

  test('buildTermsAcceptance only accepts a literal true and records boolean + ISO timestamp', () => {
    expect(yes).toEqual({ accepted: true, acceptedAt: '2026-10-24T12:00:00.000Z', termsVersion: m.MAIL_IN_TERMS_VERSION })
    expect(Object.keys(yes).sort()).toEqual(['accepted', 'acceptedAt', 'termsVersion'])
    expect(no.every((v) => v === null)).toBe(true)
  })
})

describe('TERMS is shown on the Estimator, the Form and the FAQ via the shared module', () => {
  test.each([
    'components/services/MailInRepairEstimator.tsx',
    'components/services/MailInRepairRequestForm.tsx',
    'components/services/ServicesFaqAccordion.tsx',
  ])('%s imports and renders MAIL_IN_TERMS', (rel) => {
    const src = read(rel)
    expect(src).toMatch(/import \{[^}]*\bMAIL_IN_TERMS\b[^}]*\} from '[./]+\/lib\/pricing\/mail-in-policy'/)
    expect(src.match(/\bMAIL_IN_TERMS\b/g).length).toBeGreaterThanOrEqual(2)
  })

  test('the literal terms text lives only in the policy module and the voice KB files', () => {
    const files = []
    const walk = (dir) => {
      for (const entry of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (['node_modules', '.next', '.git', 'tests', 'coverage'].includes(entry.name)) continue
          walk(rel)
        } else if (/\.(tsx?|jsx?|md|txt)$/.test(entry.name)) files.push(rel)
      }
    }
    for (const dir of ['components', 'pages', 'lib', 'services', 'docs', 'public', 'blocks', 'context', 'config']) {
      if (fs.existsSync(path.join(repoRoot, dir))) walk(dir)
    }
    const holders = files.filter((rel) => read(rel).includes('The $40 diagnostic fee is credited'))
    expect(holders.sort()).toEqual(
      ['docs/elevenlabs-knowledge-base.md', 'lib/pricing/mail-in-policy.ts', 'public/elevenlabs-knowledge-base.txt'].sort()
    )
  })

  test('voice KB files carry the MAIL-IN REPAIR section with TERMS word for word and no checkbox sentence', () => {
    for (const rel of ['docs/elevenlabs-knowledge-base.md', 'public/elevenlabs-knowledge-base.txt']) {
      const src = read(rel)
      expect(src).toContain('## MAIL-IN REPAIR')
      expect(src).toContain(EXPECTED_TERMS)
      expect(src).not.toContain(EXPECTED_FORM_ONLY)
      expect(src).not.toContain(EXPECTED_LABEL)
    }
  })
})

describe('Checkbox sentence appears only in the Form, above the final submit button', () => {
  const form = read('components/services/MailInRepairRequestForm.tsx')

  test('form-only sentence and checkbox label are used only by the form (and defined in the policy module)', () => {
    const usedIn = (needle) =>
      MAIL_IN_SURFACES.filter((rel) => read(rel).includes(needle)).sort()
    for (const name of ['MAIL_IN_FORM_ONLY_SENTENCE', 'MAIL_IN_ACCEPT_LABEL']) {
      expect(usedIn(name)).toEqual(['components/services/MailInRepairRequestForm.tsx'])
    }
    for (const literal of [EXPECTED_FORM_ONLY, EXPECTED_LABEL]) {
      expect(usedIn(literal)).toEqual([])
    }
  })

  test('bold terms block and checkbox render before the final submit button', () => {
    const termsIdx = form.indexOf('data-testid="mail-in-fee-terms"')
    const textIdx = form.indexOf('data-testid="mail-in-fee-terms-text"')
    const checkboxIdx = form.indexOf('data-testid="mail-in-terms-checkbox"')
    const submitIdx = form.indexOf('data-testid="mail-in-final-submit"')
    expect(termsIdx).toBeGreaterThan(-1)
    expect(submitIdx).toBeGreaterThan(-1)
    expect(termsIdx).toBeLessThan(textIdx)
    expect(textIdx).toBeLessThan(checkboxIdx)
    expect(checkboxIdx).toBeLessThan(submitIdx)
    // It is the last submit button in the form, and nothing else submits after it.
    expect(form.lastIndexOf('type="submit"')).toBeGreaterThan(checkboxIdx)
    // The terms text is bold.
    expect(form.slice(termsIdx, textIdx + 80)).toMatch(/className="font-bold[^"]*"\s+data-testid="mail-in-fee-terms-text"/)
  })

  test('submit is disabled until the box is checked, and handleSubmit refuses without it', () => {
    expect(form).toContain('const [termsAccepted, setTermsAccepted] = useState<boolean>(false)')
    expect(form).toMatch(/disabled=\{isSubmitting \|\| !isSopReady \|\| !termsAccepted\}/)
    expect(form).toMatch(/checked=\{termsAccepted\}/)
    expect(form).toMatch(/if \(!termsAccepted\)/)
    expect(form).toContain('termsAcceptance: { accepted: true }')
  })
})

describe('/api/repair-requests requires and records acceptance', () => {
  const run = (body) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--experimental-strip-types',
          '--no-warnings',
          '--import',
          path.join(repoRoot, 'tests/helpers/register-api-loader.mjs'),
          path.join(repoRoot, 'tests/helpers/run-repair-requests-api.mjs'),
          JSON.stringify(body),
        ],
        { cwd: repoRoot, encoding: 'utf8' }
      ).trim()
    )

  const valid = {
    itemDetails: { deviceBrand: 'Apple', deviceModel: 'iPhone 13', symptoms: ['screen_cracked'] },
    shippingKit: {
      recipientName: 'Test Customer',
      email: 'test@example.com',
      phone: '',
      address: { street: '1 Main St', city: 'Spokane', state: 'WA', zip: '99201' },
      courierPreference: 'USPS_PRIORITY',
      kitType: 'electrostatic_foam_mailer',
    },
    sopChecklist: {},
  }

  test.each([
    ['missing', undefined],
    ['null', null],
    ['accepted false', { accepted: false }],
    ['accepted as a string', { accepted: 'true' }],
    ['empty object', {}],
  ])('rejects with 400 when acceptance is %s, and writes nothing', (_name, termsAcceptance) => {
    const out = run({ ...valid, termsAcceptance })
    expect(out.statusCode).toBe(400)
    expect(out.json.success).toBe(false)
    expect(out.setDocCalls).toEqual([])
  })

  test('records accepted + ISO timestamp (and nothing extra) when accepted', () => {
    const before = Date.now()
    const out = run({ ...valid, termsAcceptance: { accepted: true, acceptedAt: '1999-01-01T00:00:00.000Z', email: 'x@y.z' } })
    expect(out.statusCode).toBe(200)
    const rec = out.json.record.termsAcceptance
    expect(Object.keys(rec).sort()).toEqual(['accepted', 'acceptedAt', 'termsVersion'])
    expect(rec.accepted).toBe(true)
    expect(new Date(rec.acceptedAt).toISOString()).toBe(rec.acceptedAt)
    // The server sets the timestamp; a client-supplied one is ignored.
    expect(new Date(rec.acceptedAt).getTime()).toBeGreaterThanOrEqual(before - 1000)
    // The same record is what is persisted.
    expect(out.setDocCalls).toHaveLength(1)
    expect(out.setDocCalls[0].data.termsAcceptance).toEqual(rec)
  })
})

describe('Obsolete mail-in claims are gone from the mail-in surfaces', () => {
  const FORBIDDEN = [
    'complimentary',
    'Complimentary',
    'FREE ($0.00)',
    'Pre-Auth Hold',
    'pre-authorization hold',
    '100% free',
    '100% Free',
    'Free Prepaid Shipping Kit',
    'repair-pre-auth-hold',
    'overnight kit',
    'Pay-On-Use',
  ]
  test.each(MAIL_IN_SURFACES)('%s has none of the forbidden strings', (rel) => {
    const src = read(rel)
    for (const bad of FORBIDDEN) expect(src).not.toContain(bad)
  })

  test('$25 trip fee stays on-site only (diagnosis page keeps it, mail-in surfaces do not mention it except the voice KB rule)', () => {
    expect(read('pages/diagnosis.tsx')).toContain('$25')
    for (const rel of MAIL_IN_SURFACES.filter((r) => !/elevenlabs-knowledge-base/.test(r))) {
      expect(read(rel)).not.toMatch(/\$25\b/)
    }
  })

  test('badge renamed to "Free online triage"', () => {
    const src = read('pages/diagnosis.tsx')
    expect(src).toContain('Free online triage')
    expect(src).not.toContain('Free online diagnosis')
  })

  test('$45 overnight upgrade is stated only where overnight is mentioned', () => {
    for (const rel of MAIL_IN_SURFACES) {
      const src = read(rel)
      if (/\$45\b/.test(src)) expect(src).toMatch(/[Oo]vernight/)
    }
  })
})
