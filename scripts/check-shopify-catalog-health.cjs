const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const demoCatalogPath = path.join(REPO_ROOT, 'lib', 'shopify', 'demo-catalog.ts')
const shopifyServicePath = path.join(REPO_ROOT, 'services', 'shopify.ts')
const productsPagePath = path.join(REPO_ROOT, 'pages', 'products.tsx')
const homepagePath = path.join(REPO_ROOT, 'pages', '[[...path]].tsx')
const liveUrlIndex = process.argv.indexOf('--url')
const liveUrl = liveUrlIndex >= 0 ? process.argv[liveUrlIndex + 1] : null
const allowDemo = process.argv.includes('--allow-demo')
const failures = []
const warnings = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

check(fs.existsSync(demoCatalogPath), 'demo catalog file is missing')
check(fs.existsSync(shopifyServicePath), 'Shopify service is missing')
check(fs.existsSync(productsPagePath), 'products page is missing')
check(fs.existsSync(homepagePath), 'catch-all homepage route is missing')

if (fs.existsSync(shopifyServicePath)) {
  const service = fs.readFileSync(shopifyServicePath, 'utf8')
  check(service.includes('fetchAllAvailableProducts'), 'Shopify service must expose fetchAllAvailableProducts')
  check(service.includes('isShopifyConfigured'), 'Shopify service must expose isShopifyConfigured')
  check(!service.includes('DEMO_PRODUCTS'), 'production Shopify service must not import the demo catalog')
}

if (fs.existsSync(productsPagePath)) {
  const productsPage = fs.readFileSync(productsPagePath, 'utf8')
  check(productsPage.includes('fetchAllAvailableProducts'), 'products page must load its initial catalog from Shopify')
}

if (fs.existsSync(homepagePath)) {
  const homepage = fs.readFileSync(homepagePath, 'utf8')
  check(homepage.includes('fetchAllAvailableProducts'), 'homepage fallback must load its catalog from Shopify')
}

async function checkLiveCatalog() {
  if (!liveUrl) return
  const endpoint = `${liveUrl.replace(/\/$/, '')}/api/agent/search?first=1`
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      failures.push(`live catalog endpoint returned HTTP ${response.status}`)
      return
    }
    const payload = await response.json()
    if (!payload.shopifyConfigured) {
      if (allowDemo) warnings.push('Shopify is not configured; demo mode was explicitly allowed')
      else failures.push('Shopify is not configured; live catalog verification failed')
      return
    }
    const products = Array.isArray(payload.products) ? payload.products : []
    if (products.some((product) => String(product.id || '').includes('/demo-'))) {
      failures.push('live catalog endpoint returned demo product IDs')
    } else if (products.length === 0) {
      warnings.push('Shopify is configured but returned no available products')
    } else {
      console.log(`live catalog: OK (${products.length} product(s) verified)`)
    }
  } catch (error) {
    failures.push(`live catalog request failed: ${error.message}`)
  }
}

async function main() {
  await checkLiveCatalog()

  if (warnings.length) {
    console.warn('check-shopify-catalog-health: WARN')
    warnings.forEach((warning) => console.warn(`- ${warning}`))
  }
  if (failures.length) {
    console.error('check-shopify-catalog-health: FAILED')
    failures.forEach((failure) => console.error(`- ${failure}`))
    process.exitCode = 1
  } else {
    console.log('check-shopify-catalog-health: OK')
  }
}

main()
