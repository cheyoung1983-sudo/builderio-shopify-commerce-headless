#!/usr/bin/env node

/**
 * Validates Vercel CLI presence, project linkage (.vercel), and precheck readiness.
 */

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const isWindows = process.platform === 'win32'

console.log('🔍 Checking deployment readiness...')

// 1. Check if Vercel CLI is installed
const vercelCliCheck = spawnSync('npx', ['--no-install', 'vercel', '--version'], {
  cwd: repoRoot,
  encoding: 'utf8',
  shell: isWindows,
})

const hasVercelCli = vercelCliCheck.status === 0
if (hasVercelCli) {
  console.log(`✓ Vercel CLI available: ${vercelCliCheck.stdout.trim()}`)
} else {
  console.log('ℹ Vercel CLI: Can be executed via `npx vercel`')
}

// 2. Check project linkage (.vercel/project.json)
const vercelProjectFile = path.join(repoRoot, '.vercel', 'project.json')
if (fs.existsSync(vercelProjectFile)) {
  try {
    const projectData = JSON.parse(fs.readFileSync(vercelProjectFile, 'utf8'))
    console.log(`✓ Vercel project linked: ${projectData.projectId || 'Unknown'} (Org: ${projectData.orgId || 'Unknown'})`)
  } catch (e) {
    console.log('⚠ .vercel/project.json exists but could not be parsed')
  }
} else {
  console.log('ℹ Vercel project linkage: Not linked locally (.vercel/project.json not found). Link using `npx vercel link`.')
}

// 3. Execute precheck suite
console.log('\n--- Running Precheck Verification Suite ---')
const precheck = spawnSync('npm', ['run', 'precheck:build'], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: isWindows,
})

if (precheck.status !== 0) {
  console.error('\n❌ Deployment readiness check FAILED: Precheck suite encountered errors.')
  process.exit(1)
}

console.log('\n✅ Deployment readiness check PASSED. Repository is ready for deployment.')
