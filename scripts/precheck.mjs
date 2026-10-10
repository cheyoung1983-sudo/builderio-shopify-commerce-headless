#!/usr/bin/env node
// Local pre-check: runs the same steps as .github/workflows/ci.yml so problems
// are caught before they reach CI / the pipeline.
//
//   node scripts/precheck.mjs            full CI-equivalent run (pre-push)
//   node scripts/precheck.mjs --fix      first apply SAFE auto-fixes (eslint --fix,
//                                        prettier --write on changed files), then check
//   node scripts/precheck.mjs --staged   fast mode for pre-commit: secrets + CI
//                                        integrity + eslint on staged files + typecheck
//   --skip-build / SKIP_BUILD=1          skip `npm run build` (slowest step)
//   --skip-tests / SKIP_TESTS=1          skip jest
//
// Auto-fixes never touch test expectations or logic — only formatting/lint
// rules eslint marks as fixable. Anything else is reported for a human.
import { spawnSync } from 'node:child_process'

// Guard against recursion if a nested script ever calls `npm run precheck`.
if (process.env.PRECHECK_RUNNING) process.exit(0)
process.env.PRECHECK_RUNNING = '1'

const args = new Set(process.argv.slice(2))
const fix = args.has('--fix')
const staged = args.has('--staged')
const skipBuild = args.has('--skip-build') || process.env.SKIP_BUILD === '1'
const skipTests = args.has('--skip-tests') || process.env.SKIP_TESTS === '1'

const run = (cmd, a, opts = {}) =>
  spawnSync(cmd, a, { stdio: 'inherit', shell: false, ...opts }).status === 0
const git = (a) =>
  (spawnSync('git', a, { encoding: 'utf8' }).stdout || '')
    .split('\n')
    .filter(Boolean)

const LINT_DIRS = /^(blocks|components|config|context|lib|pages|services)\//
const LINTABLE = /\.(js|jsx|ts|tsx|mjs|cjs)$/
const PRETTIER = /\.(js|jsx|ts|tsx|mjs|cjs|json|css|md)$/

// Node major must match CI (package.json engines / ci.yml).
const major = Number(process.versions.node.split('.')[0])
if (major !== 24) {
  console.error(
    `\n✖ precheck: Node ${process.versions.node} detected; CI uses Node 24. Switch (e.g. "nvm use 24") and retry.`
  )
  process.exit(1)
}

const changedFiles = () => {
  const files = staged
    ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    : [
        ...new Set([
          ...git([
            'diff',
            '--name-only',
            '--diff-filter=ACMR',
            'origin/main...HEAD',
          ]),
          ...git(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']),
          ...git(['ls-files', '--others', '--exclude-standard']),
        ]),
      ]
  return files
}

if (fix) {
  const files = changedFiles()
  const lintable = files.filter((f) => LINT_DIRS.test(f) && LINTABLE.test(f))
  const pretty = files.filter((f) => PRETTIER.test(f))
  console.log(`\n▶ safe auto-fix on ${files.length} changed file(s)`)
  if (pretty.length)
    run('npx', ['prettier', '--write', '--log-level', 'warn', ...pretty])
  if (lintable.length) run('npx', ['eslint', '--fix', ...lintable])
  if (staged && files.length)
    run('git', ['add', '--', ...pretty.concat(lintable)])
}

const steps = []
const npm = (name, script) =>
  steps.push([name, 'npm', ['run', '--silent', script]])

if (staged) {
  steps.push([
    'Hardcoded secrets (staged)',
    'node',
    ['scripts/check-hardcoded-secrets.cjs', '--staged'],
  ])
  npm('CI/config integrity', 'check:ci-integrity')
  const lintable = changedFiles().filter(
    (f) => LINT_DIRS.test(f) && LINTABLE.test(f)
  )
  if (lintable.length)
    steps.push(['ESLint (staged files)', 'npx', ['eslint', ...lintable]])
  npm('Type-check', 'typecheck')
} else {
  // Mirrors .github/workflows/ci.yml, in the same order.
  npm('Node version consistency', 'check:node-version')
  npm('Project health', 'check:project-health')
  npm('CI/config integrity', 'check:ci-integrity')
  npm('Dependency health', 'check:dependency-health')
  npm('Type-check', 'typecheck')
  npm('ESLint', 'lint')
  npm('Hardcoded secrets', 'check:secrets')
  npm('Customer Account auth health', 'check:customer-account-auth-health')
  npm('XSS hardening', 'check:xss-hardening')
  npm('Accessibility lint', 'lint:a11y')
  if (!skipTests) npm('Tests incl. axe accessibility (jest)', 'test:a11y')
  if (!skipBuild) npm('Production build', 'build')
}

const failed = []
for (const [name, cmd, a] of steps) {
  console.log(`\n▶ ${name}`)
  const t = Date.now()
  const ok = run(cmd, a, {
    env: { ...process.env, CI: process.env.CI ?? 'true' },
  })
  console.log(
    `${ok ? '✔' : '✖'} ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`
  )
  if (!ok) failed.push(name)
}

if (failed.length) {
  console.error(`\n✖ precheck failed: ${failed.join(', ')}`)
  console.error(
    '  Try "npm run precheck:fix" for safe lint/format fixes; other failures need a code change.'
  )
  console.error(
    '  Emergency bypass (not recommended): git commit/push --no-verify'
  )
  process.exit(1)
}
console.log('\n✔ precheck passed — matches CI.')
