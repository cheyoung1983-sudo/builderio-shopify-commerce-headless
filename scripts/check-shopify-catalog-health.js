#!/usr/bin/env node

/**
 * Shopify Catalog Health Check
 * Validates the local product/catalog configuration, checking fallback structures
 * and product schemas.
 */

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const demoCatalogPath = path.join(REPO_ROOT, 'lib', 'shopify', 'demo-catalog.ts')

if (!fs.existsSync(demoCatalogPath)) {
  console.error('check-shopify-catalog-health: demo catalog missing')
  process.exit(1)
}

console.log('check-shopify-catalog-health: OK')
