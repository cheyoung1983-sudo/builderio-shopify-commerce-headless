#!/usr/bin/env node

// Points git at the repo's tracked hooks (.githooks/) so the secret-scan
// pre-commit hook runs automatically. Runs on `npm install` via the
// "prepare" script. Safe to no-op if this isn't a git checkout (e.g. a
// deploy that only copies source files).

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

try {
  const gitDir = path.resolve(__dirname, '..', '.git')
  if (fs.existsSync(gitDir)) {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
      stdio: ['ignore', 'ignore', 'ignore'],
    })
  }
  // Restore exec bits that some exports drop.
  for (const f of ['scripts/precheck.mjs', ...fs.readdirSync(path.resolve(__dirname, '..', '.githooks')).map((h) => '.githooks/' + h)]) {
    try { fs.chmodSync(path.resolve(__dirname, '..', f), 0o755) } catch {}
  }
} catch {
  // Not a git repository (or git unavailable) — nothing to configure.
}
