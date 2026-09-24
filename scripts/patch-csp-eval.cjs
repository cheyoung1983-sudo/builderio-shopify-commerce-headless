const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const BASE_DIR = path.join(REPO_ROOT, 'node_modules', '@builder.io')

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

console.log('Patching @builder.io/* packages for CSP compliance...')

if (fs.existsSync(BASE_DIR)) {
  for (const pkgName of fs.readdirSync(BASE_DIR)) {
    const targetDir = path.join(BASE_DIR, pkgName)
    if (fs.statSync(targetDir).isDirectory()) {
      walkFiles(targetDir, (filePath) => {
        let content = fs.readFileSync(filePath, 'utf8')
        let changed = false

        const originalPattern1 = /eval\(['"]require['"]\)/g
        if (originalPattern1.test(content)) {
          console.log(`  Fixing eval('require') in: @builder.io/${pkgName}/${path.relative(targetDir, filePath)}`)
          content = content.replace(originalPattern1, "(typeof globalThis !== 'undefined' && globalThis['require'] ? globalThis['require'] : (typeof require !== 'undefined' ? require : (function() { return null; })))")
          changed = true
        }

        const oldPatchPattern = /\(typeof require !== ['"]undefined['"] \? require : \(function\(\) \{ return null; \}\)\)/g
        if (oldPatchPattern.test(content)) {
          console.log(`  Upgrading previous patch pattern in: @builder.io/${pkgName}/${path.relative(targetDir, filePath)}`)
          content = content.replace(oldPatchPattern, "(typeof globalThis !== 'undefined' && globalThis['require'] ? globalThis['require'] : (typeof require !== 'undefined' ? require : (function() { return null; })))")
          changed = true
        }

        if (changed) {
          fs.writeFileSync(filePath, content)
        }
      })
    }
  }
}

console.log('Patching complete.')
