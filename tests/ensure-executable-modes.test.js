const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { ensureExecutableModes } = require('../scripts/ensure-executable-modes.cjs')

describe('ensure executable Git modes', () => {
  it('restores executable index modes for the precheck and hooks', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-executable-modes-'))
    const files = [
      'scripts/precheck.mjs',
      '.githooks/pre-commit',
      '.githooks/pre-push',
    ]

    try {
      execFileSync('git', ['init', '-q'], { cwd: root })
      for (const file of files) {
        const absolutePath = path.join(root, file)
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
        fs.writeFileSync(absolutePath, '#!/bin/sh\n')
      }
      execFileSync('git', ['add', '--', ...files], { cwd: root })
      execFileSync('git', ['update-index', '--chmod=-x', '--', ...files], { cwd: root })

      ensureExecutableModes({ root })

      const entries = execFileSync('git', ['ls-files', '-s', '--', ...files], {
        cwd: root,
        encoding: 'utf8',
      }).trim().split(/\r?\n/)
      expect(entries).toHaveLength(files.length)
      expect(entries.every((entry) => entry.startsWith('100755 '))).toBe(true)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
