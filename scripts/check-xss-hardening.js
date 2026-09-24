#!/usr/bin/env node

/**
 * Guards against the three vulnerability classes found and fixed in the
 * security review of this repo (see PR #30):
 *
 *   1. next.config.js's Content-Security-Policy had no script-src,
 *      object-src, or default-src at all. It restricted connect-src/
 *      img-src/font-src/frame-ancestors but placed NO restriction on which
 *      scripts could execute — the CSP did nothing to contain an XSS
 *      payload once one landed on the page.
 *   2. components/common/SEO.tsx rendered JSON-LD via
 *      `dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }}` without
 *      escaping "<", so a title/description containing "</script>" could
 *      break out of the script tag and inject real markup.
 *      components/common/Breadcrumbs.tsx had the correct
 *      `.replace(/</g, '<')` mitigation in the same codebase; SEO.tsx
 *      just didn't.
 *   3. blocks/ProductView/ProductView.tsx, blocks/CollectionView/
 *      CollectionView.tsx, and components/products/ProductDetail.tsx all
 *      rendered Shopify product/collection description HTML via
 *      dangerouslySetInnerHTML with zero sanitization.
 *
 * This script re-derives all three checks from source (not a fixed list of
 * files) so a *new* occurrence of any pattern — not just the original
 * three — gets caught:
 *
 *   - the CSP must keep script-src/object-src/default-src/base-uri;
 *   - a JSON-LD dangerouslySetInnerHTML must escape "<" the same way
 *     Breadcrumbs.tsx does;
 *   - any other dangerouslySetInnerHTML must route through
 *     lib/sanitize-html.ts's sanitizeRichText(), not render an expression
 *     raw.
 *
 * Usage:
 *   node scripts/check-xss-hardening.js          detect only
 *   node scripts/check-xss-hardening.js --fix     also auto-fix what's
 *                                                  mechanically safe to fix
 *
 * --fix scope: object-src/base-uri have one universally-safe value, so
 * they're auto-inserted if missing. script-src/default-src/style-src need a
 * project-specific origin allowlist that can't be safely guessed, so a
 * missing one is reported, not auto-fixed. A JSON-LD dangerouslySetInnerHTML
 * over a simple `JSON.stringify(<identifier>)` gets the same `.replace`
 * escape appended. Any other unsafe dangerouslySetInnerHTML gets its
 * expression wrapped in sanitizeRichText(...), adding the import if needed.
 */

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const FIX = process.argv.includes('--fix')

const read = (relPath) => fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8')
const exists = (relPath) => fs.existsSync(path.join(REPO_ROOT, relPath))

const SCAN_DIRS = ['blocks', 'components', 'config', 'context', 'lib', 'pages', 'services']
const SCAN_EXTENSIONS = new Set(['.tsx', '.jsx'])

function walkFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, results)
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath)
    }
  }
  return results
}

function relPath(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/')
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length
}

// ---------------------------------------------------------------------------
// Check 1: CSP must keep script-src / object-src / default-src / base-uri.
// ---------------------------------------------------------------------------

const NEXT_CONFIG_PATH = 'next.config.js'
const CSP_DIRECTIVES_NO_SAFE_DEFAULT = ['script-src', 'default-src']
const CSP_DIRECTIVES_WITH_SAFE_DEFAULT = [
  { name: 'object-src', literal: "object-src 'none'" },
  { name: 'base-uri', literal: "base-uri 'self'" },
]

function checkAndFixCsp() {
  if (!exists(NEXT_CONFIG_PATH)) return { findings: [], fixed: false }

  let content = read(NEXT_CONFIG_PATH)
  const findings = []
  let fixed = false

  for (const directive of CSP_DIRECTIVES_NO_SAFE_DEFAULT) {
    if (!new RegExp(`['"\`]${directive}\\b`).test(content)) {
      findings.push(
        `${NEXT_CONFIG_PATH}: CSP is missing "${directive}" — this needs a project-specific ` +
          `origin allowlist (which external scripts/resources this app actually loads), so it ` +
          `can't be auto-fixed. Add it manually; see the script-src comment already in the file ` +
          `for the reasoning.`
      )
    }
  }

  for (const { name, literal } of CSP_DIRECTIVES_WITH_SAFE_DEFAULT) {
    if (!new RegExp(`['"\`]${name}\\b`).test(content)) {
      if (FIX) {
        const anchor = "'frame-ancestors *',"
        if (content.includes(anchor)) {
          content = content.replace(anchor, `${anchor}\n              "${literal}",`)
          fixed = true
        } else {
          findings.push(
            `${NEXT_CONFIG_PATH}: CSP is missing "${name}" and the expected anchor line to insert ` +
              `it next to wasn't found — add "${literal}" manually.`
          )
        }
      } else {
        findings.push(
          `${NEXT_CONFIG_PATH}: CSP is missing "${name}" (fixable: run with --fix to add ` +
            `"${literal}").`
        )
      }
    }
  }

  if (fixed) {
    fs.writeFileSync(path.join(REPO_ROOT, NEXT_CONFIG_PATH), content)
  }

  return { findings, fixed }
}

