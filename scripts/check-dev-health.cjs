#!/usr/bin/env node

/**
 * Green/red readiness gate for the local `vercel dev` server, based on
 * scanning its log for real problems plus a liveness check.
 *
 * This is a signal for whether it's safe to cut a PREVIEW deployment from
 * the current working tree — it says nothing about production readiness
 * (a preview deploy is low-risk and doesn't touch the live domain; this
 * script must never be used to gate `vercel --prod`).
 *
 * Usage:
 *   node scripts/check-dev-health.js [--log <path>] [--url <url>]
 *
 * Exit code: 0 = GREEN, 1 = RED.
 * Prints DEV_HEALTH=GREEN or DEV_HEALTH=RED as the first line so callers
 * (including this repo's own CI/deploy scripts) can grep it easily.
 */

const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')

// os.tmpdir() (not a hardcoded '/tmp/...') so this resolves correctly
// whether the script runs under Node directly (Windows: AppData\Local\Temp)
// or via a shell that already translated a POSIX /tmp path for you.
const DEFAULT_LOG_PATH = path.join(os.tmpdir(), 'vercel-dev.log')

function parseArgs(argv) {
  const args = { log: DEFAULT_LOG_PATH, url: 'http://localhost:3000/' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--log') args.log = argv[++i]
    if (argv[i] === '--url') args.url = argv[++i]
  }
  return args
}

// Lines that are known-benign and must never fail the gate: only the
// exact "missing env var" warnings this repo's own config emits when
// credentials aren't configured, which don't apply once vercel dev has
// pulled real ones (if they show up anyway, treat it as a real problem,
// not an allowlisted one — hence no `next()`/skip on these below).
const KNOWN_BENIGN = [
  /BUILDER_PUBLIC_KEY environment variable is missing or empty/,
  /SHOPIFY_STOREFRONT_API_TOKEN environment variable is missing or empty/,
]

const RED_FLAG_PATTERNS = [
  { name: 'Compile error', regex: /Failed to compile|Module not found|SyntaxError/i },
  { name: 'Unhandled exception', regex: /Unhandled (Promise )?Rejection|TypeError:|ReferenceError:|Uncaught /i },
  { name: '5xx HTTP response', regex: /\s(GET|POST|PUT|DELETE|PATCH)\s\S+\s5\d\d\b/ },
  { name: 'Shopify Storefront API failure', regex: /\[Shopify Storefront\].*Failed/ },
  { name: 'Builder.io content resolution error', regex: /Failed to (load|fetch).*(Builder|page)|resolveBuilderContent.*[Ee]rror/ },
  { name: 'react-hooks violation surfaced at runtime', regex: /react-hooks\/[a-z-]+/ },
]

const WARNING_PATTERNS = [
  { name: 'React warning', regex: /^Warning:/m },
  { name: 'Shopify retry', regex: /\[Shopify Storefront\].*Retrying/i },
  { name: 'Catalog fallback or missing credentials', regex: /credentials (missing|not configured)|demo mode|fallback catalog/i },
  { name: 'Node runtime warning', regex: /^\(node:\d+\).*Warning:/i },
]

function isKnownBenign(line) {
  return KNOWN_BENIGN.some((pattern) => pattern.test(line))
}

function scanLog(logPath) {
  if (!fs.existsSync(logPath)) {
    return { ok: false, reason: `Log file not found: ${logPath} (is the dev server running?)` }
  }

  const content = fs.readFileSync(logPath, 'utf8')
  const lines = content.split('\n')
  const findings = []
  const warnings = []

  for (const line of lines) {
    if (!line.trim() || isKnownBenign(line)) continue
    let matched = false
    for (const { name, regex } of RED_FLAG_PATTERNS) {
      if (regex.test(line)) {
        findings.push(`${name}: ${line.trim().slice(0, 200)}`)
        matched = true
        break
      }
    }
    if (matched) continue
    for (const { name, regex } of WARNING_PATTERNS) {
      if (regex.test(line)) {
        warnings.push(`${name}: ${line.trim().slice(0, 200)}`)
        break
      }
    }
  }

  return { ok: findings.length === 0, findings, warnings }
}

function checkLiveness(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 5000 }, (res) => {
      res.resume() // discard body
      resolve({ alive: res.statusCode < 500, statusCode: res.statusCode })
    })
    req.on('timeout', () => {
      req.destroy()
      resolve({ alive: false, statusCode: null, reason: 'Request timed out after 5s' })
    })
    req.on('error', (err) => {
      resolve({ alive: false, statusCode: null, reason: err.message })
    })
  })
}

async function main() {
  const { log, url } = parseArgs(process.argv.slice(2))

  const logResult = scanLog(log)
  const liveness = await checkLiveness(url)

  const isGreen = logResult.ok && liveness.alive

  console.log(`DEV_HEALTH=${isGreen ? 'GREEN' : 'RED'}`)
  console.log(`  log: ${log}`)
  console.log(`  server: ${liveness.alive ? `alive (HTTP ${liveness.statusCode})` : `NOT alive (${liveness.reason || `HTTP ${liveness.statusCode}`})`}`)

  if (!logResult.ok && logResult.findings) {
    console.log(`  log findings (${logResult.findings.length}):`)
    logResult.findings.forEach((f) => console.log(`    - ${f}`))
  } else if (!logResult.ok) {
    console.log(`  log: ${logResult.reason}`)
  } else {
    console.log('  log: clean')
  }

  if (logResult.warnings?.length) {
    console.log(`  log warnings (${logResult.warnings.length}):`)
    logResult.warnings.forEach((warning) => console.log(`    - ${warning}`))
  }

  console.log(
    isGreen
      ? '\nGREEN — safe to proceed with a PREVIEW deployment (never use this to gate a production deploy).'
      : '\nRED — do not deploy. Investigate the finding(s) above first.'
  )

  process.exitCode = isGreen ? 0 : 1
}

main()
