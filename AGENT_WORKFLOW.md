# Agent Workflow Guide

This repository uses isolated, pull-request-based collaboration for multi-agent development.

## Before changing code

1. Confirm the task scope and identify the files involved.
2. Work in an isolated worktree with a dedicated branch.
3. Use a distinct Git identity for the agent or session.
4. Load the repository instructions in `AGENTS.md`, `CLAUDE.md`, and this guide.
5. Inspect the current branch, working tree, and target pull request before editing.
6. Preserve unrelated changes, files, and agent worktrees.

Do not switch or rewrite another agent's branch. Do not copy changes between worktrees without explicit ownership and review.

## Implementing a task

- Make the smallest focused change that satisfies the request.
- Follow existing framework and import conventions.
- Keep secrets in environment variables; never place credentials in source, logs, commits, or chat.
- Avoid unrelated refactors, speculative abstractions, and compatibility hacks.
- For frontend work, start or use the development server and verify the golden path and relevant edge cases in the browser.

## Validation

Run the checks relevant to the change, normally:

```bash
npm run typecheck
npm run lint -- --quiet
```

Use the repository package manager and scripts when they differ from these examples. Review the final diff and confirm that no unrelated files are included.

## Pull requests

1. Commit work only to the agent's branch.
2. Open or update a pull request targeting `main`.
3. Include a concise summary, validation results, and known limitations.
4. Keep the branch head stable while review is in progress.
5. Do not merge an agent-authored pull request yourself.
6. The maintainer reviews the exact head commit, all conversation comments, submitted reviews, inline threads, checks, and mergeability before integration.

Reviewers should evaluate feedback against the current code and original task. Implement valid bugs, security issues, failing checks, and clearly actionable correctness concerns. Skip stale, incorrect, cosmetic, or scope-expanding requests with a brief rationale.

## Merge conflicts

- Re-check the target branch and exact pull request head before resolving conflicts.
- Preserve target-branch changes when both sides are valid.
- For lockfiles, prefer the target branch version when available, then reinstall with the repository package manager.
- If a conflict is modify/delete and the target side is unavailable, stop and report the ambiguity rather than silently deleting work.
- Run typecheck and lint after conflict resolution.

## Handoff

Every handoff should state:

- What changed.
- Which files were touched.
- What checks and browser flows were run.
- Any unresolved blocker or required environment variable.
- The branch and pull request containing the work.

The maintainer owns final integration, merge decisions, and coordination between agents.