// ---------------------------------------------------------------------------
// Checks 2 & 3: dangerouslySetInnerHTML must be either the escaped JSON-LD
// pattern or route through sanitizeRichText().
// ---------------------------------------------------------------------------

const DANGEROUS_HTML_PATTERN = /dangerouslySetInnerHTML=\{\{\s*__html:\s*([\s\S]*?)\}\}/g
const SIMPLE_JSON_STRINGIFY = /^JSON\.stringify\(([a-zA-Z0-9_.]+)\)$/

function isEscapedJsonLd(expr) {
  return /^JSON\.stringify\([\s\S]*\)\.replace\(\s*\/</.test(expr)
}

function isSanitized(expr) {
  return /\bsanitizeRichText\(/.test(expr)
}

function computeSanitizeImportSpecifier(absFilePath, fileContent) {
  if (/from ['"]@lib\//.test(fileContent)) {
    return '@lib/sanitize-html'
  }
  const fileDir = path.dirname(absFilePath)
  const target = path.join(REPO_ROOT, 'lib', 'sanitize-html')
  let rel = path.relative(fileDir, target).split(path.sep).join('/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel
}

function insertImport(content, specifier) {
  const importLine = `import { sanitizeRichText } from '${specifier}'\n`
  const importLines = [...content.matchAll(/^import .*$/gm)]
  if (importLines.length === 0) return importLine + content
  const last = importLines[importLines.length - 1]
  const insertAt = last.index + last[0].length
  return content.slice(0, insertAt) + '\n' + importLine.trimEnd() + content.slice(insertAt)
}

function checkAndFixDangerousHtml() {
  const files = SCAN_DIRS.flatMap((dir) => walkFiles(path.join(REPO_ROOT, dir)))
  const findings = []
  let fixedFiles = 0

  for (const absPath of files) {
    let content = fs.readFileSync(absPath, 'utf8')
    const file = relPath(absPath)
    let fileChanged = false
    let needsImport = false

    const matches = [...content.matchAll(DANGEROUS_HTML_PATTERN)]
    // Walk in reverse so earlier replacements don't shift later match indices.
    for (const match of matches.reverse()) {
      const expr = match[1].trim()
      const line = lineNumberAt(content, match.index)

      if (isEscapedJsonLd(expr) || isSanitized(expr)) continue

      const simpleJsonMatch = expr.match(SIMPLE_JSON_STRINGIFY)
      if (simpleJsonMatch) {
        // Unescaped JSON-LD over a simple identifier — safe to auto-fix
        // mechanically (matches the SEO.tsx/Breadcrumbs.tsx pattern).
        if (FIX) {
          const fixedExpr = `${expr}.replace(/</g, '\\\\u003c')`
          content =
            content.slice(0, match.index) +
            match[0].replace(expr, fixedExpr) +
            content.slice(match.index + match[0].length)
          fileChanged = true
        } else {
          findings.push(
            `${file}:${line}  Unescaped JSON-LD dangerouslySetInnerHTML (fixable: run with --fix ` +
              `to append ".replace(/</g, '\\\\u003c')", matching Breadcrumbs.tsx's mitigation).`
          )
        }
        continue
      }

      // Anything else raw: wrap in sanitizeRichText(...).
      if (FIX) {
        const fixedExpr = `sanitizeRichText(${expr})`
        content =
          content.slice(0, match.index) +
          match[0].replace(expr, fixedExpr) +
          content.slice(match.index + match[0].length)
        fileChanged = true
        needsImport = true
      } else {
        findings.push(
          `${file}:${line}  dangerouslySetInnerHTML renders "${expr}" with no sanitization ` +
            `(fixable: run with --fix to wrap it in sanitizeRichText() from lib/sanitize-html.ts).`
        )
      }
    }

    if (fileChanged) {
      if (needsImport && !/\bsanitizeRichText\b.*from/.test(content) && !/import \{ sanitizeRichText \}/.test(content)) {
        content = insertImport(content, computeSanitizeImportSpecifier(absPath, content))
      }
      fs.writeFileSync(absPath, content)
      fixedFiles++
    }
  }

  return { findings, fixedFiles }
}

function main() {
  const cspResult = checkAndFixCsp()
  const htmlResult = checkAndFixDangerousHtml()

  const allFindings = [...cspResult.findings, ...htmlResult.findings]
  const anyFixed = cspResult.fixed || htmlResult.fixedFiles > 0

  if (anyFixed) {
    console.log(
      `check-xss-hardening: applied fixes` +
        (cspResult.fixed ? ' to next.config.js' : '') +
        (htmlResult.fixedFiles > 0 ? ` to ${htmlResult.fixedFiles} file(s)` : '') +
        ' — re-run without --fix (or re-run this check) to confirm clean, then review the diff.'
    )
  }

  if (allFindings.length === 0) {
    console.log('check-xss-hardening: OK')
    return
  }

  console.error(`check-xss-hardening: found ${allFindings.length} issue(s):\n`)
  for (const finding of allFindings) {
    console.error(`  - ${finding}`)
  }
  process.exitCode = 1
}

main()
