#!/usr/bin/env node

/**
 * Guards against the class of "CI is red before it even reaches the build"
 * failures found while auditing this repo (see the two "fix errors and
 * branches" / "CI dependency build failures" passes):
 *
 *   1. package-lock.json drifting out of sync with package.json, so
 *      `npm ci` fails outright — e.g. "Missing: tslib@2.8.1 from lock
 *      file" after @shopify/storefront-api-client was added without
 *      re-running `npm install`, or the EOVERRIDE/ETARGET failure from a
 *      root-level `"postcss": "^8.5.31"` override that both conflicted
 *      with the direct dependency and named a version that doesn't exist
 *      on the registry.
 *   2. npm's install-scripts/allowScripts gate flagging a package's
 *      install script as unreviewed on every install (noisy, and hides a
 *      real problem the day an actually-malicious script shows up).
 *   3. .env.example being silently deleted or re-excluded by a later
 *      ".env*" glob in .gitignore — scripts/check-project-health.js
 *      hard-requires it and crashes with an uncaught ENOENT instead of a
 *      readable failure when it's gone.
 *   4. A relative import missing its file extension (e.g.
 *      `from '../lib/progress'` instead of `'../lib/progress.ts'`).
 *      Bundler/tsc resolution tolerates this, but Node's native ESM
 *      loader — used by every test in tests/*.test.js that spawns
 *      `node --experimental-strip-types` to import a .ts file directly —
 *      does not, and fails with a confusing "Cannot find module" instead
 *      of exercising the code the test meant to check. Hit twice:
 *      lib/.../LocalStorage/keys.ts -> lib/cart-storage, and
 *      services/shopify.ts -> lib/progress.
 *   5. .githooks/* losing its executable bit, which makes git silently
 *      skip the hook (git warns, but nothing fails) — so the secret scan
 *      and this very check stop running on every commit without anyone
 *      noticing.
 *
 * Usage: node scripts/check-dependency-health.js
 * Exit code: 0 if every check passes, 1 otherwise. Prints a Markdown-ish
 * report suitable for stdout or a GITHUB_STEP_SUMMARY redirect.
 */

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

