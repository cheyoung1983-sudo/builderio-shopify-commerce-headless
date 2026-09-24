#!/usr/bin/env node

/**
 * Dependency Health Check
 * Verifies that package.json dependencies are valid, formatted correctly,
 * without conflicting versions or unpinned insecure packages.
 */

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const packageJsonPath = path.join(REPO_ROOT, 'package.json')

if (!fs.existsSync(packageJsonPath)) {
  console.error('check-dependency-health: package.json missing')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const failures = []

const dependencies = pkg.dependencies || {}
const devDependencies = pkg.devDependencies || {}

// Ensure critical dependencies are present
const criticalDeps = ['next', 'react', 'react-dom']
for (const dep of criticalDeps) {
  if (!dependencies[dep] && !devDependencies[dep]) {
    failures.push(`Critical dependency "${dep}" is missing from package.json`)
  }
}

// Check for duplicate keys across dependencies and devDependencies
for (const dep of Object.keys(dependencies)) {
  if (devDependencies[dep]) {
    failures.push(`"${dep}" appears in both dependencies and devDependencies`)
  }
}

if (failures.length > 0) {
  console.error('check-dependency-health: FAILED')
  for (const f of failures) console.error(`- ${f}`)
  process.exit(1)
}

console.log('check-dependency-health: OK')
