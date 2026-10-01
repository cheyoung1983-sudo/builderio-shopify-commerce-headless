#!/usr/bin/env node

/**
 * End-of-session / end-of-PR cleanup, targeting the exact classes of mess
 * this repo has actually accumulated from concurrent agent sessions:
 *
 *   - orphaned `next dev` processes left holding a port (deploy.js's own
 *     dev target now cleans up after itself, but ad-hoc `npm run dev` /
 *     `vercel dev` runs and crashed sessions don't)
 *   - a stray git submodule "gitlink" from an agent worktree directory
 *     that happened to contain its own .git (see PR #23) — this checks
 *     for a recurrence of that exact class of bug
 *   - next-env.d.ts churn from switching between `next dev` and
 *     `next build` locally, which shows up as noise in every diff
 *   - branches already merged into main piling up, locally and on origin
 *
 * Safe-by-default: process/port cleanup, gitlink removal, and the
 * next-env.d.ts revert run unconditionally (all fully reversible or
 * provably safe). Branch deletion is report-only unless --apply is
 * passed, and remote branch deletion additionally requires --remote,
 * since that's a shared-state change other collaborators can see.
 *
 * Remote branch staleness is delegated to scripts/check-stale-branches.js
 * (see AGENT_WORKFLOW.md's "Stale branches" section) rather than
 * reimplemented here — this only adds the actual deletion step, gated
 * behind --apply --remote.
 *
 * Usage:
 *   node scripts/cleanup-project.js                 report + safe auto-fixes
 *   node scripts/cleanup-project.js --apply          also delete merged local branches
 *   node scripts/cleanup-project.js --apply --remote also delete merged remote branches
 */

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const isWindows = process.platform === 'win32'
const APPLY = process.argv.includes('--apply')
const INCLUDE_REMOTE = process.argv.includes('--remote')

const DEV_PORTS = [3000]
const PROTECTED_BRANCHES = new Set(['main', 'master'])

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', ...opts })
}

function section(title) {
  console.log(`\n== ${title} ==`)
}

// --- 1. Kill stray processes holding dev ports -----------------------------

function killStalePorts() {
  section('Dev server ports')
  for (const port of DEV_PORTS) {
    if (isWindows) {
      const netstat = run('cmd', ['/c', `netstat -ano | findstr :${port} | findstr LISTENING`])
      const pids = new Set(
        (netstat.stdout || '')
          .split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid))
      )
      if (pids.size === 0) {
        console.log(`  port ${port}: free`)
        continue
      }
      for (const pid of pids) {
        run('taskkill', ['/pid', pid, '/T', '/F'])
        console.log(`  port ${port}: killed stale PID ${pid}`)
      }
    } else {
      const lsof = run('lsof', ['-ti', `tcp:${port}`])
      const pids = (lsof.stdout || '').split('\n').filter(Boolean)
      if (pids.length === 0) {
        console.log(`  port ${port}: free`)
        continue
      }
      for (const pid of pids) {
        run('kill', ['-9', pid])
        console.log(`  port ${port}: killed stale PID ${pid}`)
      }
    }
  }
}

// --- 2. Broken gitlink entries (agent worktrees committed by mistake) ------

function cleanBrokenGitlinks() {
  section('Broken submodule gitlinks')
  const gitmodulesPath = path.join(repoRoot, '.gitmodules')
  const declaredSubmodules = fs.existsSync(gitmodulesPath) ? fs.readFileSync(gitmodulesPath, 'utf8') : ''

  const lsTree = run('git', ['ls-tree', '-r', 'HEAD'])
  const gitlinks = (lsTree.stdout || '')
    .split('\n')
    .filter((line) => line.startsWith('160000 commit'))
    .map((line) => line.split('\t')[1])
    .filter(Boolean)

  if (gitlinks.length === 0) {
    console.log('  none found')
    return
  }

  for (const gitlinkPath of gitlinks) {
    if (declaredSubmodules.includes(gitlinkPath)) {
      console.log(`  ${gitlinkPath}: legitimate submodule (declared in .gitmodules), leaving alone`)
      continue
    }
    console.log(`  ${gitlinkPath}: no .gitmodules entry — removing dangling gitlink`)
    run('git', ['rm', '--cached', gitlinkPath])
  }
}

// --- 3. next-env.d.ts dev/build churn --------------------------------------

