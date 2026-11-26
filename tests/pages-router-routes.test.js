const fs = require('node:fs')
const path = require('node:path')
const { getSortedRoutes } = require('next/dist/shared/lib/router/utils/sorted-routes')

const PAGES_DIRECTORY = path.join(__dirname, '..', 'pages')
const PAGE_EXTENSION = /\.(?:js|jsx|ts|tsx)$/
const SPECIAL_PAGES = new Set(['_app', '_document', '_error', '404', '500'])

function collectPageRoutes(directory = PAGES_DIRECTORY, relativeDirectory = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      if (!relativeDirectory && entry.name === 'api') return []
      return collectPageRoutes(path.join(directory, entry.name), relativePath)
    }

    if (!entry.isFile() || !PAGE_EXTENSION.test(entry.name)) return []

    const routePath = path.join(relativeDirectory, entry.name.replace(PAGE_EXTENSION, ''))
    const segments = routePath.split(path.sep)
    if (segments.length === 1 && SPECIAL_PAGES.has(segments[0])) return []
    if (segments.at(-1) === 'index') segments.pop()

    return [`/${segments.join('/')}`.replace(/\/$/, '') || '/']
  })
}

describe('Pages Router route tree', () => {
  test('all page files can be sorted without overlapping dynamic routes', () => {
    expect(() => getSortedRoutes(collectPageRoutes())).not.toThrow()
  })
})
