const { findOverlaps } = require('../scripts/pr-overlap-report.cjs')

describe('pull request overlap report', () => {
  test('reports files shared with another open PR targeting main', () => {
    const current = { number: 10, files: ['pages/account.tsx', 'lib/auth.ts'] }
    const others = [
      {
        number: 11,
        title: 'Related account work',
        state: 'open',
        base: { ref: 'main' },
        files: ['pages/account.tsx', 'pages/profile.tsx'],
      },
    ]

    expect(findOverlaps(current, others)).toEqual([
      {
        number: 11,
        title: 'Related account work',
        head: undefined,
        files: ['pages/account.tsx'],
      },
    ])
  })

  test('ignores the current PR, closed PRs, and PRs targeting another base', () => {
    const current = { number: 10, files: ['pages/account.tsx'] }
    const others = [
      { number: 10, state: 'open', base: { ref: 'main' }, files: ['pages/account.tsx'] },
      { number: 12, state: 'closed', base: { ref: 'main' }, files: ['pages/account.tsx'] },
      { number: 13, state: 'open', base: { ref: 'release' }, files: ['pages/account.tsx'] },
    ]

    expect(findOverlaps(current, others)).toEqual([])
  })

  test('omits other open PRs that do not share changed paths', () => {
    const current = { number: 10, files: ['pages/account.tsx'] }
    const others = [
      { number: 14, state: 'open', base: { ref: 'main' }, files: ['lib/cart.ts'] },
    ]

    expect(findOverlaps(current, others)).toEqual([])
  })
})
