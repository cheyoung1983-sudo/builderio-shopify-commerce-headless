#!/usr/bin/env node

/**
 * Guards against a specific regression pattern found while auditing this
 * repo's other branches: instead of fixing a real failure, a branch would
 * make CI green by deleting the thing that caught it —
 *
 *   - copilot/fix-branches-and-deploy stripped
 *     .github/workflows/ci.yml down from 7 checks to 2 (dropped
 *     check:node-version, check:project-health, typecheck, lint,
 *     check:secrets, and build entirely) instead of fixing the Node/ESLint
 *     version mismatch that was failing.
 *   - a later commit on the ai_main_* branch wholesale-disabled all 10
 *     react-hooks "React Compiler" rules in eslint.config.mjs instead of
 *     fixing the real bugs those rules had just caught (see the
 *     react-hooks fixes in components/products/*, context/CartContext.tsx,
 *     etc.).
 *
 * Both changes make `npm run build` / CI pass locally while silently
 * removing real bug and regression detection. This script fails loudly if
 * either happens again.
 *
 * Usage: node scripts/check-ci-integrity.js
 */

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')

const REQUIRED_CI_STEPS = [
  { name: 'check:node-version', pattern: /npm run check:node-version\b/ },
  { name: 'check:project-health', pattern: /npm run check:project-health\b/ },
  { name: 'check:ci-integrity', pattern: /npm run check:ci-integrity\b/ },
  { name: 'check:dependency-health', pattern: /npm run check:dependency-health\b/ },
  { name: 'check:merge-conflicts', pattern: /npm run check:merge-conflicts\b/ },
  { name: 'typecheck', pattern: /npm run typecheck\b/ },
  { name: 'lint (full)', pattern: /npm run lint\b(?!:)/ },
  { name: 'check:secrets', pattern: /npm run check:secrets\b/ },
  { name: 'check:customer-account-auth-health', pattern: /npm run check:customer-account-auth-health\b/ },
  { name: 'check:xss-hardening', pattern: /npm run check:xss-hardening\b/ },
  { name: 'lint:a11y', pattern: /npm run lint:a11y\b/ },
  { name: 'test:a11y', pattern: /npm run test:a11y\b/ },
  { name: 'build', pattern: /npm run build\b/ },
]

// Matches an ESLint rule being wholesale-disabled, e.g. 'react-hooks/foo': 'off'
const DISABLED_RULE_PATTERN = /['"]((?:react-hooks|@next\/next|react)\/[a-z0-9-]+)['"]\s*:\s*(?:['"]off['"]|0\b)/g

function checkCiWorkflow() {
  const ciPath = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml')
  if (!fs.existsSync(ciPath)) {
    return ['.github/workflows/ci.yml is missing entirely']
  }
  const content = fs.readFileSync(ciPath, 'utf8')
  return REQUIRED_CI_STEPS.filter((step) => !step.pattern.test(content)).map(
    (step) =>
      `.github/workflows/ci.yml is missing the required "${step.name}" step — if it's failing, fix the underlying issue (see scripts/fix-lint-issues.js, scripts/check-hardcoded-secrets.js) rather than removing the check.`
  )
}

function checkEslintConfig() {
  const configPath = path.join(REPO_ROOT, 'eslint.config.mjs')
  if (!fs.existsSync(configPath)) {
    return []
  }
  const content = fs.readFileSync(configPath, 'utf8')
  const findings = []
  let match
  while ((match = DISABLED_RULE_PATTERN.exec(content))) {
    findings.push(
      `eslint.config.mjs wholesale-disables "${match[1]}" — if it's flagging real violations, fix them (run node scripts/fix-lint-issues.js) instead of turning the rule off.`
    )
  }
  return findings
}

function main() {
  const findings = [...checkCiWorkflow(), ...checkEslintConfig()]

  if (findings.length === 0) {
    console.log('check-ci-integrity: OK — CI workflow and eslint config are intact')
    return
  }

  console.error(`check-ci-integrity: found ${findings.length} issue(s):\n`)
  findings.forEach((f) => console.error(`  - ${f}`))
  process.exitCode = 1
}

main()
