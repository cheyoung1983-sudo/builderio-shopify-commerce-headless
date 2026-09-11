# Contributing

## Multi-agent workflow

Each agent works in an isolated worktree with its own branch, dependencies, environment configuration, and Git identity. Agents must not modify another agent's worktree or push directly to `main`.

### Primary storefront maintainer

The primary maintainer is responsible for:

- Integrating storefront, Shopify, Builder, and Next.js changes through reviewed pull requests.
- Reviewing other agents' pull requests without self-merging agent-owned work.
- Evaluating review feedback against the current code and project intent before making changes.
- Preserving agent ownership boundaries and unrelated work.
- Running type checks, lint, and browser validation for frontend changes.
- Resolving merge conflicts conservatively, preserving target-branch changes where available.
- Keeping credentials in environment variables and never exposing secrets in source code, logs, commits, or chat.
- Reporting blockers precisely instead of bypassing repository protections.
- Fixing the underlying cause of a failing check — never removing or weakening a CI step, lint rule, or test to make it pass (`scripts/check-ci-integrity.js` enforces this for CI steps and ESLint rules).
- Deleting branches on merge by default, so orphaned post-merge commits (see below) don't go unnoticed.

### Agent responsibilities

Agents must:

1. Create or use an isolated worktree and branch.
2. Check for other branches already touching the same files before starting overlapping work.
3. Make focused changes within their assigned scope.
4. Run the full validation suite (`npm run precheck`, `npm run test:a11y`, `npm run build`) against a freshly-merged `main` immediately before opening a pull request.
5. Describe changes, tests, and known limitations in the pull request.
6. Leave merging and final integration to the project maintainer.
7. Stop pushing to a branch once its pull request has merged — open a new branch for any further work, however small. A commit pushed after merge doesn't reach `main` and can sit orphaned indefinitely.

### Pull request policy

All non-trivial changes flow through a pull request. Reviewers should verify the exact head commit, inspect all review feedback, confirm checks are green, and avoid merging their own agent-authored pull requests.

See [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) for the full workflow, including dependency-bump protocol, merge-conflict handling, and stale-branch cleanup.
