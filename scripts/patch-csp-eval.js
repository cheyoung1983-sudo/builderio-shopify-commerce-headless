const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const TARGET_DIR = path.join(REPO_ROOT, 'node_modules', '@builder.io', 'react')

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

console.log('Patching @builder.io/react for CSP compliance...')

walkFiles(TARGET_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8')
  let changed = false

  // Replace eval('require') and eval("require")
  // The user suggested: typeof require !== 'undefined' ? require : () => null
  // But inside these files it's often assigned to a variable or exports.

  const originalPattern1 = /eval\(['"]require['"]\)/g
  if (originalPattern1.test(content)) {
    console.log(`  Fixing eval('require') in: ${path.relative(TARGET_DIR, filePath)}`)
    // If it's safeDynamicRequire = eval('require'), we replace the eval call.
    content = content.replace(originalPattern1, "(typeof require !== 'undefined' ? require : (function() { return null; }))")
    changed = true
  }

  if (changed) {
    fs.writeFileSync(filePath, content)
  }
})

console.log('Patching complete.')
