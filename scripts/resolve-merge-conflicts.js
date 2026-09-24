#!/usr/bin/env node

const { execFileSync } = require('node:child_process')
const path = require('node:path')

let repoRoot = path.resolve(__dirname, '..')
const allowedStrategies = new Set(['ours', 'theirs', 'manual'])

function usage() {
  console.log(`Usage: node scripts/resolve-merge-conflicts.js [options]

Options:
  --strategy=<value>  Resolution strategy: manual (default), ours, or theirs
  --apply             Apply the selected ours/theirs strategy to conflicted paths
  --stage             Stage resolved paths after applying a strategy
  --check             Fail if unresolved conflicts remain; do not modify files
  --files=<paths>     Limit reporting/applying to comma-separated conflicted paths
  --repo=<path>       Git repository to inspect (default: project root)
  --json              Print machine-readable output
  --help              Show this help

The default is a read-only report. --apply is required for file changes.
`)
}

function parseArgs(argv) {
  const options = {
    strategy: 'manual',
    apply: false,
    stage: false,
    check: false,
    files: null,
    repo: null,
    json: false,
  }

  for (const argument of argv) {
    if (argument === '--help' || argument === '-h') {
      usage()
      process.exit(0)
    }

    if (argument === '--apply') {
      options.apply = true
      continue
    }

    if (argument === '--stage') {
      options.stage = true
      continue
    }

    if (argument === '--check') {
      options.check = true
      continue
    }

    if (argument === '--json') {
      options.json = true
      continue
    }

    if (argument.startsWith('--strategy=')) {
      options.strategy = argument.slice('--strategy='.length)
      continue
    }

    if (argument.startsWith('--files=')) {
      options.files = argument
        .slice('--files='.length)
        .split(',')
        .map((file) => file.trim())
        .filter(Boolean)
      continue
    }

    if (argument.startsWith('--repo=')) {
      options.repo = argument.slice('--repo='.length)
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  if (!allowedStrategies.has(options.strategy)) {
    throw new Error(`Unsupported strategy: ${options.strategy}`)
  }

  if (options.strategy !== 'manual' && !options.apply && !options.check) {
    throw new Error('A mutating strategy requires --apply, or use --check for a read-only validation')
  }

  if (options.stage && !options.apply) {
    throw new Error('--stage requires --apply')
  }

  if (options.check && options.apply) {
    throw new Error('--check cannot be combined with --apply')
  }

  return options
}

function runGit(args, { capture = true } = {}) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
}

function ensureRepository() {
  try {
    runGit(['rev-parse', '--show-toplevel'])
  } catch {
    throw new Error(`Not a Git repository: ${repoRoot}`)
  }
}

function getConflictedPaths() {
  const output = runGit(['diff', '--name-only', '--diff-filter=U', '-z'])
  return output
    .split('\0')
    .filter(Boolean)
    .sort()
}

function getConflictStages(file) {
  const output = runGit(['ls-files', '-u', '--', file])
  const stages = new Set()

  for (const line of output.trim().split('\n').filter(Boolean)) {
    const match = line.match(/^\d+ [0-9a-f]+ (\d)\t/)
    if (match) stages.add(Number(match[1]))
  }

  return [...stages].sort((a, b) => a - b)
}

function filterPaths(paths, requestedFiles) {
  if (!requestedFiles) return paths

  const conflicted = new Set(paths)
  const unknown = requestedFiles.filter((file) => !conflicted.has(file))
  if (unknown.length) {
    throw new Error(`Requested paths are not unresolved conflicts: ${unknown.join(', ')}`)
  }

  return requestedFiles.slice().sort()
}

function buildReport(paths, options) {
  return {
    repository: repoRoot,
    strategy: options.strategy,
    apply: options.apply,
    stage: options.stage,
    unresolvedCount: paths.length,
    conflicts: paths.map((file) => ({ file, stages: getConflictStages(file) })),
  }
}

function applyStrategy(paths, options) {
  if (!paths.length) return
  if (options.strategy === 'manual') {
    throw new Error('The manual strategy only reports conflicts; choose ours or theirs with --apply')
  }

  for (const file of paths) {
    const stages = getConflictStages(file)
    const selectedStage = options.strategy === 'ours' ? 2 : 3

    if (!stages.includes(selectedStage)) {
      runGit(['rm', '--', file], { capture: false })
      continue
    }

    runGit(['checkout', `--${options.strategy}`, '--', file], { capture: false })
    if (options.stage) runGit(['add', '--', file], { capture: false })
  }
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  if (!report.unresolvedCount) {
    console.log('resolve-merge-conflicts: no unresolved conflicts found')
    return
  }

  console.log(`resolve-merge-conflicts: ${report.unresolvedCount} unresolved conflict(s)`)
  for (const conflict of report.conflicts) {
    console.log(`- ${conflict.file} (index stages: ${conflict.stages.join(', ') || 'unknown'})`)
  }

  if (!report.apply) {
    console.log('\nNo files changed. Use --apply --strategy=ours|theirs to resolve explicitly.')
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.repo) repoRoot = path.resolve(options.repo)
  ensureRepository()

  const allPaths = getConflictedPaths()
  const paths = filterPaths(allPaths, options.files)
  const report = buildReport(paths, options)

  if (options.apply) {
    applyStrategy(paths, options)
    report.appliedPaths = paths
    report.remainingConflicts = getConflictedPaths()
  }

  printReport(report, options.json)

  if (options.check && paths.length) process.exitCode = 1
  if (options.apply && report.remainingConflicts.length) process.exitCode = 1
}

try {
  main()
} catch (error) {
  console.error(`resolve-merge-conflicts: ${error.message}`)
  process.exitCode = 1
}
