/**
 * @jest-environment node
 *
 * Tribal discount layout: verification-mode flags, shared copy per mode, the
 * read-only "how it works" component, and the links that lead customers to
 * /tribal-discount. Reads source files and renders components with
 * react-dom/server (TypeScript transpiled on the fly). No network.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { pathToFileURL } = require('url')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.resolve(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

// --- load TS modules for rendering -----------------------------------------
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribal-layout-'))
const loaded = {}
function loadTs(rel) {
  if (loaded[rel]) return loaded[rel]
  const src = read(rel)
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  })
  const out = path.join(outDir, rel.replace(/\.tsx?$/, '.js'))
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, outputText)
  // Make sure sibling TS imports resolve to transpiled copies.
  const dir = path.dirname(rel)
  for (const m of outputText.matchAll(/require\("(\.[^"]+)"\)/g)) {
    const target = path.normalize(path.join(dir, m[1]))
    for (const ext of ['.ts', '.tsx']) {
      if (fs.existsSync(path.join(root, target + ext))) loadTs(target + ext)
    }
  }
  // Resolve bare packages (react, lucide-react) from the repo's node_modules.
  const Module = require('module')
  const mod = new Module(out, module)
  mod.filename = out
  mod.paths = Module._nodeModulePaths(root)
  const localRequire = (id) => {
    if (!id.startsWith('.')) return require(id)
    const target = path.normalize(path.join(dir, id))
    for (const ext of ['.ts', '.tsx']) {
      if (fs.existsSync(path.join(root, target + ext))) return loadTs(target + ext)
    }
    return require(path.join(root, target))
  }
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)
  mod.exports = {}
  fn(mod.exports, localRequire, mod, out, path.dirname(out))
  loaded[rel] = mod.exports
  return mod.exports
}

afterAll(() => fs.rmSync(outDir, { recursive: true, force: true }))

// --- verification mode (flags) ---------------------------------------------
function modeFor(env) {
  const url = pathToFileURL(path.join(root, 'lib/tribal/verification-mode.ts')).href
  const code = `const m = await import(${JSON.stringify(url)}); console.log(JSON.stringify(m.getTribalVerificationMode(${JSON.stringify(env)})))`
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, NODE_ENV: 'test' },
  })
  return JSON.parse(out.trim().split('\n').pop())
}

describe('getTribalVerificationMode', () => {
  test('manual when TRIBAL_VERIFY_ENABLED is off, whatever the Stripe flag says', () => {
    expect(modeFor({})).toBe('manual')
    expect(modeFor({ TRIBAL_VERIFY_ENABLED: 'false', STRIPE_IDENTITY_ENABLED: 'true' })).toBe('manual')
  })
  test('review when verify is on and Stripe Identity is not exactly "true"', () => {
    expect(modeFor({ TRIBAL_VERIFY_ENABLED: 'true' })).toBe('review')
    expect(modeFor({ TRIBAL_VERIFY_ENABLED: 'true', STRIPE_IDENTITY_ENABLED: 'TRUE' })).toBe('review')
    expect(modeFor({ TRIBAL_VERIFY_ENABLED: 'true', STRIPE_IDENTITY_ENABLED: '1' })).toBe('review')
  })
  test('stripe when both flags are on', () => {
    expect(modeFor({ TRIBAL_VERIFY_ENABLED: 'true', STRIPE_IDENTITY_ENABLED: 'true' })).toBe('stripe')
  })
  test('the mode module is server-only: no component imports it', () => {
    const offenders = []
    const walk = (dir) => {
      for (const name of fs.readdirSync(path.join(root, dir))) {
        const rel = path.join(dir, name)
        if (fs.statSync(path.join(root, rel)).isDirectory()) walk(rel)
        else if (/\.tsx?$/.test(name) && /from ['"][^'"]*verification-mode['"]/.test(read(rel))) offenders.push(rel)
      }
    }
    walk('components')
    expect(offenders).toEqual([])
  })
})

// --- shared copy -----------------------------------------------------------
describe('verification copy', () => {
  const copy = loadTs('lib/tribal/verification-copy.ts')
  const allCopy = () =>
    JSON.stringify([
      ['manual', 'review', 'stripe'].map((m) => [copy.getTribalSteps(m), copy.getTribalPrivacyPoints(m), copy.getTribalPrivacyOneLiner(m)]),
      copy.TRIBAL_MANUAL_MESSAGE,
      copy.TRIBAL_TROUBLE_TEXT,
      copy.TRIBAL_TAX_NOTE,
      copy.TRIBAL_DISCOUNT_LINE,
    ])

  test('stripe mode has the five steps in order', () => {
    const steps = copy.getTribalSteps('stripe').map((s) => s.title)
    expect(steps).toEqual([
      'Sign in and submit your details',
      "Verify your ID on Stripe's secure page",
      'Our team reviews',
      'Your account is tagged',
      '20% off applies automatically',
    ])
    const detail = copy.getTribalSteps('stripe').map((s) => s.detail).join(' ')
    expect(detail).toContain('selfie')
    expect(detail).toContain('go to Stripe, not to us')
    expect(detail).toContain('never your photos or ID number')
    expect(detail).toContain('A person makes the final call')
  })

  test('review mode drops the Stripe step', () => {
    const steps = copy.getTribalSteps('review').map((s) => s.title)
    expect(steps).toHaveLength(4)
    expect(steps).not.toContain("Verify your ID on Stripe's secure page")
    expect(JSON.stringify(copy.getTribalSteps('review'))).not.toMatch(/Stripe|selfie/)
  })

  test('manual mode has no online steps, only the call/email message', () => {
    expect(copy.getTribalSteps('manual')).toEqual([])
    expect(copy.TRIBAL_MANUAL_MESSAGE).toBe(
      "Online submission isn't open yet. Call (509) 255-3852 or email support@displaycellpros.com and we'll review your enrollment."
    )
  })

  test('eligibility line and privacy block say what the product rules require', () => {
    expect(copy.TRIBAL_ELIGIBILITY_LINE).toBe('Enrolled members of any USA federally recognized tribe.')
    const priv = copy.getTribalPrivacyPoints('stripe').join(' ')
    expect(priv).toContain('collected by Stripe, not by us')
    expect(priv).toContain("don't store ID images or ID numbers")
    expect(priv).toContain('manual review')
    expect(priv).toContain('separate from tax exemption')
    for (const mode of ['manual', 'review', 'stripe']) {
      expect(copy.getTribalPrivacyPoints(mode).join(' ')).toContain('separate from tax exemption')
    }
  })

  test('no promises we cannot keep: no "instant", no turnaround time, no tribal ID promise, no invented hours', () => {
    const text = allCopy()
    expect(text).not.toMatch(/instant/i)
    expect(text).not.toMatch(/\b(\d+\s*(hours?|days?|minutes?|seconds?|business))\b/i)
    expect(text).not.toMatch(/within|same[- ]day|immediately|guarantee/i)
    expect(text).not.toMatch(/tribal (photo )?id (card )?(is|are|will be) accepted|we accept tribal/i)
    expect(text).not.toMatch(/\b(mon(day)?|tue(sday)?|hours)\b|\b\d{1,2}\s?(am|pm)\b/i)
  })

  test('sign-in link encodes the # so the return path survives the query string', () => {
    expect(copy.TRIBAL_SIGN_IN_HREF).toBe('/api/account/login?returnTo=%2Ftribal-discount%23verify')
    // matches the real login route and its returnTo sanitiser
    expect(fs.existsSync(path.join(root, 'pages/api/account/login.ts'))).toBe(true)
    const decoded = decodeURIComponent(copy.TRIBAL_SIGN_IN_HREF.split('returnTo=')[1])
    expect(decoded).toBe('/tribal-discount#verify')
    expect(decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes(':') && !decoded.includes('\\')).toBe(true)
  })
})

// --- TribalHowItWorks ------------------------------------------------------
describe('TribalHowItWorks', () => {
  const { TribalHowItWorks } = loadTs('components/tribal/TribalHowItWorks.tsx')
  const html = (props) => renderToStaticMarkup(React.createElement(TribalHowItWorks, props))

  test('renders no form controls in any mode or variant', () => {
    for (const mode of ['manual', 'review', 'stripe']) {
      for (const variant of ['compact', 'full']) {
        const out = html({ mode, variant })
        expect(out).not.toMatch(/<(input|textarea|select|button|form)\b/i)
      }
    }
    expect(read('components/tribal/TribalHowItWorks.tsx')).not.toMatch(/<input|<textarea|<select|<form/)
  })

  test('shows the right copy for each mode', () => {
    expect(html({ mode: 'stripe', variant: 'full' })).toContain('Verify your ID on Stripe&#x27;s secure page')
    expect(html({ mode: 'stripe', variant: 'full' }).match(/<li/g)).toHaveLength(5)
    expect(html({ mode: 'review', variant: 'full' }).match(/<li/g)).toHaveLength(4)
    const manual = html({ mode: 'manual', variant: 'full' })
    expect(manual).not.toContain('<ol')
    expect(manual).toContain('(509) 255-3852')
    expect(manual).toContain('support@displaycellpros.com')
    for (const mode of ['manual', 'review', 'stripe']) {
      expect(html({ mode, variant: 'compact' })).toContain('Enrolled members of any USA federally recognized tribe.')
    }
  })

  test('is labelled, with an ordered list and a heading level that fits the page', () => {
    const full = html({ mode: 'stripe', variant: 'full' })
    expect(full).toMatch(/<section[^>]*aria-labelledby="tribal-how-heading"/)
    expect(full).toMatch(/<h2 id="tribal-how-heading"/)
    expect(full).toContain('<ol')
    expect(html({ mode: 'stripe', variant: 'compact' })).toMatch(/<h3 id="tribal-how-heading"/)
    expect(html({ mode: 'stripe', variant: 'compact', headingLevel: 4 })).toMatch(/<h4 /)
  })

  test('compact variant is shorter than full', () => {
    expect(html({ mode: 'stripe', variant: 'compact' }).length).toBeLessThan(html({ mode: 'stripe', variant: 'full' }).length)
  })
})

// --- public surfaces -------------------------------------------------------
describe('public tribal surfaces', () => {
  const PUBLIC_FILES = [
    'pages/tribal-discount.tsx',
    'pages/account/index.tsx',
    'pages/services-faq.tsx',
    'components/services/ServicesFaqAccordion.tsx',
    'components/account/TribalDiscountAccountCard.tsx',
    'components/tribal/TribalHowItWorks.tsx',
    'components/tribal/TribalVerifyCta.tsx',
    'components/tribal/TribalEligibilityChecker.tsx',
    'components/common/Footer.tsx',
    'components/common/Navbar.tsx',
    'lib/tribal/verification-copy.ts',
  ]

  test('no SheerID / ID.me / "instant" verification claims on customer-facing pages or components', () => {
    for (const f of PUBLIC_FILES) {
      const src = read(f)
      expect([f, /sheer\s?id/i.test(src)]).toEqual([f, false])
      expect([f, /id\.me/i.test(src)]).toEqual([f, false])
      if (f !== 'components/tribal/TribalEligibilityChecker.tsx') {
        // (the checker's own copy says there is NO instant check)
        expect([f, /instant (digital |60|online|verification)|60[- ]second/i.test(src)]).toEqual([f, false])
      }
    }
  })

  test('/tribal-discount page: sections, SSR props, head and sign-in', () => {
    const src = read('pages/tribal-discount.tsx')
    expect(src).toContain('getServerSideProps')
    expect(src).toContain('getTribalVerificationMode()')
    expect(src).toContain('id="how-it-works"')
    expect(src).toContain('id="verify"')
    expect(src).toContain('<title>')
    expect(src).toContain('name="description"')
    expect(src).toContain('TRIBAL_TROUBLE_HEADING')
    expect(src).toContain('TRIBAL_TAX_LINK')
    expect(src).toContain('TRIBAL_SIGN_IN_HREF')
    expect(src).toContain('<h1')
    // only mode, signed-in flag and the customer's own email are passed to the client
    expect(src).not.toMatch(/accessToken|refreshToken|COOKIE\./)
    const copy = loadTs('lib/tribal/verification-copy.ts')
    expect(copy.TRIBAL_TAX_LINK.href).toBe('/services-faq#tribal-overview')
  })

  test('TribalVerifyCta lazy-loads the modal and passes the customer email', () => {
    const src = read('components/tribal/TribalVerifyCta.tsx')
    expect(src).toContain("'use client'")
    expect(src).toMatch(/dynamic\(\s*\(\) => import\('\.\/TribalVerificationModal'\)/)
    expect(src).toContain('customerEmail={customerEmail}')
    const copy = loadTs('lib/tribal/verification-copy.ts')
    expect(copy.TRIBAL_SUPPORT.phoneHref).toBe('tel:+15092553852')
    expect(src).toContain('TRIBAL_SUPPORT.phoneHref')
    expect(src).toContain('TRIBAL_SUPPORT.emailHref')
  })

  test('account page: one tribal card, no eligibility checker, signed-out promo links to the new page', () => {
    const src = read('pages/account/index.tsx')
    expect(src).toContain('TribalDiscountAccountCard')
    expect(src).not.toContain('TribalEligibilityChecker')
    expect(src).toContain('mode={tribalMode}')
    expect(src).toContain('See how verification works')
    expect(src).toContain('TRIBAL_PAGE_PATH}#how-it-works')
    expect(src).toContain('TRIBAL_SIGN_IN_HREF')
    expect(src).not.toContain('/services-faq#interactive-tools')
  })

  test('account card is mode-aware and never shows verified or a code', () => {
    const src = read('components/account/TribalDiscountAccountCard.tsx')
    expect(src).toContain("mode = 'manual'")
    expect(src).toContain('TribalHowItWorks')
    expect(src).toContain('TribalVerifyCta')
    expect(src).toContain('Manual review')
    expect(src).not.toMatch(/Verified Member|TRIBAL-MEMBER-20|firebase/)
  })

  test('FAQ page and accordion use shared copy and link to /tribal-discount', () => {
    const page = read('pages/services-faq.tsx')
    const acc = read('components/services/ServicesFaqAccordion.tsx')
    expect(page).toContain('/tribal-discount#how-it-works')
    expect(page).toContain('TRIBAL_ELIGIBILITY_LINE')
    expect(page).toContain('Official 20% Discount for All Enrolled Tribal Members'.slice(0, 20))
    expect(acc).toContain('TRIBAL_PAGE_PATH')
    expect(acc).toContain('TRIBAL_ELIGIBILITY_LINE')
    expect(acc).toContain('item.link')
    // the interactive checker stays on the FAQ page
    expect(page).toContain('<TribalEligibilityChecker />')
  })

  test('footer and navbar link to /tribal-discount; tax exemption stays reachable', () => {
    const footer = read('components/common/Footer.tsx')
    expect(footer).toMatch(/href="\/tribal-discount"[\s\S]{0,300}20% Tribal Discount &amp; Tax/)
    expect(footer).toMatch(/href="\/services-faq#tribal-overview"[\s\S]{0,300}Tax exemption info/)
    const nav = read('components/common/Navbar.tsx')
    expect(nav).toContain('Tribal 20%')
    expect(nav).toContain('Tribal Member Discount')
    expect(nav.match(/href="\/tribal-discount"/g).length).toBeGreaterThanOrEqual(3)
    expect(nav).toContain('/services-faq')
  })

  test('components barrel exports the new components', () => {
    const idx = read('components/tribal/index.ts')
    expect(idx).toContain("./TribalHowItWorks")
    expect(idx).toContain("./TribalVerifyCta")
  })
})