function revertNextEnvChurn() {
  section('next-env.d.ts churn')
  const diff = run('git', ['diff', '--', 'next-env.d.ts'])
  const output = diff.stdout || ''
  if (!output) {
    console.log('  no changes')
    return
  }
  const onlyDevBuildToggle = /\.next\/(dev\/)?types\/(routes|root-params)\.d\.ts/.test(output)
  const meaningfulChange = output
    .split('\n')
    .some((line) => /^[+-]/.test(line) && !/\.next\/(dev\/)?types\//.test(line) && !/^(\+\+\+|---)/.test(line))

  if (onlyDevBuildToggle && !meaningfulChange) {
    run('git', ['checkout', '--', 'next-env.d.ts'])
    console.log('  reverted (dev/build path toggle only, not a real change)')
  } else {
    console.log('  changed, but not the known dev/build toggle pattern — leaving for review')
  }
}

// --- 4. Empty leftover agent worktree directories ---------------------------

function removeEmptyWorktreeDirs() {
  section('Empty agent worktree directories')
  const candidates = ['.worktrees', path.join('.claude', 'worktrees')]
  let found = false

  for (const rel of candidates) {
    const dir = path.join(repoRoot, rel)
    if (!fs.existsSync(dir)) continue
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const fullPath = path.join(dir, entry.name)
      const isEmpty = fs.readdirSync(fullPath).length === 0
      if (isEmpty) {
        fs.rmdirSync(fullPath)
        console.log(`  removed empty ${path.join(rel, entry.name)}`)
        found = true
      }
    }
  }
  if (!found) console.log('  none found')
}

// --- 5. Merged branches ------------------------------------------------------

function listMergedLocalBranches() {
  const result = run('git', ['branch', '--merged', 'main'])
  return (result.stdout || '')
    .split('\n')
    .map((line) => line.replace('*', '').trim())
    .filter(Boolean)
    .filter((name) => !PROTECTED_BRANCHES.has(name))
}

// Remote staleness reporting is already owned by check-stale-branches.js
// (see AGENT_WORKFLOW.md's "Stale branches" section) — delegate to it
// instead of reimplementing the same ahead-count logic here.
function listStaleRemoteBranches() {
  const result = run('node', [path.join('scripts', 'check-stale-branches.js')])
  const output = result.stdout || ''
  const match = output.match(/Stale branches[^:]*:\n((?:\s+origin\/.+\n?)+)/)
  if (!match) return []
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => name.replace(/^origin\//, ''))
}

function handleMergedBranches() {
  section('Branches merged into main (local)')
  const currentBranch = (run('git', ['branch', '--show-current']).stdout || '').trim()
  const localMerged = listMergedLocalBranches()

  if (localMerged.length === 0) {
    console.log('  none found')
  }
  for (const branch of localMerged) {
    if (branch === currentBranch) {
      console.log(`  ${branch}: currently checked out, skipping`)
      continue
    }
    if (APPLY) {
      const del = run('git', ['branch', '-d', branch])
      console.log(`  ${branch}: ${del.status === 0 ? 'deleted' : 'FAILED — ' + del.stderr.trim()}`)
    } else {
      console.log(`  ${branch}: merged, safe to delete (run with --apply)`)
    }
  }

  section('Stale remote branches (via check-stale-branches.js)')
  const remoteStale = listStaleRemoteBranches()
  if (remoteStale.length === 0) {
    console.log('  none found')
    return
  }
  for (const branch of remoteStale) {
    if (APPLY && INCLUDE_REMOTE) {
      const del = run('git', ['push', 'origin', '--delete', branch])
      console.log(`  origin/${branch}: ${del.status === 0 ? 'deleted' : 'FAILED — ' + del.stderr.trim()}`)
    } else {
      console.log(`  origin/${branch}: stale, safe to delete (run with --apply --remote)`)
    }
  }
}

function main() {
  console.log(`Project cleanup${APPLY ? ' (apply mode)' : ' (report + safe auto-fixes only)'}`)

  killStalePorts()
  cleanBrokenGitlinks()
  revertNextEnvChurn()
  removeEmptyWorktreeDirs()
  handleMergedBranches()

  console.log('\nDone.')
  if (!APPLY) {
    console.log('Branch deletions were listed but not performed. Re-run with --apply (and --remote for origin).')
  }
}

main()
