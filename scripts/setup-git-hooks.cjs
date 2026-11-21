#!/usr/bin/env node

// Points git at the repo's tracked hooks (.githooks/) so the secret-scan
// pre-commit hook runs automatically, and restores executable modes on the
// hooks and precheck script. Runs on `npm install` via the "prepare" script.
//
// This must never fail an install. Deploy builders (e.g. Vercel, whose
// .vercelignore strips .git/config and .git/HEAD but leaves a partial .git
// directory) are not real git checkouts, so every git step is best-effort.

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

function cleanGitEnv(env = process.env) {
  // Ignore GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE etc. inherited from a
  // parent git process so we only ever touch this checkout.
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))
  )
}

function isRealCheckout(root, gitEnv) {
  try {
    const topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root,
      env: gitEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    // A broken .git here could make git fall through to a parent repository;
    // only proceed when git agrees this directory is the checkout root.
    return fs.realpathSync(topLevel) === fs.realpathSync(root)
  } catch {
    return false
  }
}

function setupGitHooks({
  root = path.resolve(__dirname, '..'),
  env = process.env,
  warn = (message) => console.warn(`setup-git-hooks: ${message}`),
} = {}) {
  if (env.VERCEL) return 'skipped'
  if (!fs.existsSync(path.join(root, '.git'))) return 'skipped'

  const gitEnv = cleanGitEnv(env)
  if (!isRealCheckout(root, gitEnv)) return 'skipped'

  let ok = true
  try {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
      cwd: root,
      env: gitEnv,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
  } catch (error) {
    ok = false
    warn(`could not set core.hooksPath (${String(error.message).split('\n')[0]})`)
  }

  try {
    require('./ensure-executable-modes.cjs').ensureExecutableModes({ root })
  } catch (error) {
    ok = false
    warn(`could not restore executable modes (${String(error.message).split('\n')[0]})`)
  }

  return ok ? 'configured' : 'partial'
}

if (require.main === module) {
  try {
    setupGitHooks()
  } catch (error) {
    console.warn(`setup-git-hooks: skipped (${String(error && error.message).split('\n')[0]})`)
  }
}

module.exports = { setupGitHooks }
