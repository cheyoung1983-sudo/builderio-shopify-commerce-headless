const path = require('node:path')
const { spawnSync } = require('node:child_process')

const projectDir = path.resolve(__dirname, '..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const env = { ...process.env, NODE_ENV: 'production' }

for (const command of [['run', 'precheck'], ['exec', 'next', '--', 'build']]) {
  const result = spawnSync(npmCommand, command, {
    cwd: projectDir,
    env,
    stdio: 'inherit',
    shell: true,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

