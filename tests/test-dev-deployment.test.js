/** @jest-environment node */

const { createServer } = require('node:http')
const { checkLiveCatalog } = require('../scripts/test-dev-deployment')

describe('dev deployment catalog checks', () => {
  let server
  let baseUrl
  let responseBody

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(responseBody))
    })

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  test('recognizes the live Shopify search API response as configured', async () => {
    responseBody = {
      ok: true,
      count: 1,
      products: [{ id: 'gid://shopify/Product/123' }],
    }

    const result = await checkLiveCatalog(baseUrl)

    expect(result.outcome).toBe('PASS')
    expect(result.detail).toBe('Shopify configured with 1 product(s)')
  })
})
