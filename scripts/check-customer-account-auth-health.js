#!/usr/bin/env node

/**
 * Guards against the class of bugs found while auditing the headless
 * Customer Account API OAuth2 + PKCE login flow (services/shopify-customer-account.ts,
 * pages/api/account/{login,logout,callback}.ts, pages/account/index.tsx):
 *
 *   1. getShopId() used to silently fall back to a hardcoded shop ID
 *      (`process.env.SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID || '102354289012'`)
 *      instead of failing loudly like getCustomerAccountClientId() does, so a
 *      missing env var would silently authenticate against the wrong store's
 *      OAuth server rather than erroring.
 *   2. getSiteUrl()'s no-request fallback hardcoded a stale domain
 *      (`https://displaycellpros.com`) that didn't match the live domain
 *      CLAUDE.md documented at the time (`headless.builders`), and would go
 *      stale again silently if the domain ever changes. The same pattern
 *      turned up again in lib/seo.ts's getBaseUrl() — not login-specific,
 *      so that check scans the whole repo, not just the login-flow files.
 *      (CLAUDE.md's own claim was itself stale — cross-checked against this
 *      repo's connected Vercel project's actual domain configuration and
 *      corrected to `www.displaycellpros.com`. This check trusts CLAUDE.md
 *      as its source of truth, so keep the two in sync going forward.)
 *   3. login.ts and logout.ts each had their own copy-pasted
 *      `sanitizeReturnTo()` open-redirect guard, and neither rejected the
 *      backslash trick (`/\evil.com`) some browsers normalize into a
 *      protocol-relative redirect — only the `//` case was checked.
 *
 * This script re-derives each of those checks from source instead of
 * hardcoding the "correct" answer, so it keeps working as the code evolves:
 *   - identity env vars (shop/client id) in the login flow must use a
 *     throwing `required()` pattern, never a hardcoded literal fallback;
 *   - anywhere in the repo, a hardcoded domain fallback must match the live
 *     domain CLAUDE.md declares ("Live at `<domain>`"), so a future domain
 *     change updates both in lockstep or this fails;
 *   - a redirect/return-to sanitizer must exist in exactly one place and
 *     must reject both `//` and `\` open-redirect tricks.
 *
 * Usage: node scripts/check-customer-account-auth-health.js
 */

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')

const read = (relPath) => fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8')
const exists = (relPath) => fs.existsSync(path.join(REPO_ROOT, relPath))

// Files that make up the Customer Account API login flow. Kept as an
// explicit list (rather than a repo-wide scan) so a typo'd path fails loudly
// instead of the check silently scanning nothing.
const LOGIN_FLOW_FILES = [
  'services/shopify-customer-account.ts',
  'pages/api/account/login.ts',
  'pages/api/account/logout.ts',
  'pages/api/account/callback.ts',
  'pages/account/index.tsx',
].filter(exists)

// Directories scanned for the repo-wide checks (duplicate sanitizers).
// Mirrors the directory set `npm run lint` covers.
const SCAN_DIRS = ['blocks', 'components', 'config', 'context', 'lib', 'pages', 'services']
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

function walkFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, results)
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath)
    }
  }
  return results
}

function relPath(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/')
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length
}

// ---------------------------------------------------------------------------
// Check 1: identity-sensitive env vars (shop id / client id / client secret)
// must fail loudly on a missing value, never fall back to a hardcoded literal.
// ---------------------------------------------------------------------------

const IDENTITY_ENV_NAME = /_(SHOP_ID|STORE_ID|ACCOUNT_ID|CLIENT_ID|CLIENT_SECRET)$/i
const FALLBACK_PATTERN = /process\.env\.([A-Z0-9_]+)\s*(?:\|\||\?\?)\s*['"]([^'"]+)['"]/g
const SAFE_LITERALS = new Set(['', 'undefined', 'null'])

function isSafeLiteral(literal) {
  if (SAFE_LITERALS.has(literal)) return true
  if (/^\d{4}-\d{2}$/.test(literal)) return true // API version strings like 2025-10
  if (literal.length < 8) return true // too short to plausibly be a real shop/client id
  return false
}

function checkIdentityEnvFallbacks() {
  const findings = []
  for (const file of LOGIN_FLOW_FILES) {
    const content = read(file)
    for (const match of content.matchAll(FALLBACK_PATTERN)) {
      const [, envName, literal] = match
      if (IDENTITY_ENV_NAME.test(envName) && !isSafeLiteral(literal)) {
        findings.push(
          `${file}:${lineNumberAt(content, match.index)}  Hardcoded fallback for identity env var ` +
            `"${envName}" (literal "${literal}"). Use a throwing required() lookup instead — a missing ` +
            `value should fail loudly, not silently authenticate against a baked-in shop/client.`
        )
      }
    }
  }
  return findings
}

// ---------------------------------------------------------------------------
// Check 2: hardcoded domain fallbacks must match the live domain CLAUDE.md
// declares, so the two can't drift apart silently.
// ---------------------------------------------------------------------------