function readFile(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8')
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

// ---------------------------------------------------------------------------
// 1. package-lock.json / package.json / overrides stay installable
// ---------------------------------------------------------------------------

function checkLockfileSync() {
  try {
    run('npm', ['ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'])
    return { skipped: false, findings: [] }
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}`

    // Wrong local Node version is check:node-version's job, not this
    // check's — running under the "wrong" engine makes every npm command
    // fail via .npmrc's engine-strict, which isn't a lockfile problem.
    if (/npm error code EBADENGINE/.test(output)) {
      return {
        skipped: true,
        reason: 'local Node version does not match package.json engines.node (see check:node-version)',
        findings: [],
      }
    }

    // npm's own CLI usage/options dump (everything from "Usage:" on) isn't
    // useful here — keep only the lines describing the actual failure.
    const errorLines = output.split('\n').filter((line) => /^npm error/.test(line.trim()))
    const usageIndex = errorLines.findIndex((line) => /Usage:/.test(line))
    const relevantLines = (usageIndex === -1 ? errorLines : errorLines.slice(0, usageIndex))
      .map((line) => line.trim())
      .filter((line) => line !== 'npm error' && !/complete log of this run/.test(line))

    return {
      skipped: false,
      findings: [
        '`npm ci --dry-run` failed — package-lock.json is out of sync with package.json (or an override/version is invalid). Run `npm install` to regenerate the lockfile, then re-run this check.',
        ...relevantLines.map((line) => `  ${line}`),
      ],
    }
  }
}

// ---------------------------------------------------------------------------
// 2. No install scripts pending allowScripts review
// ---------------------------------------------------------------------------

// Package name for allowScripts purposes is whatever follows the *last*
// "node_modules/" segment in the lockfile key — "preact" for both
// "node_modules/preact" and "node_modules/@builder.io/widgets/node_modules/preact",
// "@scope/name" for a scoped package (its name never itself contains
// "node_modules/", so this can't misfire on nesting).
function packageNameFromLockKey(key) {
  return key.split('node_modules/').pop()
}

function appliesToCurrentPlatform(entry) {
  if (Array.isArray(entry.os) && entry.os.length > 0 && !entry.os.includes(process.platform)) return false
  if (Array.isArray(entry.cpu) && entry.cpu.length > 0 && !entry.cpu.includes(process.arch)) return false
  return true
}

function checkAllowScripts() {
  let packageJson
  let lockfile
  try {
    packageJson = JSON.parse(readFile('package.json'))
    lockfile = JSON.parse(readFile('package-lock.json'))
  } catch (error) {
    return { skipped: true, reason: `could not read package.json/package-lock.json (${error.message})`, findings: [] }
  }

  const allowScripts = packageJson.allowScripts || {}
  const pending = new Set()

  for (const [key, entry] of Object.entries(lockfile.packages || {})) {
    if (!key || !entry.hasInstallScript) continue
    if (!appliesToCurrentPlatform(entry)) continue
    const name = packageNameFromLockKey(key)
    if (!allowScripts[name]) pending.add(name)
  }

  if (pending.size === 0) return { skipped: false, findings: [] }

  return {
    skipped: false,
    findings: [
      'Package(s) have install scripts not covered by package.json\'s "allowScripts". Read each script, then either:',
      '  `npm install-scripts approve <pkg>` (if it is safe — a platform binary picker, a native build step, etc.)',
      '  `npm install-scripts deny <pkg>` (if it is not), and commit the resulting package.json/package-lock.json change.',
      ...[...pending].sort().map((name) => `  ${name}`),
    ],
  }
}

// ---------------------------------------------------------------------------
// 3. .env.example exists, is tracked, and .gitignore can't exclude it
// ---------------------------------------------------------------------------

function checkEnvExample() {
  const findings = []
  const envExamplePath = path.join(REPO_ROOT, '.env.example')

  if (!fs.existsSync(envExamplePath)) {
    findings.push('.env.example is missing. scripts/check-project-health.js hard-requires it and will crash without it.')
    return { skipped: false, findings }
  }

  try {
    // Exit code 0 = the path matches an ignore pattern; 1 = it does not.
    // --no-index is required: check-ignore otherwise treats an already-
    // tracked path as automatically "not ignored" regardless of patterns,
    // which is exactly the case here (.env.example is tracked) and would
    // hide a re-introduced ".env.example" exclusion rule.
    run('git', ['check-ignore', '-q', '--no-index', '.env.example'])
    findings.push(
      '.env.example exists but is excluded by .gitignore (a broad ".env*" rule swallowing it again?). Add `!.env.example` after any ".env*" pattern.'
    )
  } catch {
    // Non-zero exit (or check-ignore erroring because it's not ignored) is
    // the good outcome here — nothing to do.
  }

  return { skipped: false, findings }
}

// ---------------------------------------------------------------------------
// 4. Relative imports reachable from a raw-Node test entry point must carry
//    an explicit extension.
// ---------------------------------------------------------------------------

const IMPORT_SPECIFIER_PATTERN = /(?:from|require)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]\)?/g
const ENTRY_POINT_LITERAL_PATTERN = /['"]([\w./-]+\.tsx?)['"]/g

function findRawNodeEntryPoints() {
  const testsDir = path.join(REPO_ROOT, 'tests')
  if (!fs.existsSync(testsDir)) return []

  const entryPoints = new Set()
  for (const file of fs.readdirSync(testsDir)) {
    if (!file.endsWith('.test.js')) continue
    const content = fs.readFileSync(path.join(testsDir, file), 'utf8')
    if (!content.includes('--experimental-strip-types')) continue

    let match
    while ((match = ENTRY_POINT_LITERAL_PATTERN.exec(content))) {
      entryPoints.add(match[1])
    }
  }
  return [...entryPoints]
}

function resolveExtensionless(fromDir, specifier) {
  const basePath = path.resolve(fromDir, specifier)
  for (const ext of RESOLVABLE_EXTENSIONS) {
    if (fs.existsSync(basePath + ext)) return basePath + ext
  }
  return null
}

function checkExtensionlessRelativeImports() {
  const findings = []
  const entryPoints = findRawNodeEntryPoints()
  const visited = new Set()
  const queue = entryPoints.map((relPath) => path.join(REPO_ROOT, relPath))

  while (queue.length > 0) {
    const absPath = queue.shift()
    if (visited.has(absPath) || !fs.existsSync(absPath)) continue
    visited.add(absPath)

    const content = fs.readFileSync(absPath, 'utf8')
    const dir = path.dirname(absPath)
    const relForReport = path.relative(REPO_ROOT, absPath)

    let match
    IMPORT_SPECIFIER_PATTERN.lastIndex = 0
    while ((match = IMPORT_SPECIFIER_PATTERN.exec(content))) {
      const specifier = match[1]
      const hasExtension = RESOLVABLE_EXTENSIONS.some((ext) => specifier.endsWith(ext)) || specifier.endsWith('.json')
      if (hasExtension) {
        const resolved = path.resolve(dir, specifier)
        if (fs.existsSync(resolved)) queue.push(resolved)
        continue
      }

      const resolved = resolveExtensionless(dir, specifier)
      if (!resolved) {
        findings.push(
          `${relForReport}: relative import "${specifier}" has no extension and no matching .ts/.tsx/.js file was found next to it.`
        )
        continue
      }

      findings.push(
        `${relForReport}: relative import "${specifier}" is missing its file extension — add "${path.extname(resolved)}" (Node's native ESM loader, used by the raw-node tests in tests/*.test.js, does not infer extensions).`
      )
      queue.push(resolved)
    }
  }

  return { skipped: entryPoints.length === 0, findings }
}

