#!/usr/bin/env node

/**
 * Recognizes and fixes ESLint errors across the lint-scoped directories.
 *
 * Two passes:
 *   1. `eslint --fix` for whatever ESLint's own rule definitions can
 *      mechanically and safely rewrite (formatting, import order, etc.).
 *   2. Parse whatever remains and group it by rule, since rules like the
 *      react-hooks "React Compiler" set (set-state-in-effect, refs,
 *      immutability, exhaustive-deps, use-memo, preserve-manual-memoization)
 *      catch real correctness bugs but have no safe mechanical fix — each
 *      one requires understanding what the effect/ref is actually doing.
 *      Blindly auto-rewriting that logic in state-carrying code (e.g. cart,
 *      checkout) risks silently changing behavior, so this script reports
 *      them for manual triage instead of guessing at a rewrite.
 *
 * Usage: node scripts/fix-lint-issues.js [dir...]
 *   (defaults to the same directories `npm run lint` covers)
 */

const { execFileSync } = require('node:child_process')

const DEFAULT_DIRS = ['blocks', 'components', 'config', 'context', 'lib', 'pages', 'services']

// Short, rule-specific guidance for the manual fix each rule actually
// requires — not a mechanical transform, but enough context to triage fast.
const RULE_GUIDANCE = {
  'react-hooks/set-state-in-effect':
    'Derive the value during render (directly, or via useMemo) instead of setting state from inside an effect; keep the effect only for synchronizing with something external.',
  'react-hooks/refs':
    "Don't read or write ref.current during render — move that access into an effect or an event handler.",
  'react-hooks/exhaustive-deps':
    'Add the missing dependency, or restructure (useCallback/useMemo, or move the value out of the effect) so it genuinely does not need to be a dependency.',
  'react-hooks/immutability':
    'Avoid mutating state/props/refs in place — build and set a new value instead.',
  'react-hooks/preserve-manual-memoization':
    'Restore the useMemo/useCallback boundary the code relied on for a stable reference.',
  'react-hooks/use-memo':
    'Wrap the flagged computation in useMemo so it is memoized the way the rule expects.',
}

// On Windows, npx is a .cmd shim that Node's execFileSync can only launch
// via a shell (it doesn't go through CreateProcess's file-association
// lookup). Dirs are fixed constants, never user input, so building a
// single command string for shell:true is safe here — and avoids
// Node's DEP0190 warning, which only fires for the shell:true + args-array
// combination.
function runAutofix(dirs) {
  try {
    execFileSync(`npx eslint ${dirs.join(' ')} --fix`, { shell: true, stdio: 'inherit' })
  } catch {
    // eslint exits non-zero whenever errors remain after fixing — expected.
  }
}

function getRemainingIssues(dirs) {
  let stdout
  try {
    stdout = execFileSync(`npx eslint ${dirs.join(' ')} --format json`, {
      shell: true,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
    })
  } catch (err) {
    stdout = err.stdout
    if (!stdout) throw err
  }

  const results = JSON.parse(stdout)
  const byRule = new Map()

  for (const file of results) {
    for (const message of file.messages) {
      if (message.severity !== 2) continue // errors only
      const ruleId = message.ruleId || '(no rule id)'
      if (!byRule.has(ruleId)) byRule.set(ruleId, [])
      byRule.get(ruleId).push({
        file: file.filePath,
        line: message.line,
        message: message.message.split('\n')[0],
      })
    }
  }

  return byRule
}

function main() {
  const dirs = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_DIRS

  console.log(`Running ESLint --fix across: ${dirs.join(', ')}\n`)
  runAutofix(dirs)

  const byRule = getRemainingIssues(dirs)

  if (byRule.size === 0) {
    console.log('\nfix-lint-issues: no remaining errors — everything auto-fixable was fixed.')
    return
  }

  console.log('\nfix-lint-issues: the following require manual review (not safe to auto-fix):\n')
  for (const [ruleId, issues] of byRule) {
    console.log(`${ruleId} (${issues.length})`)
    console.log(`  ${RULE_GUIDANCE[ruleId] || 'Review the ESLint message for the required fix.'}`)
    for (const issue of issues) {
      console.log(`  - ${issue.file}:${issue.line}  ${issue.message}`)
    }
    console.log('')
  }

  process.exitCode = 1
}

main()
