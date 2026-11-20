#!/usr/bin/env node

// Points git at the repo's tracked hooks (.githooks/) so the secret-scan
// pre-commit hook runs automatically. Runs on `npm install` via the
// "prepare" script. Safe to no-op if this isn't a git checkout (e.g. a
// deploy that only copies source files).

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const gitDir = path.join(root, '.git')

if (fs.existsSync(gitDir)) {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root })
  require('./ensure-executable-modes.cjs').ensureExecutableModes({ root })
}