// ---------------------------------------------------------------------------
// 5. .githooks/* keeps its executable bit
// ---------------------------------------------------------------------------

function checkGitHooksExecutable() {
  const hooksDir = path.join(REPO_ROOT, '.githooks')
  if (!fs.existsSync(hooksDir)) return { skipped: true, reason: 'no .githooks directory', findings: [] }

  let output
  try {
    output = run('git', ['ls-files', '-s', '.githooks'])
  } catch {
    return { skipped: true, reason: 'not a git checkout', findings: [] }
  }

  const findings = []
  for (const line of output.split('\n').filter(Boolean)) {
    const [mode, , , ...rest] = line.trim().split(/\s+/)
    const file = rest.join(' ')
    if (mode !== '100755') {
      findings.push(
        `${file} is not executable in git (mode ${mode}) — git silently skips non-executable hooks, so it never runs. Fix with \`chmod +x ${file}\` and commit the mode change.`
      )
    }
  }
  return { skipped: false, findings }
}

// ---------------------------------------------------------------------------

function main() {
  const checks = [
    { name: 'Lockfile installs cleanly (npm ci --dry-run)', result: checkLockfileSync() },
    { name: 'No install scripts pending allowScripts review', result: checkAllowScripts() },
    { name: '.env.example present and not gitignored', result: checkEnvExample() },
    { name: 'Relative imports used by raw-Node tests have extensions', result: checkExtensionlessRelativeImports() },
    { name: '.githooks/* are executable', result: checkGitHooksExecutable() },
  ]

  console.log('# Dependency & CI health report\n')

  let totalFindings = 0
  for (const { name, result } of checks) {
    if (result.skipped) {
      console.log(`- ⚠️  SKIPPED — ${name} (${result.reason})`)
      continue
    }
    if (result.findings.length === 0) {
      console.log(`- ✅ OK — ${name}`)
      continue
    }
    totalFindings += result.findings.length
    console.log(`- ❌ FAILED — ${name}`)
    for (const finding of result.findings) {
      console.log(`    ${finding}`)
    }
  }

  console.log('')
  if (totalFindings === 0) {
    console.log('check-dependency-health: OK')
  } else {
    console.log(`check-dependency-health: FAILED (${totalFindings} issue(s) — see above)`)
    process.exitCode = 1
  }
}

main()
