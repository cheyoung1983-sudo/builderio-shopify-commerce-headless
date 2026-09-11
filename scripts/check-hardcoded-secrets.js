#!/usr/bin/env node

/**
 * Guards against the two ways this repo has leaked credentials into source:
 *
 *   1. A literal, provider-shaped secret checked in directly
 *      (e.g. commit f639552: a live-looking Shopify Storefront token
 *      hardcoded in config/shopify.ts).
 *   2. A hardcoded fallback value for a sensitive env var
 *      (`process.env.X || 'realvalue'`), so the app silently "works" with
 *      a baked-in credential/domain/key instead of failing loudly when
 *      misconfigured (e.g. the hardcoded store domain and Builder public
 *      key fallbacks removed from services/shopify.ts and next.config.js).
 *
 * Usage:
 *   node scripts/check-hardcoded-secrets.js            scan all git-tracked files
 *   node scripts/check-hardcoded-secrets.js --staged   scan only staged changes (pre-commit)
 *
 * A line that is a verified false positive can be excluded with a trailing
 * comment on the same line: // secret-scan-ignore
 */

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const SUPPRESS_MARKER = 'secret-scan-ignore'

const SCAN_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.md',
])

const EXCLUDED_PATH_PATTERNS = [
  /(^|\/)node_modules\//,
  /(^|\/)\.next\//,
  /(^|\/)\.git\//,
  /package-lock\.json$/,
  /bun\.lock$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.tsbuildinfo$/,
]

// High-confidence provider-shaped secret formats. These are never legitimate
// to have in source, regardless of context.
const SECRET_PATTERNS = [
  { name: 'Shopify Storefront/Admin/Custom App token', regex: /\bshp(?:at|ca|ss|pa)_[a-fA-F0-9]{32,}\b/ },
  { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Stripe live secret key', regex: /\bsk_live_[0-9a-zA-Z]{10,}\b/ },
  { name: 'Stripe restricted live key', regex: /\brk_live_[0-9a-zA-Z]{10,}\b/ },
  { name: 'Google API key', regex: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { name: 'Slack token', regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'Private key block', regex: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
]

// Env vars whose name implies the value is sensitive (a credential, key, or
// a store-identifying domain) and therefore must never have a hardcoded
// fallback literal baked into source.
const SENSITIVE_ENV_NAME = /(API_KEY|ACCESS_TOKEN|_TOKEN|_SECRET|_PASSWORD|CLIENT_ID|CLIENT_SECRET|_DOMAIN|PUBLIC_KEY|PRIVATE_KEY)$/i

const SAFE_LITERALS = new Set(['', 'undefined', 'null', 'unstable'])

function isSafeLiteral(literal) {
  if (SAFE_LITERALS.has(literal)) return true
  if (/^\d{4}-\d{2}$/.test(literal)) return true // API version strings like 2024-07
  if (/^[a-z]{2}(-[A-Z]{2})?$/.test(literal)) return true // locale codes like en-US
  if (literal.length < 8) return true // too short to plausibly be a real credential
  return false
}

// Matches: process.env.NAME || 'literal'   /   process.env.NAME ?? "literal"
const FALLBACK_PATTERN = /process\.env\.([A-Z0-9_]+)\s*(?:\|\||\?\?)\s*['"]([^'"]+)['"]/g

function isExcludedPath(filePath) {
  return EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(filePath))
}

function isScannableFile(filePath) {
  if (isExcludedPath(filePath)) return false
  const basename = filePath.split('/').pop() || ''
  if (basename.startsWith('.env')) return true
  const dotIndex = basename.lastIndexOf('.')
  const ext = dotIndex >= 0 ? basename.slice(dotIndex) : ''
  return SCAN_EXTENSIONS.has(ext)
}

// Deploy sandboxes (e.g. Vercel's build container) don't always ship a
// `.git` directory, so `git ls-files` isn't available there. Walk the
// filesystem directly in that case.
function walkFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(process.cwd(), fullPath).split(path.sep).join('/')

    if (entry.isDirectory()) {
      if (isExcludedPath(`${relPath}/`)) continue
      walkFiles(fullPath, results)
    } else {
      results.push(relPath)
    }
  }
  return results
}

function getFilesToScan(staged) {
  if (staged) {
    const output = execFileSync(
      'git',
      ['diff', '--cached', '--name-only', '--diff-filter=ACM'],
      { encoding: 'utf8' }
    )
    return output.split('\n').filter(Boolean).filter(isScannableFile)
  }

  try {
    const output = execFileSync('git', ['ls-files'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return output.split('\n').filter(Boolean).filter(isScannableFile)
  } catch {
    return walkFiles(process.cwd()).filter(isScannableFile)
  }
}

function readFileContent(filePath, staged) {
  if (staged) {
    // Read the staged blob, not the working tree copy, so the check reflects
    // exactly what is about to be committed.
    return execFileSync('git', ['show', `:${filePath}`], { encoding: 'utf8' })
  }
  return fs.readFileSync(filePath, 'utf8')
}

function scanFile(filePath, staged) {
  let content
  try {
    content = readFileContent(filePath, staged)
  } catch {
    return [] // file was deleted/renamed away; nothing to scan
  }

  const findings = []
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    if (line.includes(SUPPRESS_MARKER)) return
    const lineNumber = index + 1

    for (const { name, regex } of SECRET_PATTERNS) {
      if (regex.test(line)) {
        findings.push({
          file: filePath,
          line: lineNumber,
          message: `Hardcoded secret matching "${name}" format`,
        })
      }
    }

    for (const match of line.matchAll(FALLBACK_PATTERN)) {
      const [, envName, literal] = match
      if (SENSITIVE_ENV_NAME.test(envName) && !isSafeLiteral(literal)) {
        findings.push({
          file: filePath,
          line: lineNumber,
          message: `Hardcoded fallback value for sensitive env var "${envName}" (found literal "${literal}"). Fail loudly instead of defaulting to a baked-in value — see config/shopify.ts's production guard for the pattern to follow.`,
        })
      }
    }
  })

  return findings
}

function main() {
  const staged = process.argv.includes('--staged')
  const files = getFilesToScan(staged)

  const allFindings = files.flatMap((file) => scanFile(file, staged))

  if (allFindings.length === 0) {
    console.log(`check-hardcoded-secrets: OK (${files.length} files scanned${staged ? ', staged' : ''})`)
    return
  }

  console.error(`check-hardcoded-secrets: found ${allFindings.length} issue(s):\n`)
  for (const finding of allFindings) {
    console.error(`  ${finding.file}:${finding.line}  ${finding.message}`)
  }
  console.error(
    `\nIf a match is a verified false positive, add "// ${SUPPRESS_MARKER}" on that line.`
  )
  process.exitCode = 1
}

main()
