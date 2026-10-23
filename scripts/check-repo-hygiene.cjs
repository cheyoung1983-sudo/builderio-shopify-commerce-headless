#!/usr/bin/env node
/**
 * Repo hygiene guard. Catches the drift that AI Studio / builder exports keep
 * re-introducing:
 *   1. package-lock.json out of sync with package.json (npm ci -> EUSAGE)
 *   2. stray lockfiles from other package managers (bun.lock, yarn.lock, pnpm-lock.yaml)
 *   3. a re-added superpowers/ folder
 *   4. lost exec bits on .githooks/* and scripts/precheck.mjs
 *
 *   npm run check:repo   -> report and exit 1 on any problem
 *   npm run fix:repo     -> repair everything, then stage the result
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const fix = process.argv.includes('--fix')
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts })
const problems = []

// 1. Lockfile drift: npm ci --dry-run fails with EUSAGE when out of sync.
try {
  run('npm', ['ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'])
} catch (err) {
  const out = String(err.stdout || '') + String(err.stderr || '')
  if (/EUSAGE|in sync|Missing:|Invalid:/i.test(out)) {
    problems.push('package-lock.json is out of sync with package.json')
    if (fix) {
      run('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], { stdio: 'inherit' })
    }
  } else {
    problems.push('npm ci --dry-run failed:\n' + out.slice(-2000))
  }
}

// 2 + 3. Stray files from other tools.
for (const f of ['bun.lock', 'bun.lockb', 'yarn.lock', 'pnpm-lock.yaml', 'superpowers']) {
  const p = path.join(root, f)
  if (fs.existsSync(p)) {
    problems.push(`${f} should not be in this repo (npm only)`)
    if (fix) {
      try { run('git', ['rm', '-r', '-q', '--cached', '--ignore-unmatch', f]) } catch {}
      fs.rmSync(p, { recursive: true, force: true })
    }
  }
}

// 4. Exec bits, checked in the git index (what actually gets committed).
const execFiles = ['scripts/precheck.mjs']
const hooksDir = path.join(root, '.githooks')
if (fs.existsSync(hooksDir)) for (const h of fs.readdirSync(hooksDir)) execFiles.push(`.githooks/${h}`)
for (const f of execFiles) {
  if (!fs.existsSync(path.join(root, f))) continue
  let mode = ''
  try { mode = run('git', ['ls-files', '-s', '--', f]).split(' ')[0] } catch {}
  if (mode && mode !== '100755') {
    problems.push(`${f} lost its executable bit (git mode ${mode})`)
    if (fix) run('git', ['update-index', '--chmod=+x', '--', f])
  }
  if (fix) { try { fs.chmodSync(path.join(root, f), 0o755) } catch {} }
}

if (!problems.length) {
  console.log('✓ repo hygiene OK (lockfile in sync, no stray lockfiles, exec bits set)')
  process.exit(0)
}
if (fix) {
  try { run('git', ['add', 'package-lock.json']) } catch {}
  console.log('Fixed:\n  - ' + problems.join('\n  - ') + '\nReview with `git status`, then commit.')
  process.exit(0)
}
console.error('✗ repo hygiene problems:\n  - ' + problems.join('\n  - '))
console.error('\nFix: run `npm run fix:repo` (Node 24 / npm 11), commit the result, and push.')
console.error('Or run the "Repair lockfile" workflow in GitHub Actions to get an automatic PR.')
process.exit(1)
