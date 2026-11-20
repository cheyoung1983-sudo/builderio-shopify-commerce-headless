const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

describe('Node runtime version guard', () => {
  it('routes CI repo hygiene through the guarded npm script', () => {
    const workflow = fs.readFileSync(
      path.resolve(__dirname, '..', '.github', 'workflows', 'ci.yml'),
      'utf8'
    )

    expect(workflow).toContain('run: npm run check:repo')
    expect(workflow).not.toContain('run: node scripts/check-repo-hygiene.cjs')
  })

  it('reports whether the running Node version matches the repository requirement', () => {
    const repoRoot = path.resolve(__dirname, '..')
    const script = path.join(repoRoot, 'scripts', 'check-node-version-consistency.cjs')
    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    const output = `${result.stdout}${result.stderr}`
    const runtimeMajor = Number(process.versions.node.split('.')[0])

    if (runtimeMajor === 24) {
      expect(result.status).toBe(0)
      expect(output).toContain('OK')
      expect(output).toContain('Node 24')
    } else {
      expect(result.status).not.toBe(0)
      expect(output).toContain('running Node runtime')
      expect(output).toContain(`"v${runtimeMajor}.`)
      expect(output).toContain('must match Node 24')
    }
  })
})
