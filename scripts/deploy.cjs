#!/usr/bin/env node

/**
 * Vercel deploy orchestrator for this project's three environments:
 *
 *   node scripts/deploy.js dev          - runs `next dev` locally against
 *                                          Development-scoped env vars, then
 *                                          runs functional tests against it
 *   node scripts/deploy.js preview      - `vercel deploy` (preview URL)
 *   node scripts/deploy.js production   - `vercel deploy --prod` (requires --yes)
 *
 * Every path runs the same preflight gate first (Vercel CLI present, project
 * linked, `npm run precheck` — node version consistency, typecheck, lint,
 * secret scan) so a bad deploy fails before anything reaches Vercel.
 */

const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const isWindows = process.platform === 'win32'

const TARGET = process.argv[2]
const FLAGS = new Set(process.argv.slice(3))
const VALID_TARGETS = ['dev', 'preview', 'production']

const REQUIRED_RUNTIME_ENV_VARS = [
  'BUILDER_PUBLIC_KEY',
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_STOREFRONT_API_TOKEN',
]

function log(message) {
  console.log(`\n[deploy:${TARGET || '?'}] ${message}`)
}

function fail(message) {
  console.error(`\n[deploy:${TARGET || '?'}] ERROR: ${message}`)
  process.exit(1)
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: isWindows,
    ...opts,
  })
  if (result.status !== 0) {
    throw new Error(`"${cmd} ${args.join(' ')}" exited with code ${result.status}`)
  }
  return result
}

function runCapture(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: isWindows,
    ...opts,
  })
}

// Mirrors the Vercel CLI's own resolution: it walks up from cwd looking for
// `.vercel/project.json`, so a link created in an ancestor directory counts.
function findLinkedProjectFile(startDir) {
  let dir = startDir
  while (true) {
    const candidate = path.join(dir, '.vercel', 'project.json')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function preflight() {
  log('Checking Vercel CLI is available...')
  const versionCheck = runCapture('vercel', ['--version'])
  if (versionCheck.status !== 0) {
    fail('Vercel CLI not found. Install it with: npm i -g vercel')
  }

  log('Checking project is linked to Vercel...')
  if (!findLinkedProjectFile(repoRoot)) {
    fail('Project is not linked. Run `vercel link` first, then re-run this script.')
  }

  log('Running precheck (Node version consistency, typecheck, lint, secret scan)...')
  run('npm', ['run', 'precheck'])
}

function extractDeploymentUrl(output) {
  const match = output.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/i)
  return match ? match[0] : null
}

function inspectDeployment(url) {
  log(`Inspecting deployment ${url}...`)
  const result = runCapture('vercel', ['inspect', url])
  // `vercel inspect` writes its report to stderr, not stdout (confirmed by
  // inspecting both streams directly) — matching stdout only always
  // returned 'Unknown' and reported every successful deploy as failed.
  const output = (result.stdout || '') + (result.stderr || '')
  console.log(output)
  const statusMatch = output.match(/status\s+●\s+(\w+)/i)
  return statusMatch ? statusMatch[1] : 'Unknown'
}

// On Windows, spawning with shell:true wraps the child in cmd.exe; killing
// that process alone leaves the actual `next dev` process (and the port it
// holds) orphaned. Kill the whole tree explicitly.
function killProcessTree(child) {
  if (!child.pid) return
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch {
      child.kill('SIGKILL')
    }
  }
}

// Defensive cleanup for stale processes left over from a previous run that
// crashed before killProcessTree got a chance to run (or predates this fix).
function killStaleListener(port) {
  if (isWindows) {
    const netstat = runCapture('cmd', ['/c', `netstat -ano | findstr :${port} | findstr LISTENING`])
    const pids = new Set(
      (netstat.stdout || '')
        .split('\n')
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid))
    )
    for (const pid of pids) {
      log(`Port ${port} is already in use by PID ${pid} (stale process) — terminating it.`)
      spawnSync('taskkill', ['/pid', pid, '/T', '/F'], { stdio: 'ignore' })
    }
  } else {
    const lsof = runCapture('lsof', ['-ti', `tcp:${port}`])
    const pids = (lsof.stdout || '').split('\n').filter(Boolean)
    for (const pid of pids) {
      log(`Port ${port} is already in use by PID ${pid} (stale process) — terminating it.`)
      spawnSync('kill', ['-9', pid], { stdio: 'ignore' })
    }
  }
}

async function waitForServer(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) })
      if (response.status < 500) return true
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

function checkRequiredEnvVars() {
  const envLocalPath = path.join(repoRoot, '.env.local')
  const content = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : ''
  return REQUIRED_RUNTIME_ENV_VARS.filter((name) => {
    const pattern = new RegExp(`^${name}=.+$`, 'm')
    return !pattern.test(content)
  })
}

