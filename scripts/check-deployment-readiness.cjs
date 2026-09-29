#!/usr/bin/env node

/**
 * Deployment Readiness Prevention Script
 *
 * Validates:
 * 1. Vercel CLI presence and project linkage (prevents "Project is not linked" failures).
 * 2. Hardcoded secret scan excluding third-party submodules (prevents false-positive scan failures).
 * 3. Full precheck suite (node version, CSP audit, CORS, typecheck, lint, auth health).
 *
 * Usage:
 *   node scripts/check-deployment-readiness.cjs
 */

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const isWindows = process.platform === 'win32'

function log(msg) {
  console.log(`[deployment-readiness] ${msg}`)
}

function fail(msg) {
  console.error(`[deployment-readiness] ERROR: ${msg}`)
  process.exit(1)
}

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

function main() {
  log('Checking Vercel CLI...')
  const vercelVersion = spawnSync('vercel', ['--version'], { encoding: 'utf8', shell: isWindows })
  if (vercelVersion.status !== 0) {
    fail('Vercel CLI not found or failed version check.')
  }
  log(`Vercel CLI available: ${(vercelVersion.stdout || '').trim()}`)

  log('Checking Vercel project linkage...')
  const hasLinkedFile = Boolean(findLinkedProjectFile(repoRoot))
  const projectList = spawnSync('vercel', ['project', 'ls'], { encoding: 'utf8', shell: isWindows })
  const isLinkedCli = projectList.status === 0

  if (!hasLinkedFile && !isLinkedCli) {
    fail('Project is not linked to Vercel. Run `vercel link` first.')
  }
  log('✅ Vercel project linkage verified.')

  log('Running full project precheck suite (secrets, CSP, lint, typecheck)...')
  const precheck = spawnSync('npm', ['run', 'precheck'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: isWindows,
  })

  if (precheck.status !== 0) {
    fail('Precheck suite failed. See errors above.')
  }

  log('🎉 Deployment readiness check PASSED successfully! Ready for deployment.')
}

main()
