const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const envFiles = ['.env.local', '.env']
const args = new Set(process.argv.slice(2))
const shouldFix = args.has('--fix')

for (const file of envFiles) {
  try {
    process.loadEnvFile(path.join(root, file))
  } catch {
    // Missing env files are valid for CI and fresh checkouts.
  }
}

const findings = []

function addFinding(message, fix) {
  findings.push({ message, fix })
}

function checkProductionCsp() {
  const config = fs.readFileSync(path.join(root, 'next.config.js'), 'utf8')
  if (/script-src[^\n]*['"]unsafe-eval['"]/.test(config)) {
    addFinding('Production CSP must not allow unsafe-eval.', () => {
      throw new Error('Remove unsafe-eval from next.config.js before running the fixer.')
    })
  }
}

async function checkOptionalAnnouncementModel() {
  const model = process.env.NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL
  const apiKey = process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY
  if (!model || !apiKey) return

  const response = await fetch(
    `https://cdn.builder.io/api/v3/content/${encodeURIComponent(model)}?apiKey=${encodeURIComponent(apiKey)}&limit=1`
  )
  if (response.status !== 404) return

  const envPath = path.join(root, '.env.local')
  addFinding(`Configured optional Builder model "${model}" does not exist.`, () => {
    if (!fs.existsSync(envPath)) {
      throw new Error('Create .env.local or clear NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL in your deployment environment.')
    }
    const source = fs.readFileSync(envPath, 'utf8')
    const updated = source.replace(/^NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL=.*$/m, 'NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL=')
    if (updated === source) {
      throw new Error('The setting is not present in .env.local; clear it in the deployment environment.')
    }
    fs.writeFileSync(envPath, updated)
    console.log(`  fixed .env.local: disabled missing Builder model "${model}"`)
  })
}

async function main() {
  checkProductionCsp()
  await checkOptionalAnnouncementModel()

  if (!findings.length) {
    console.log('project-health: OK')
    return
  }

  console.log(`project-health: ${findings.length} finding(s)`)
  for (const finding of findings) console.log(`- ${finding.message}`)

  if (shouldFix) {
    for (const finding of findings) finding.fix()
    console.log('project-health: fixes applied')
  } else {
    console.log('Run `npm run health:fix` to apply safe local fixes where possible.')
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`project-health: ${error.message}`)
  process.exitCode = 1
})
