const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const scriptsDir = path.resolve(__dirname, '../scripts')
const cleanGitEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !key.toUpperCase().startsWith('GIT_') && key !== 'VERCEL'
  )
)

// Copy the install-time scripts into a throwaway project so `npm install`
// behaviour can be exercised without touching this checkout's git config.
function makeProject(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  fs.mkdirSync(path.join(root, 'scripts'))
  fs.mkdirSync(path.join(root, '.githooks'))
  for (const file of ['setup-git-hooks.cjs', 'ensure-executable-modes.cjs']) {
    fs.copyFileSync(path.join(scriptsDir, file), path.join(root, 'scripts', file))
  }
  fs.writeFileSync(path.join(root, 'scripts', 'precheck.mjs'), '#!/usr/bin/env node\n')
  fs.writeFileSync(path.join(root, '.githooks', 'pre-commit'), '#!/bin/sh\n')
  return root
}

function runSetup(root, extraEnv = {}) {
  return execFileSync(process.execPath, [path.join(root, 'scripts', 'setup-git-hooks.cjs')], {
    cwd: root,
    env: { ...cleanGitEnv, ...extraEnv },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function hooksPath(root) {
  try {
    return execFileSync('git', ['config', '--local', '--get', 'core.hooksPath'], {
      cwd: root,
      env: cleanGitEnv,
      encoding: 'utf8',
    }).trim()
  } catch {
    return ''
  }
}

describe('setup-git-hooks install script', () => {
  const roots = []
  const track = (root) => (roots.push(root), root)
  afterEach(() => {
    while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true })
  })

  it('does not fail when .git is a partial directory (Vercel strips .git/config and HEAD)', () => {
    const root = track(makeProject('setup-hooks-partial-'))
    fs.mkdirSync(path.join(root, '.git', 'hooks'), { recursive: true })
    fs.writeFileSync(path.join(root, '.git', 'hooks', 'pre-commit.sample'), '')

    expect(() => runSetup(root)).not.toThrow()
  })

  it('does not write hook config into a parent repository through a broken .git', () => {
    const parent = track(fs.mkdtempSync(path.join(os.tmpdir(), 'setup-hooks-parent-')))
    execFileSync('git', ['init', '-q'], { cwd: parent, env: cleanGitEnv })
    const root = makeProject('setup-hooks-child-')
    const child = path.join(parent, 'child')
    fs.renameSync(root, child)
    fs.mkdirSync(path.join(child, '.git'))

    expect(() => runSetup(child)).not.toThrow()
    expect(hooksPath(parent)).toBe('')
  })

  it('skips on Vercel builds', () => {
    const root = track(makeProject('setup-hooks-vercel-'))
    execFileSync('git', ['init', '-q'], { cwd: root, env: cleanGitEnv })

    expect(() => runSetup(root, { VERCEL: '1' })).not.toThrow()
    expect(hooksPath(root)).toBe('')
  })

  it('configures hooks and executable modes in a real checkout', () => {
    const root = track(makeProject('setup-hooks-real-'))
    execFileSync('git', ['init', '-q'], { cwd: root, env: cleanGitEnv })
    fs.chmodSync(path.join(root, '.githooks', 'pre-commit'), 0o644)

    runSetup(root)

    expect(hooksPath(root)).toBe('.githooks')
    expect(fs.statSync(path.join(root, '.githooks', 'pre-commit')).mode & 0o111).not.toBe(0)
  })
})
