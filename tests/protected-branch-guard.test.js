const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const guardPath = path.join(repoRoot, 'scripts', 'guard-protected-branch.cjs')
const preRebaseHookPath = path.join(repoRoot, '.githooks', 'pre-rebase')
const preCommitHookPath = path.join(repoRoot, '.githooks', 'pre-commit')
const cleanGitEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))
)
cleanGitEnv.NODE_BINARY = process.execPath.replace(/\\/g, '/')

function makeRepo(branch) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'protected-branch-guard-'))
  execFileSync('git', ['init', '-q', '--initial-branch', branch], { cwd: root, env: cleanGitEnv })
  return root
}

function runGuard(root, operation, targetBranch = '') {
  try {
    const stdout = execFileSync(process.execPath, [guardPath, operation, targetBranch], {
      cwd: root,
      env: cleanGitEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { status: 0, output: stdout }
  } catch (error) {
    return {
      status: error.status,
      output: `${error.stdout || ''}${error.stderr || ''}`,
    }
  }
}

function makeRepoWithRebaseHook() {
  const root = makeRepo('main')
  const hooks = path.join(root, '.githooks')
  const scripts = path.join(root, 'scripts')
  fs.mkdirSync(hooks)
  fs.mkdirSync(scripts)
  execFileSync('git', ['config', 'user.name', 'Hook Test'], { cwd: root, env: cleanGitEnv })
  execFileSync('git', ['config', 'user.email', 'hook-test@example.com'], { cwd: root, env: cleanGitEnv })
  fs.writeFileSync(path.join(root, 'file.txt'), 'main\n')
  execFileSync('git', ['add', 'file.txt'], { cwd: root, env: cleanGitEnv })
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: root, env: cleanGitEnv, stdio: 'ignore' })
  fs.copyFileSync(preRebaseHookPath, path.join(hooks, 'pre-rebase'))
  fs.copyFileSync(preCommitHookPath, path.join(hooks, 'pre-commit'))
  fs.copyFileSync(guardPath, path.join(scripts, 'guard-protected-branch.cjs'))
  fs.writeFileSync(path.join(scripts, 'ensure-executable-modes.cjs'), '')
  fs.writeFileSync(path.join(scripts, 'precheck.mjs'), '')
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root, env: cleanGitEnv })
  execFileSync('git', ['switch', '-q', '-c', 'feature/hook-test'], { cwd: root, env: cleanGitEnv })
  fs.writeFileSync(path.join(root, 'file.txt'), 'feature\n')
  try {
    execFileSync('git', ['commit', '-am', 'feature change'], {
      cwd: root,
      env: cleanGitEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    throw new Error(`Feature-branch fixture commit failed:\n${error.stderr || error.message}`)
  }
  return root
}

describe('protected branch guard', () => {
  const roots = []
  const trackRepo = (branch) => {
    const root = makeRepo(branch)
    roots.push(root)
    return root
  }

  afterEach(() => {
    while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true })
  })

  test('blocks a rebase when the checked-out branch is main', () => {
    const result = runGuard(trackRepo('main'), 'rebase')

    expect(result.status).toBe(1)
    expect(result.output).toContain('Rebase is blocked on protected branch "main"')
  })

  test('blocks commits on master as well as main', () => {
    const result = runGuard(trackRepo('master'), 'commit')

    expect(result.status).toBe(1)
    expect(result.output).toContain('Commit is blocked on protected branch "master"')
  })

  test('allows rebasing a named feature branch while another branch is checked out', () => {
    const result = runGuard(trackRepo('main'), 'rebase', 'feature/fix-conflicts')

    expect(result.status).toBe(0)
  })

  test('blocks an explicitly named main target even when another branch is checked out', () => {
    const result = runGuard(trackRepo('feature/fix-conflicts'), 'rebase', 'refs/heads/main')

    expect(result.status).toBe(1)
    expect(result.output).toContain('Rebase is blocked on protected branch "main"')
  })

  test('allows commits on a feature branch', () => {
    const result = runGuard(trackRepo('feature/fix-conflicts'), 'commit')

    expect(result.status).toBe(0)
  })

  test('the installed pre-rebase hook rejects rebasing main', () => {
    const root = makeRepoWithRebaseHook()
    roots.push(root)
    let error

    try {
      execFileSync('git', ['switch', '-q', 'main'], { cwd: root, env: cleanGitEnv })
      execFileSync('git', ['rebase', '--force-rebase', 'feature/hook-test'], {
        cwd: root,
        env: cleanGitEnv,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeDefined()
    expect(`${error.stderr || ''}`).toContain('Rebase is blocked on protected branch "main"')
  })

  test('the installed pre-rebase hook allows updating a feature branch from main', () => {
    const root = makeRepoWithRebaseHook()
    roots.push(root)

    expect(() =>
      execFileSync('git', ['rebase', '--force-rebase', 'main'], {
        cwd: root,
        env: cleanGitEnv,
        stdio: 'ignore',
      })
    ).not.toThrow()
  })

  test('the installed pre-commit hook rejects commits on main', () => {
    const root = makeRepoWithRebaseHook()
    roots.push(root)
    let error

    try {
      execFileSync('git', ['switch', '-q', 'main'], { cwd: root, env: cleanGitEnv })
      fs.writeFileSync(path.join(root, 'file.txt'), 'forbidden main change\n')
      execFileSync('git', ['add', 'file.txt'], { cwd: root, env: cleanGitEnv })
      execFileSync('git', ['commit', '-m', 'must be blocked'], {
        cwd: root,
        env: cleanGitEnv,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeDefined()
    expect(`${error.stderr || ''}`).toContain('Commit is blocked on protected branch "main"')
  })

  test('the installed pre-commit hook permits commits on a feature branch', () => {
    const root = makeRepoWithRebaseHook()
    roots.push(root)
    fs.writeFileSync(path.join(root, 'file.txt'), 'second feature change\n')
    execFileSync('git', ['commit', '-am', 'second feature change'], {
      cwd: root,
      env: cleanGitEnv,
      stdio: 'ignore',
    })
  })
})
