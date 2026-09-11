const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runConfigCheck(relativeFile, envOverrides, expectedPattern) {
  const repoRoot = path.resolve(__dirname, '..')
  const fileUrl = pathToFileURL(path.join(repoRoot, relativeFile)).href

  const script = `
    try {
      await import(${JSON.stringify(fileUrl)})
      console.log('IMPORT_OK')
      process.exit(0)
    } catch (error) {
      const message = String(error && error.message ? error.message : error)
      console.log(message)
      if (new RegExp(${JSON.stringify(expectedPattern.source)}, ${JSON.stringify(expectedPattern.flags)}).test(message)) {
        process.exit(0)
      }
      process.exit(1)
    }
  `

  const result = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ...envOverrides,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return result
}

describe('runtime configuration validation', () => {
  it('throws in production when the Builder public key is missing', () => {
    const output = runConfigCheck(
      'config/builder.ts',
      { BUILDER_PUBLIC_KEY: '', NEXT_PUBLIC_BUILDER_PUBLIC_KEY: '' },
      /BUILDER_PUBLIC_KEY/i
    )

    expect(output).toMatch(/BUILDER_PUBLIC_KEY/i)
  })

  it('throws in production when the Shopify storefront credentials are missing', () => {
    const output = runConfigCheck(
      'config/shopify.ts',
      {
        SHOPIFY_STORE_DOMAIN: '',
        NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: '',
        SHOPIFY_STOREFRONT_API_TOKEN: '',
        NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN: '',
      },
      /SHOPIFY_STORE_DOMAIN|SHOPIFY_STOREFRONT_API_TOKEN/i
    )

    expect(output).toMatch(/SHOPIFY_STORE_DOMAIN|SHOPIFY_STOREFRONT_API_TOKEN/i)
  })

  it('propagates the same production guard to the commerce runtime (services/shopify.ts)', () => {
    const output = runConfigCheck(
      'services/shopify.ts',
      {
        SHOPIFY_STORE_DOMAIN: '',
        NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: '',
        SHOPIFY_STOREFRONT_API_TOKEN: '',
        NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN: '',
      },
      /SHOPIFY_STORE_DOMAIN|SHOPIFY_STOREFRONT_API_TOKEN/i
    )

    expect(output).toMatch(/SHOPIFY_STORE_DOMAIN|SHOPIFY_STOREFRONT_API_TOKEN/i)
  })
})
