import type { GetServerSideProps } from 'next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Standalone public reference page at /tribal-verification-guide. Same pattern
// as the maintenance homepage (pages/index.tsx): the raw HTML is written and the
// response ended in getServerSideProps, so the `_app` Layout (nav, cart, voice
// widget) does not wrap it. Its CSS, Chart.js, and script are self-hosted under
// public/tribal-guide/ so the page works under the existing CSP. This explicit
// route takes priority over the pages/[...path].tsx catch-all. It is
// informational only and does not change checkout, discount, or tax behavior.
const GUIDE_HTML_PATH = join(
  process.cwd(),
  'content',
  'tribal-verification-guide.html'
)

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const html = readFileSync(GUIDE_HTML_PATH, 'utf8')
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.write(html)
  res.end()
  return { props: {} }
}

export default function TribalVerificationGuide() {
  return null
}
