const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

describe('cart storage consistency', () => {
  it('uses the same legacy key across the modern and legacy cart implementations', () => {
    const repoRoot = path.resolve(__dirname, '..')
    const sharedUrl = pathToFileURL(path.join(repoRoot, 'lib/cart-storage.ts')).href
    const legacyUrl = pathToFileURL(
      path.join(repoRoot, 'lib/shopify/storefront-data-hooks/src/utils/LocalStorage/keys.ts')
    ).href

    const script = `
      const shared = await import(${JSON.stringify(sharedUrl)})
      const legacy = await import(${JSON.stringify(legacyUrl)})
      const sharedLegacy = shared.CART_STORAGE_KEYS.LEGACY_CART
      const legacyCart = legacy.LocalStorageKeys.CART
      const output = { sharedLegacy, legacyCart, match: sharedLegacy === legacyCart }
      console.log(JSON.stringify(output))
      if (!output.match) process.exit(1)
    `

    const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
    })

    expect(output).toContain('"match":true')
    expect(output).toContain('"sharedLegacy":"shopify_local_store__cart"')
  })

  it('clears the legacy cart entry when the modern cart is emptied', async () => {
    const repoRoot = path.resolve(__dirname, '..')
    const script = `
      const shared = await import(${JSON.stringify(pathToFileURL(path.join(repoRoot, 'lib/cart-storage.ts')).href)})
      const legacyKey = shared.CART_STORAGE_KEYS.LEGACY_CART

      globalThis.window = {
        localStorage: {
          store: {},
          getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null },
          setItem(key, value) { this.store[key] = String(value) },
          removeItem(key) { delete this.store[key] },
        },
      }

      shared.persistAllCartData([], 'cart_123', 'https://checkout.test')
      const output = {
        legacyKey,
        afterClear: globalThis.window.localStorage.getItem(legacyKey),
        hasLegacyEntry: Object.prototype.hasOwnProperty.call(globalThis.window.localStorage.store, legacyKey),
      }

      console.log(JSON.stringify(output))
      if (output.hasLegacyEntry) process.exit(1)
    `

    const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
    })

    expect(output).toContain('"hasLegacyEntry":false')
  })
})
