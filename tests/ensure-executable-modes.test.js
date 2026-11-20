const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

describe('ensure executable Git modes', () => {
  it('restores modes in the target worktree without altering an inherited Git index', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-executable-modes-'))
    const decoyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-executable-modes-decoy-'))
    const files = [
      'scripts/precheck.mjs',
      '.githooks/pre-commit',
      '.githooks/pre-push',
    ]
    const cleanGitEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))
    )
    const createRepo = (repoRoot, contentPrefix) => {
      execFileSync('git', ['init', '-q'], { cwd: repoRoot, env: cleanGitEnv })
      for (const file of files) {
        const absolutePath = path.join(repoRoot, file)
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
        fs.writeFileSync(absolutePath, `#!/bin/sh\n# ${contentPrefix} ${file}\n`)
      }
      execFileSync('git', ['add', '--', ...files], { cwd: repoRoot, env: cleanGitEnv })
      execFileSync('git', ['update-index', '--chmod=-x', '--', ...files], {
        cwd: repoRoot,
        env: cleanGitEnv,
      })
    }

    try {
      createRepo(root, 'target')
      createRepo(decoyRoot, 'decoy')

      const inheritedGitEnv = {
        ...cleanGitEnv,
        GIT_DIR: path.join(decoyRoot, '.git'),
        GIT_WORK_TREE: decoyRoot,
        GIT_INDEX_FILE: path.join(decoyRoot, '.git', 'index'),
        GIT_COMMON_DIR: path.join(decoyRoot, '.git'),
      }
      expect(path.resolve(execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: root,
        env: inheritedGitEnv,
        encoding: 'utf8',
      }).trim())).toBe(path.resolve(decoyRoot))

      const helperPath = path.resolve(__dirname, '../scripts/ensure-executable-modes.cjs')
      const helperCall =
        `require(${JSON.stringify(helperPath)}).ensureExecutableModes({ root: ${JSON.stringify(root)} })`
      execFileSync(process.execPath, ['-e', helperCall], {
        cwd: root,
        env: inheritedGitEnv,
      })

      const entries = execFileSync('git', ['ls-files', '-s', '--', ...files], {
        cwd: root,
        env: cleanGitEnv,
        encoding: 'utf8',
      }).trim().split(/\r?\n/)
      expect(entries).toHaveLength(files.length)
      expect(entries.every((entry) => entry.startsWith('100755 '))).toBe(true)
      for (const file of files) {
        expect(execFileSync('git', ['show', `:${file}`], {
          cwd: root,
          env: cleanGitEnv,
          encoding: 'utf8',
        })).toContain(`target ${file}`)
      }

      const decoyEntries = execFileSync('git', ['ls-files', '-s', '--', ...files], {
        cwd: decoyRoot,
        env: cleanGitEnv,
        encoding: 'utf8',
      }).trim().split(/\r?\n/)
      expect(decoyEntries.every((entry) => entry.startsWith('100644 '))).toBe(true)
      for (const file of files) {
        expect(execFileSync('git', ['show', `:${file}`], {
          cwd: decoyRoot,
          env: cleanGitEnv,
          encoding: 'utf8',
        })).toContain(`decoy ${file}`)
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
      fs.rmSync(decoyRoot, { recursive: true, force: true })
    }
  })
})
