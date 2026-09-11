#!/usr/bin/env node

// Points git at the repo's tracked hooks (.githooks/) so the secret-scan
// pre-commit hook runs automatically. Runs on `npm install` via the
// "prepare" script. Safe to no-op if this isn't a git checkout (e.g. a
// deploy that only copies source files).

const { execFileSync } = require('node:child_process')

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'])
} catch {
  // Not a git repository (or git unavailable) — nothing to configure.
}
