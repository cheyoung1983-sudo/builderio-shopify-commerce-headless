const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const failures = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

const packageJson = JSON.parse(read('package.json'))
const nextConfig = read('next.config.js')
const builderConfig = read('config/builder.ts')
const shopifyConfig = read('config/shopify.ts')
const catchAllRoute = read('pages/[[...path]].tsx')
const workflow = read('.github/workflows/ci.yml')
const envExample = read('.env.example')
const nodeVersion = read('.nvmrc').trim().match(/\d+/)?.[0]
const engineVersion = packageJson.engines?.node?.match(/\d+/)?.[0]
const eslintNextVersion = packageJson.devDependencies?.['eslint-config-next']?.match(/\d+/)?.[0]
const analyzerVersion = packageJson.devDependencies?.['@next/bundle-analyzer']?.match(/\d+/)?.[0]
const nextVersion = packageJson.dependencies?.next?.match(/\d+/)?.[0]
const buildScript = packageJson.scripts?.build || ''
const buildRunner = read('scripts/build.js')
const productionBuildConfigured =
  buildScript.includes('NODE_ENV=production') ||
  buildRunner.includes("NODE_ENV: 'production'") ||
  buildRunner.includes('NODE_ENV: "production"')

check(nodeVersion && nodeVersion === engineVersion, 'Node version must match package.json engines.node')
check(nextVersion && eslintNextVersion === nextVersion, 'eslint-config-next must match the Next.js major version')
check(nextVersion && analyzerVersion === nextVersion, '@next/bundle-analyzer must match the Next.js major version')
check(productionBuildConfigured, 'The production build must set NODE_ENV=production')
check(catchAllRoute.includes("const builderModel = 'page'"), 'Catch-all route must render the Builder page model')
check(!catchAllRoute.includes('Path Page:'), 'Catch-all route must not contain the diagnostic placeholder')
check(!nextConfig.match(/^\s*SHOPIFY_STOREFRONT_API_TOKEN\s*:/m), 'Private Shopify token must not be exposed by next.config.js')
check(builderConfig.includes("process.env.NODE_ENV === 'production'"), 'Builder config must validate credentials in production')
check(builderConfig.includes('BUILDER_PUBLIC_KEY') && builderConfig.includes('throw new Error'), 'Builder config must throw when production credentials are missing')
check(shopifyConfig.includes('isPrivateToken(publicStorefrontAccessToken)'), 'Public Shopify token must reject private token formats')
check(shopifyConfig.includes("process.env.NODE_ENV === 'production'"), 'Shopify config must validate credentials in production')
check(shopifyConfig.includes('SHOPIFY_STORE_DOMAIN is required in production'), 'Shopify config must require the production store domain')
check(workflow.includes('npm run typecheck'), 'CI must run type-checking')
check(workflow.includes('npm run lint'), 'CI must run ESLint')
check(workflow.includes('npm run build'), 'CI must run the production build')
for (const variable of [
  'BUILDER_PUBLIC_KEY',
  'SHOPIFY_STOREFRONT_API_TOKEN',
  'NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN',
  'SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID',
  'SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID',
  'NEXT_PUBLIC_SITE_URL',
]) {
  check(envExample.includes(`${variable}=`), `.env.example must document ${variable}`)
}

if (failures.length) {
  console.error('check-project-health: FAILED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('check-project-health: OK')
}
