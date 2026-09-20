const { spawnSync } = require('node:child_process')

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const env = { ...process.env, NODE_ENV: 'production' }

for (const command of [['run', 'precheck'], ['exec', 'next', '--', 'build']]) {
  const result = spawnSync(npmCommand, command, {
    env,
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
