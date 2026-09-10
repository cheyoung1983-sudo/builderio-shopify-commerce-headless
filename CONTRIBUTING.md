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

### Agent responsibilities

Agents must:

1. Create or use an isolated worktree and branch.
2. Make focused changes within their assigned scope.
3. Run relevant validation before opening a pull request.
4. Describe changes, tests, and known limitations in the pull request.
5. Leave merging and final integration to the project maintainer.

### Pull request policy

All non-trivial changes flow through a pull request. Reviewers should verify the exact head commit, inspect all review feedback, confirm checks are green, and avoid merging their own agent-authored pull requests.
