#!/usr/bin/env node

/**
 * Guards against the class of bug that broke CI on this repo: package.json's
 * `engines.node` (24.x), .nvmrc (20), and .github/workflows/ci.yml's
 * `node-version` (20) had drifted apart, so CI ran on a Node version that
 * didn't support a flag (--experimental-strip-types) the test suite needed.
 * The mismatch surfaced as a cryptic runtime crash instead of a clear error.
 *
 * This checks that every Node-version source in the repo agrees on the same
 * major version, and fails loudly and specifically if they don't.
 */

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')

function majorVersion(raw) {
  const match = String(raw).match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function readPackageEngineNode() {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
  const raw = pkg.engines && pkg.engines.node
  if (!raw) return null
  return { source: 'package.json engines.node', raw, major: majorVersion(raw) }
}

function readNvmrc() {
  const filePath = path.join(repoRoot, '.nvmrc')
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8').trim()
  if (!raw) return null
  return { source: '.nvmrc', raw, major: majorVersion(raw) }
}

function readWorkflowNodeVersions() {
  const workflowsDir = path.join(repoRoot, '.github', 'workflows')
  if (!fs.existsSync(workflowsDir)) return []

  const results = []
  for (const file of fs.readdirSync(workflowsDir)) {
    if (!/\.ya?ml$/.test(file)) continue
    const filePath = path.join(workflowsDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const matches = content.matchAll(/node-version:\s*['"]?([^\s'"#]+)/g)
    for (const match of matches) {
      const raw = match[1]
      results.push({ source: `.github/workflows/${file}`, raw, major: majorVersion(raw) })
    }
  }
  return results
}

function main() {
  const sources = [readPackageEngineNode(), readNvmrc(), ...readWorkflowNodeVersions()].filter(Boolean)

  if (sources.length === 0) {
    console.log('check-node-version-consistency: no Node version sources found, skipping')
    return
  }

  const majors = new Set(sources.map((s) => s.major))

  if (majors.size <= 1) {
    console.log(
      `check-node-version-consistency: OK (${sources.length} source(s) agree on Node ${sources[0].major})`
    )
    return
  }

  console.error('check-node-version-consistency: Node version sources disagree:\n')
  for (const { source, raw, major } of sources) {
    console.error(`  ${source}: "${raw}" (major ${major})`)
  }
  console.error(
    '\nAlign every source on the same major Node version. A drift here is how CI ended up ' +
      'running tests on a Node version that silently lacked a flag the test suite required.'
  )
  process.exitCode = 1
}

main()
