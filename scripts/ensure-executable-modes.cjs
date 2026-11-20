const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

function ensureExecutableModes({ root = path.resolve(__dirname, '..') } = {}) {
  const execFiles = ['scripts/precheck.mjs']
  const hooksDir = path.join(root, '.githooks')

  if (fs.existsSync(hooksDir)) {
    for (const entry of fs.readdirSync(hooksDir, { withFileTypes: true })) {
      if (entry.isFile()) execFiles.push(`.githooks/${entry.name}`)
    }
  }

  const trackedFiles = new Set(
    execFileSync('git', ['ls-files', '--', ...execFiles], {
      cwd: root,
      encoding: 'utf8',
    }).split(/\r?\n/).filter(Boolean)
  )

  for (const file of execFiles) {
    const absolutePath = path.join(root, file)
    if (!fs.existsSync(absolutePath)) continue

    fs.chmodSync(absolutePath, 0o755)
    if (trackedFiles.has(file)) {
      execFileSync('git', ['update-index', '--chmod=+x', '--', file], { cwd: root })
    }
  }
}

if (require.main === module) {
  try {
    ensureExecutableModes()
    console.log('Executable modes restored for tracked precheck and Git hooks.')
  } catch (error) {
    console.error(`Unable to restore executable modes: ${error.message}`)
    process.exitCode = 1
  }
}

module.exports = { ensureExecutableModes }
