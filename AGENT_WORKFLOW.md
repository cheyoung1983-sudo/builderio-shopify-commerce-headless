# Agent Workflow Guide

This repository uses isolated, pull-request-based collaboration for multi-agent development.

## Before changing code

1. Confirm the task scope and identify the files involved.
2. Work in an isolated worktree with a dedicated branch.
3. Use a distinct Git identity for the agent or session.
4. Load the repository instructions in `AGENTS.md`, `CLAUDE.md`, and this guide.
5. Inspect the current branch, working tree, and target pull request before editing.
6. Preserve unrelated changes, files, and agent worktrees.
7. Check for other recent or open branches touching the same files before starting (`git log --all --oneline -- <path>`, `gh pr list`). Multiple branches independently modifying the same file in overlapping, contradictory ways has already happened in this repo (`pages/[[...path]].tsx`, Shopify config). If another branch is already working in the same area, coordinate with it or wait rather than starting parallel work that will conflict.

Do not switch or rewrite another agent's branch. Do not copy changes between worktrees without explicit ownership and review.

## Implementing a task

- Make the smallest focused change that satisfies the request.
- Follow existing framework and import conventions.
- Keep secrets in environment variables; never place credentials in source, logs, commits, or chat.
- Avoid unrelated refactors, speculative abstractions, and compatibility hacks.
- For frontend work, start or use the development server and verify the golden path and relevant edge cases in the browser.
- Bumping a shared dependency (e.g. `eslint`, `eslint-config-next`, `next`) must check its directly-coupled peer dependencies for compatible versions in the *same* change, not as a follow-up — bumping `eslint-config-next` to a version requiring `eslint@9` without also bumping `eslint` broke `main`'s CI and `npm run build` for hours before anyone caught it. Run the full validation suite (below), not just typecheck/lint, before pushing a dependency bump.

## Fix the cause, don't remove the check

If a check is failing — a CI step, a lint rule, a test — fix the underlying issue. Removing or weakening the check itself is not a fix, even if it makes the pipeline green. Two branches in this repo did exactly this in one session: one stripped 6 of 8 steps out of `.github/workflows/ci.yml`, another wholesale-disabled all 10 `react-hooks` lint rules in `eslint.config.mjs` — both to silence failures the real fix (Node/ESLint version alignment, 24 genuine react-hooks bugs) was already available for. `scripts/check-ci-integrity.js` (wired into `precheck`, CI, and the pre-commit hook) now blocks both patterns automatically, but don't rely on tooling to catch what shouldn't be attempted in the first place.

## Validation

Run the full validation suite before every push — not a subset:

```bash
npm run precheck   # node version consistency, CI/config integrity, typecheck, lint, secret scan
npm run test:a11y
npm run build
```

Use the repository package manager and scripts when they differ from these examples. Review the final diff and confirm that no unrelated files are included.

**Immediately before opening a pull request**, merge or rebase the latest `main` into your branch and re-run the full validation suite above. Several breakages this session traced back to a branch that had been validated against a `main` that had since drifted — validating against stale state doesn't catch what the merge itself introduces.

## Pull requests

1. Commit work only to the agent's branch.
2. Open or update a pull request targeting `main`.
3. Include a concise summary, validation results, and known limitations.
4. Keep the branch head stable while review is in progress.
5. **Once your pull request merges, stop pushing to that branch.** A commit was pushed to a branch in this repo after its own PR had already merged; it silently never reached `main` and sat orphaned until a branch audit happened to find it. Open a new branch for any further work, no matter how small.
6. Do not merge an agent-authored pull request yourself.
7. The maintainer reviews the exact head commit, all conversation comments, submitted reviews, inline threads, checks, and mergeability before integration.
8. Branches are deleted on merge by default — enable "Automatically delete head branches" in repository settings, or pass `--delete-branch` when merging via `gh pr merge`. Do not leave a merged branch's ref around on agent discretion; inconsistent deletion is exactly what let the orphaned-commit case in point 5 go unnoticed for as long as it did.

Reviewers should evaluate feedback against the current code and original task. Implement valid bugs, security issues, failing checks, and clearly actionable correctness concerns. Skip stale, incorrect, cosmetic, or scope-expanding requests with a brief rationale.

## Merge conflicts

- Re-check the target branch and exact pull request head before resolving conflicts.
- Preserve target-branch changes when both sides are valid.
- For lockfiles, prefer the target branch version when available, then reinstall with the repository package manager.
- If a conflict is modify/delete and the target side is unavailable, stop and report the ambiguity rather than silently deleting work.
- Run the full validation suite (see Validation) after conflict resolution — not just typecheck and lint.

## Stale branches

Run `node scripts/check-stale-branches.js` to list remote branches with zero commits ahead of `main` — these are already fully merged and safe to delete outright, no review needed. Five of seven branches audited in one session were exactly this: dead weight nobody had cleaned up. `.github/workflows/stale-branches.yml` runs this weekly and posts the report to the Actions run summary so it doesn't require manual archaeology.

## Handoff

Every handoff should state:

- What changed.
- Which files were touched.
- What checks and browser flows were run.
- Any unresolved blocker or required environment variable.
- The branch and pull request containing the work.

The maintainer owns final integration, merge decisions, and coordination between agents.
