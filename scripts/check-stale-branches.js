#!/usr/bin/env node

/**
 * Reports remote branches with zero commits ahead of main — these are
 * already fully merged (or were never unique to begin with) and are safe
 * to delete outright with no review needed.
 *
 * Written after a branch audit found five of seven stale branches in
 * exactly this state, with nobody having cleaned them up. See
 * AGENT_WORKFLOW.md's "Stale branches" section.
 *
 * Usage:
 *   node scripts/check-stale-branches.js [--base <branch>] [--fail-on-stale]
 *
 * Exit code: 0 unless --fail-on-stale is passed and stale branches exist.
 */

const { execFileSync } = require('node:child_process')

function parseArgs(argv) {
  const args = { base: 'main', failOnStale: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i]
    if (argv[i] === '--fail-on-stale') args.failOnStale = true
  }
  return args
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function listRemoteBranches(base) {
  const output = git(['branch', '-r', '--format=%(refname:short)'])
  // The symbolic HEAD ref renders as the bare remote name ("origin"), not
  // "origin/HEAD", under --format=%(refname:short) — exclude both forms.
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((ref) => ref !== `origin/${base}` && ref !== 'origin/HEAD' && ref !== 'origin')
}

function aheadCount(base, branch) {
  return Number(git(['rev-list', '--count', `origin/${base}..${branch}`]))
}

function main() {
  const { base, failOnStale } = parseArgs(process.argv.slice(2))

  try {
    git(['fetch', 'origin', '--prune', '--quiet'])
  } catch {
    // Best-effort — continue with whatever refs are already known locally.
  }

  const branches = listRemoteBranches(base)
  if (branches.length === 0) {
    console.log(`check-stale-branches: no branches other than ${base} — nothing to report.`)
    return
  }

  const stale = []
  const active = []

  for (const branch of branches) {
    const ahead = aheadCount(base, branch)
    if (ahead === 0) stale.push(branch)
    else active.push({ branch, ahead })
  }

  if (active.length > 0) {
    console.log(`Active branches (unique commits ahead of ${base}):`)
    active
      .sort((a, b) => b.ahead - a.ahead)
      .forEach(({ branch, ahead }) => console.log(`  ${branch} — ${ahead} commit(s) ahead`))
  }

  if (stale.length > 0) {
    console.log(`\nStale branches (0 commits ahead of ${base} — safe to delete):`)
    stale.forEach((branch) => console.log(`  ${branch}`))
    console.log(`\nDelete with: git push origin --delete ${stale.map((b) => b.replace(/^origin\//, '')).join(' ')}`)
  } else {
    console.log('\nNo stale branches found.')
  }

  if (failOnStale && stale.length > 0) {
    process.exitCode = 1
  }
}

main()
