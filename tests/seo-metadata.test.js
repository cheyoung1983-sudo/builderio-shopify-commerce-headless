const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runSeoScript(testFnBody) {
  const repoRoot = path.resolve(__dirname, '..')
  const seoUrl = pathToFileURL(path.join(repoRoot, 'lib/seo.ts')).href

  const script = `
    const seoMod = await import(${JSON.stringify(seoUrl)})
    const {
      constructMetadata,
      generateProductMetadata,
      generateCollectionMetadata,
      cleanMetaDescription,
      generateProductSeo,
      generateCollectionSeo,
      generateBreadcrumbJsonLd,
      getBaseUrl,
    } = seoMod

    ${testFnBody}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })

  return JSON.parse(output.trim())
}

describe('SEO & Next.js Metadata Generator Suite', () => {
  test('constructMetadata() creates default and overridden metadata', () => {
    const result = runSeoScript(`
      const defaultMeta = constructMetadata()
      const overriddenMeta = constructMetadata({
        title: 'Screen Repair Toolkits',
        description: 'Shop precision smartphone repair toolkits.',
        canonical: 'https://displaycellpros.com/tools',
        noindex: true,
      })
      console.log(JSON.stringify({ defaultMeta, overriddenMeta }))
    `)

    expect(result.defaultMeta.title).toContain('DisplayCellPros')
    expect(result.defaultMeta.openGraph.type).toBe('website')
    expect(result.defaultMeta.robots.index).toBe(true)

    expect(result.overriddenMeta.title).toBe('Screen Repair Toolkits | DisplayCellPros')
    expect(result.overriddenMeta.description).toBe('Shop precision smartphone repair toolkits.')
    expect(result.overriddenMeta.alternates.canonical).toBe('https://displaycellpros.com/tools')
    expect(result.overriddenMeta.robots.index).toBe(false)
  })

  test('generateProductMetadata() generates dynamic product metadata', () => {
    const result = runSeoScript(`
      const mockProduct = {
        title: 'iPhone 15 Pro OLED Display Assembly',
        handle: 'iphone-15-pro-oled-display-assembly',
        description: 'High quality OEM replacement OLED screen with digitizer.',
        vendor: 'DisplayCellPros',
        featuredImage: {
          url: 'https://cdn.shopify.com/s/files/1/iphone-15-pro-screen.jpg',
          altText: 'iPhone 15 Pro OLED Display',
        },
        variants: [
          {
            price: {
              amount: '189.99',
              currencyCode: 'USD',
            },
            availableForSale: true,
          }
        ]
      }
      const meta = generateProductMetadata(mockProduct)
      console.log(JSON.stringify(meta))
    `)

    expect(result.title).toBe('iPhone 15 Pro OLED Display Assembly | DisplayCellPros')
    expect(result.description).toContain('OEM replacement OLED screen')
    expect(result.alternates.canonical).toContain('/product/iphone-15-pro-oled-display-assembly')
    expect(result.openGraph.images[0].url).toBe('https://cdn.shopify.com/s/files/1/iphone-15-pro-screen.jpg')
    expect(result.other['product:price:amount']).toBe('189.99')
    expect(result.other['product:price:currency']).toBe('USD')
    expect(result.other['product:availability']).toBe('in stock')
  })

  test('generateCollectionMetadata() generates dynamic collection metadata', () => {
    const result = runSeoScript(`
      const mockCollection = {
        title: 'Samsung Galaxy Screens',
        handle: 'samsung-galaxy-screens',
        description: 'OEM-grade replacement displays for Samsung Galaxy smartphones.',
        image: {
          url: 'https://cdn.shopify.com/s/files/1/samsung-collection.jpg',
        }
      }
      const meta = generateCollectionMetadata(mockCollection)
      console.log(JSON.stringify(meta))
    `)

    expect(result.title).toBe('Samsung Galaxy Screens | DisplayCellPros')
    expect(result.description).toContain('Samsung Galaxy smartphones')
    expect(result.alternates.canonical).toContain('/collection/samsung-galaxy-screens')
    expect(result.openGraph.images[0].url).toBe('https://cdn.shopify.com/s/files/1/samsung-collection.jpg')
  })

  test('generateProductSeo() generates OpenGraph and Product Schema.org JSON-LD', () => {
    const result = runSeoScript(`
      const mockProduct = {
        title: 'Pixel 8 Screen Replacement',
        handle: 'pixel-8-screen-replacement',
        description: 'Genuine Google Pixel 8 OLED panel replacement.',
        featuredImage: { url: 'https://cdn.shopify.com/pixel-8.jpg' },
        variants: [{ price: { amount: '129.00', currencyCode: 'USD' }, availableForSale: true }]
      }
      const seo = generateProductSeo(mockProduct)
      console.log(JSON.stringify(seo))
    `)

    expect(result.title).toContain('Pixel 8 Screen Replacement')
    expect(result.canonical).toContain('/product/pixel-8-screen-replacement')
    const productSchema = result.jsonLd.find((item) => item['@type'] === 'Product')
    expect(productSchema).toBeDefined()
    expect(productSchema.name).toBe('Pixel 8 Screen Replacement')
    expect(productSchema.offers.price).toBe('129.00')
    expect(productSchema.offers.availability).toBe('https://schema.org/InStock')
  })

  test('generateCollectionSeo() generates CollectionPage & BreadcrumbList structured data', () => {
    const result = runSeoScript(`
      const mockCollection = {
        title: 'iPad Digitizers',
        handle: 'ipad-digitizers',
        description: 'Replacement glass touch digitizers for iPad tablets.'
      }
      const seo = generateCollectionSeo(mockCollection)
      console.log(JSON.stringify(seo))
    `)

    expect(result.title).toContain('iPad Digitizers')
    expect(result.canonical).toContain('/collection/ipad-digitizers')
    const collectionSchema = result.jsonLd.find((item) => item['@type'] === 'CollectionPage')
    expect(collectionSchema).toBeDefined()
    expect(collectionSchema.name).toBe('iPad Digitizers')
    const breadcrumbSchema = result.jsonLd.find((item) => item['@type'] === 'BreadcrumbList')
    expect(breadcrumbSchema).toBeDefined()
    expect(breadcrumbSchema.itemListElement.length).toBeGreaterThanOrEqual(2)
  })
})