async function deployDev() {
  preflight()

  log('Pulling Development-environment variables from Vercel (vercel env pull)...')
  const pull = runCapture('vercel', ['env', 'pull', '.env.local', '--environment=development', '--yes'])
  console.log(pull.stdout || pull.stderr)

  const missing = checkRequiredEnvVars()
  if (missing.length > 0) {
    console.warn(
      `\n[deploy:dev] WARNING: the Development environment on Vercel has no value for: ${missing.join(', ')}.\n` +
        `Store-dependent pages will render without data and related tests will be SKIPPED, not failed.\n` +
        `Fix with: vercel env add <NAME> development (then re-run this script).`
    )
  }

  killStaleListener(3000)

  log('Starting local dev server (npm run dev)...')
  const server = spawn('npm', ['run', 'dev'], {
    cwd: repoRoot,
    shell: isWindows,
    detached: !isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let serverOutput = ''
  server.stdout.on('data', (chunk) => (serverOutput += chunk))
  server.stderr.on('data', (chunk) => (serverOutput += chunk))

  const baseUrl = 'http://localhost:3000'

  // `fail()` calls process.exit(), which — even inside a try block — never
  // lets a `finally` run, so the dev server would be orphaned on any
  // failure path here. Throw instead and let the outer catch in main() call
  // fail() only after this function's `finally` has had a chance to run.
  try {
    const isUp = await waitForServer(baseUrl, 60000)
    if (!isUp) {
      console.error(serverOutput)
      throw new Error('Dev server did not become ready within 60s.')
    }

    log(`Dev server is up at ${baseUrl}. Running functional tests...`)
    const { runFunctionalTests, printResults } = require('./test-dev-deployment.js')
    const summary = await runFunctionalTests(baseUrl)
    printResults(summary)

    if (summary.failed > 0) {
      throw new Error(`${summary.failed} functional test(s) failed against the dev deployment.`)
    }

    log(
      `Dev deployment verified: ${summary.passed} passed, ${summary.skipped} skipped, ${summary.warned} warned, 0 failed.`
    )
  } finally {
    log('Stopping dev server...')
    killProcessTree(server)
  }
}

// Gates preview deploys on the local `vercel dev` server's health (see
// scripts/check-dev-health.js) when one is actively being monitored in this
// session. Intentionally NOT a hard dependency: when no local dev log
// exists (e.g. a CI-triggered preview deploy with no local dev session),
// this signal just isn't available, so it's skipped rather than failing —
// production deploys never use this signal at all.
function checkDevHealthGate() {
  const os = require('node:os')
  const devLogPath = path.join(os.tmpdir(), 'vercel-dev.log')

  if (!fs.existsSync(devLogPath)) {
    log('No local vercel dev log found — skipping dev-health gate (nothing to check).')
    return
  }

  log('Checking local vercel dev server health (npm run check:dev-health)...')
  const result = runCapture('node', ['scripts/check-dev-health.js'])
  console.log(result.stdout || result.stderr)

  if (result.status !== 0) {
    fail(
      'Local dev server is RED (see findings above). Fix the issue(s) in the running ' +
        'vercel dev session before cutting a preview deploy from this code.'
    )
  }
}

function deployPreview() {
  preflight()
  checkDevHealthGate()

  log('Deploying preview build (vercel deploy)...')
  const result = runCapture('vercel', ['deploy', '--yes'])
  const output = (result.stdout || '') + (result.stderr || '')
  console.log(output)

  if (result.status !== 0) {
    fail('Preview deployment command failed. See output above.')
  }

  const url = extractDeploymentUrl(output)
  if (!url) {
    fail('Could not determine the preview deployment URL from CLI output.')
  }

  const status = inspectDeployment(url)
  if (status !== 'Ready') {
    fail(`Preview deployment did not reach Ready state (status: ${status}). Run: vercel inspect ${url} --logs`)
  }

  log(`Preview deployment ready: ${url}`)
}

function deployProduction() {
  if (!FLAGS.has('--yes')) {
    fail(
      'Production deploys require explicit confirmation.\n' +
        'Re-run with: node scripts/deploy.js production --yes'
    )
  }

  preflight()

  log('Deploying to PRODUCTION (vercel deploy --prod)...')
  const result = runCapture('vercel', ['deploy', '--prod', '--yes'])
  const output = (result.stdout || '') + (result.stderr || '')
  console.log(output)

  if (result.status !== 0) {
    fail('Production deployment command failed. See output above.')
  }

  const url = extractDeploymentUrl(output)
  if (!url) {
    fail('Could not determine the production deployment URL from CLI output.')
  }

  const status = inspectDeployment(url)
  if (status !== 'Ready') {
    fail(`Production deployment did not reach Ready state (status: ${status}). Run: vercel inspect ${url} --logs`)
  }

  log(`Production deployment ready: ${url}`)
  log('Run `vercel logs <url> --level error --since 1h` in ~60s to confirm no runtime errors.')
}

async function main() {
  if (!VALID_TARGETS.includes(TARGET)) {
    console.error(`Usage: node scripts/deploy.js <${VALID_TARGETS.join('|')}> [--yes]`)
    process.exit(1)
  }

  if (TARGET === 'dev') await deployDev()
  else if (TARGET === 'preview') deployPreview()
  else if (TARGET === 'production') deployProduction()
}

main().catch((error) => fail(error.message))
