#!/usr/bin/env node

/**
 * Diagnoses the class of failure from the DevTools report that led to
 * lib/resolve-builder-content.ts's timeout fix: a Builder.io CDN request
 * for a content model returning 404 "Model not found", potentially after
 * a long hang. This can't create a missing model (that needs write access
 * to the Builder.io dashboard, not just a public API key) — it detects
 * and reports exactly what's broken so that's a two-minute dashboard fix
 * instead of a DevTools archaeology session.
 *
 * Usage: node scripts/check-builder-content-health.js
 */

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')

// Mirror how `next dev` resolves env vars, so this sees the same
// BUILDER_PUBLIC_KEY a real page render would use.
for (const file of ['.env.local', '.env']) {
  try {
    const fullPath = path.join(repoRoot, file)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim()
          const val = trimmed.slice(eqIdx + 1).trim()
          process.env[key] = val
        }
      }
    }
  } catch {
    // file doesn't exist — fine, fall through to process.env as-is
  }
}

const TIMEOUT_MS = 8000
const MODEL_REFERENCE_PATTERN =
  /(?:const\s+builderModel\s*=|resolveBuilderContent\(|builder\.get\(|model=)\s*['"]([a-zA-Z0-9_-]+)['"]/g

// Scans source instead of hardcoding a model list, so this stays accurate
// as pages/blocks are added or renamed.
function findReferencedModels() {
  const models = new Set()

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8')
        for (const match of content.matchAll(MODEL_REFERENCE_PATTERN)) {
          models.add(match[1])
        }
      }
    }
  }

  for (const dir of ['pages', 'lib', 'blocks', 'components']) {
    const fullDir = path.join(repoRoot, dir)
    if (fs.existsSync(fullDir)) walk(fullDir)
  }

  return [...models]
}

async function checkModel(apiKey, model) {
  const url = `https://cdn.builder.io/api/v3/content/${model}?apiKey=${apiKey}&limit=1`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = Date.now()

  try {
    const response = await fetch(url, { signal: controller.signal })
    const durationMs = Date.now() - start
    const body = await response.json().catch(() => null)

    if (response.status === 404) {
      return { model, status: 'MISSING', detail: `404 ${body?.message || 'Model not found'}`, durationMs }
    }
    if (!response.ok) {
      return { model, status: 'ERROR', detail: `HTTP ${response.status}`, durationMs }
    }

    const count = body?.results?.length ?? 0
    if (count === 0) {
      return { model, status: 'EMPTY', detail: 'model exists but has no published entries', durationMs }
    }
    return { model, status: 'OK', detail: `${count} entr${count === 1 ? 'y' : 'ies'} found`, durationMs }
  } catch (error) {
    const durationMs = Date.now() - start
    if (error.name === 'AbortError') {
      return { model, status: 'TIMEOUT', detail: `no response within ${TIMEOUT_MS}ms`, durationMs }
    }
    return { model, status: 'ERROR', detail: error.message, durationMs }
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const apiKey = process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || ''

  if (!apiKey) {
    console.error('check-builder-content-health: BUILDER_PUBLIC_KEY is not set — cannot reach the Builder CDN.')
    console.error('Set BUILDER_PUBLIC_KEY (or NEXT_PUBLIC_BUILDER_PUBLIC_KEY) in .env.local, then re-run.')
    process.exitCode = 1
    return
  }

  if (!/^[a-f0-9]{32}$/i.test(apiKey)) {
    console.warn(
      `check-builder-content-health: WARNING — "${apiKey.slice(0, 6)}..." doesn't look like a standard ` +
        `Builder public API key (expected a 32-char hex string). Double-check it matches the intended Builder space.`
    )
  }

  const models = findReferencedModels()
  const configuredAnnouncementModel =
    process.env.NEXT_PUBLIC_BUILDER_ANNOUNCEMENT_MODEL || ''
  if (configuredAnnouncementModel) models.push(configuredAnnouncementModel)
  const uniqueModels = [...new Set(models)]
  if (uniqueModels.length === 0) {
    console.log('check-builder-content-health: no Builder model references found in pages/lib/blocks/components.')
    return
  }

  console.log(`Checking ${uniqueModels.length} Builder.io model(s) referenced in this codebase against the CDN...\n`)

  const results = await Promise.all(uniqueModels.map((model) => checkModel(apiKey, model)))

  const markers = { OK: '✓', EMPTY: '!', MISSING: '✗', TIMEOUT: '✗', ERROR: '✗' }
  for (const r of results) {
    console.log(`  ${markers[r.status]} ${r.model.padEnd(20)} ${r.status.padEnd(8)} ${r.detail} (${r.durationMs}ms)`)
  }

  const broken = results.filter((r) => r.status !== 'OK')
  if (broken.length === 0) {
    console.log('\nAll referenced Builder.io models are present and published.')
    return
  }

  console.log(`\n${broken.length} of ${results.length} model(s) need attention in the Builder.io dashboard:`)
  for (const r of broken) {
    if (r.status === 'MISSING') {
      console.log(`  - "${r.model}": create this model in the Builder.io space for this API key.`)
    } else if (r.status === 'EMPTY') {
      console.log(`  - "${r.model}": model exists but has no published content — publish at least one entry.`)
    } else {
      console.log(`  - "${r.model}": ${r.detail} — check Builder.io status or network access.`)
    }
  }
  console.log(
    '\nThese should be created and published in the Builder space, or disabled when optional. ' +
      'Server-side page resolution times out after 8s, while client-side model requests can still log 404s.'
  )
  process.exitCode = 1
}

main()