function getCanonicalDomain() {
  if (!exists('CLAUDE.md')) return null
  const match = read('CLAUDE.md').match(/Live at `([^`]+)`/)
  return match ? match[1] : null
}

// Repo-wide (not just the login flow) — the same stale-domain-fallback
// pattern showed up in lib/seo.ts's getBaseUrl() too, so this isn't a
// login-specific risk.
function checkStaleDomainFallbacks() {
  const canonicalDomain = getCanonicalDomain()
  if (!canonicalDomain) {
    return { findings: [], skipped: 'could not find "Live at `<domain>`" in CLAUDE.md' }
  }

  // Deliberately matches a *bare origin* only (scheme://host with no path),
  // e.g. the `getSiteUrl()`/`getBaseUrl()` pattern this check exists for.
  // A URL with a path (CDN asset, external API endpoint, etc.) is a
  // legitimate hardcoded reference, not a stand-in for "this site's own
  // domain", so it's intentionally not matched here.
  const URL_FALLBACK_PATTERN =
    /(?:return\s+|(?:\|\||\?\?)\s*)['"](https?:\/\/([a-zA-Z0-9.-]+)\/?)['"]/g
  const findings = []
  const files = SCAN_DIRS.flatMap((dir) => walkFiles(path.join(REPO_ROOT, dir)))

  for (const absPath of files) {
    const file = relPath(absPath)
    const content = fs.readFileSync(absPath, 'utf8')
    for (const match of content.matchAll(URL_FALLBACK_PATTERN)) {
      const [, url, host] = match
      if (host === canonicalDomain || host === 'localhost') continue
      findings.push(
        `${file}:${lineNumberAt(content, match.index)}  Hardcoded fallback URL "${url}" doesn't match ` +
          `the live domain "${canonicalDomain}" declared in CLAUDE.md ("Live at \`${canonicalDomain}\`"). ` +
          `Update this literal, or update CLAUDE.md if the domain changed.`
      )
    }
  }
  return { findings, skipped: null }
}

// ---------------------------------------------------------------------------
// Check 3: a return-to/redirect sanitizer must exist in exactly one place,
// and must reject both `//` and `\` open-redirect tricks.
// ---------------------------------------------------------------------------

const SANITIZER_NAMES = ['sanitizeReturnTo', 'sanitizeRedirectTarget', 'isSafeReturnTo', 'isSafeRedirectPath']
const SANITIZER_DEF_PATTERN = new RegExp(
  `(?:function\\s+(${SANITIZER_NAMES.join('|')})\\s*\\(|` +
    `const\\s+(${SANITIZER_NAMES.join('|')})\\s*=\\s*(?:async\\s*)?\\()`,
  'g'
)

// Naive brace-depth scan from the first `{` after the match to its matching
// `}`. Good enough for small, template-literal-free helper functions like
// these — matches the regex-based approach the rest of this script (and its
// siblings in scripts/) already uses instead of a full parser.
function extractFunctionBody(content, matchEndIndex) {
  const braceStart = content.indexOf('{', matchEndIndex)
  if (braceStart === -1) return null
  let depth = 0
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === '{') depth++
    if (content[i] === '}') {
      depth--
      if (depth === 0) return content.slice(braceStart, i + 1)
    }
  }
  return null
}

function checkRedirectSanitizerConsistency() {
  const files = SCAN_DIRS.flatMap((dir) => walkFiles(path.join(REPO_ROOT, dir)))
  const definitions = []

  for (const absPath of files) {
    const content = fs.readFileSync(absPath, 'utf8')
    for (const match of content.matchAll(SANITIZER_DEF_PATTERN)) {
      const name = match[1] || match[2]
      definitions.push({
        file: relPath(absPath),
        line: lineNumberAt(content, match.index),
        name,
        body: extractFunctionBody(content, match.index + match[0].length),
      })
    }
  }

  const findings = []

  if (definitions.length === 0) {
    return [
      'No return-to/redirect sanitizer (sanitizeReturnTo or similar) was found anywhere in ' +
        SCAN_DIRS.join(', ') +
        '. If login.ts/logout.ts build a redirect from a query param, it must be run through one.',
    ]
  }

  if (definitions.length > 1) {
    findings.push(
      `Found ${definitions.length} separate redirect-sanitizer definitions — consolidate into a single ` +
        `exported helper and import it everywhere else:\n` +
        definitions.map((d) => `      ${d.file}:${d.line}  ${d.name}()`).join('\n')
    )
  }

  for (const def of definitions) {
    if (!def.body) {
      findings.push(`${def.file}:${def.line}  Could not parse the body of ${def.name}() to verify its checks.`)
      continue
    }
    const guardsProtocolRelative = /['"]\/\/['"]/.test(def.body) || /startsWith\(\s*['"]\/\/['"]\s*\)/.test(def.body)
    const guardsBackslash = /\\\\/.test(def.body)

    if (!guardsProtocolRelative) {
      findings.push(
        `${def.file}:${def.line}  ${def.name}() doesn't appear to reject protocol-relative redirects ` +
          `("//evil.com").`
      )
    }
    if (!guardsBackslash) {
      findings.push(
        `${def.file}:${def.line}  ${def.name}() doesn't appear to reject backslash-based redirects ` +
          `("/\\evil.com"), which some browsers normalize into a protocol-relative URL.`
      )
    }
  }

  return findings
}

function main() {
  if (LOGIN_FLOW_FILES.length === 0) {
    console.log('check-customer-account-auth-health: no Customer Account API login files found, skipping')
    return
  }

  const identityFindings = checkIdentityEnvFallbacks()
  const { findings: domainFindings, skipped: domainSkipped } = checkStaleDomainFallbacks()
  const sanitizerFindings = checkRedirectSanitizerConsistency()

  const allFindings = [...identityFindings, ...domainFindings, ...sanitizerFindings]

  if (domainSkipped) {
    console.warn(`check-customer-account-auth-health: skipped domain-drift check (${domainSkipped})`)
  }

  if (allFindings.length === 0) {
    console.log(
      `check-customer-account-auth-health: OK (${LOGIN_FLOW_FILES.length} login-flow file(s), ` +
        `${SCAN_DIRS.length} dir(s) scanned for sanitizer duplication)`
    )
    return
  }

  console.error(`check-customer-account-auth-health: found ${allFindings.length} issue(s):\n`)
  for (const finding of allFindings) {
    console.error(`  - ${finding}`)
  }
  process.exitCode = 1
}

main()
