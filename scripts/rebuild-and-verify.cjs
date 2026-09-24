const { spawnSync } = require('node:child_process')

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const args = process.argv.slice(2)
const urlIndex = args.indexOf('--url')
const baseUrl = urlIndex >= 0 ? args[urlIndex + 1] : null

function run(command, commandArgs) {
  console.log(`\n> ${command} ${commandArgs.join(' ')}`)
  const result = spawnSync(command, commandArgs, {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

function main() {
  run(npmCommand, ['run', 'check:security-boundaries'])
  run(npmCommand, ['run', 'check:shopify-catalog-health'])
  run(npmCommand, ['run', 'precheck'])
  run(npmCommand, ['run', 'test:a11y', '--', '--runInBand', '--silent'])
  run(npmCommand, ['run', 'build'])

  if (baseUrl) {
    run(process.execPath, ['scripts/check-shopify-catalog-health.js', '--url', baseUrl])
    run(process.execPath, ['scripts/test-security-boundaries.js', '--url', baseUrl])
    run(process.execPath, ['scripts/test-dev-deployment.js', baseUrl])
  } else {
    console.log('\nSkipping live security and route smoke tests. Pass --url <local-preview-url> to enable them.')
  }

  console.log('\nrebuild-and-verify: OK')
}

main()
