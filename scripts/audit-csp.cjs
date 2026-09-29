/**
 * Audit CSP Script
 * Validates Content Security Policy compliance and checks for unsafe eval in dependencies.
 */

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const BASE_DIR = path.join(REPO_ROOT, 'node_modules', '@builder.io')

console.log('Auditing CSP compliance...')

let violations = 0

function walkFiles(dir, callback) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, callback)
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
      callback(fullPath)
    }
  }
}

if (fs.existsSync(BASE_DIR)) {
  for (const pkgName of fs.readdirSync(BASE_DIR)) {
    const targetDir = path.join(BASE_DIR, pkgName)
    if (fs.statSync(targetDir).isDirectory()) {
      walkFiles(targetDir, (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        if (/eval\(['"]require['"]\)/g.test(content)) {
          violations++
          console.warn(`[CSP Warning] Unpatched eval in @builder.io/${pkgName}/${path.relative(targetDir, filePath)}`)
        }
      })
    }
  }
}

if (violations > 0) {
  if (process.argv.includes('--fix')) {
    console.log('Auto-fixing CSP violations...')
    require('./patch-csp-eval.cjs')
  } else {
    console.warn(`⚠️  Found ${violations} CSP warning(s). Run 'npm run fix:csp' to auto-patch.`)
  }
} else {
  console.log('✅ CSP Audit PASSED: 0 violations found.')
}
