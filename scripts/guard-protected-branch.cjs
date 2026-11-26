const { execFileSync } = require('node:child_process')

const PROTECTED_BRANCHES = new Set(['main', 'master'])

function getCurrentBranch(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function guardProtectedBranch(operation, requestedBranch = '', cwd = process.cwd()) {
  if (!['commit', 'rebase'].includes(operation)) {
    throw new Error(`Unsupported protected-branch operation: ${operation || '(empty)'}`)
  }

  const branch = (requestedBranch || getCurrentBranch(cwd)).replace(/^refs\/heads\//, '')
  if (PROTECTED_BRANCHES.has(branch)) {
    throw new Error(
      `${operation === 'rebase' ? 'Rebase' : 'Commit'} is blocked on protected branch "${branch}". ` +
        'Create or switch to a feature branch and use a pull request.'
    )
  }
}

if (require.main === module) {
  try {
    guardProtectedBranch(process.argv[2], process.argv[3] || '')
  } catch (error) {
    console.error(`protected-branch-guard: ${error.message}`)
    process.exitCode = 1
  }
}

module.exports = { guardProtectedBranch, getCurrentBranch }
