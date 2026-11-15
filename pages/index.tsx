import type { GetServerSideProps } from 'next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Standalone maintenance HTML for `/` only. Served by ending the response
// in getServerSideProps so `_app` Layout (nav, cart, voice widget) and
// `_document` do not wrap it. Other routes keep using [...path].tsx
// and the shared layout unchanged.
const MAINTENANCE_HTML_PATH = join(
  process.cwd(),
  'content',
  'maintenance-homepage.html'
)

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const html = readFileSync(MAINTENANCE_HTML_PATH, 'utf8')
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.write(html)
  res.end()
  return { props: {} }
}

export default function MaintenanceHomepage() {
  return null
}
