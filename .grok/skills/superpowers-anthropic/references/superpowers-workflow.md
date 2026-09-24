# Superpowers Core Workflow — Expanded Reference

Source: /home/workdir/.grok/skills-cache/superpowers (MIT License)
Last known HEAD: Release v6.4.1

## Exact Skill List (skills/)

Collaboration / Process
- brainstorming — MUST use before any creative work. Classifies Spike / Bounded / Architectural. Hard-gate: no implementation until design approved.
- writing-plans — Produces bite-sized tasks with exact paths, full expected code, verification steps.
- subagent-driven-development — Preferred execution: fresh subagent + two-stage review per task.
- executing-plans — Cheaper inline sequential execution + final review.
- dispatching-parallel-agents — For independent concurrent tasks.
- using-git-worktrees — Isolated branch/worktree after design approval.
- finishing-a-development-branch — Verify tests → present merge/PR/keep/discard → clean up.
- requesting-code-review / receiving-code-review — Structured review against the plan.
- using-superpowers — Bootstrap skill that activates the rest.

Testing & Quality
- test-driven-development — Strict RED → GREEN → REFACTOR. Delete pre-test code.
- verification-before-completion — Confirm it actually works.
- systematic-debugging — 4-phase root-cause process.
- diagnosing-superpowers — Analyze a session transcript for skill-firing issues.

Meta
- writing-skills — Guidance for authoring new Superpowers-compatible skills.

## Key Hard Rules from brainstorming

- Classify every request as Spike / Bounded / Architectural and say the classification out loud.
- Spike: cheap probe, throwaway code, no design doc.
- Bounded: short in-chat design + explicit approval (hard gate).
- Architectural: full written spec + writing-plans handoff.
- Never implement (or call an implementation skill) until the selected path’s approval gate is passed.
- Approval of an idea is not approval of later artifacts. Resume at the earliest incomplete stage.

## Anti-Patterns

- Jumping to code before the design gate.
- Vague plan tasks missing paths / expected code / verification.
- Writing implementation before a failing test.
- Skipping review gates.
- Treating “too simple” work as exempt from approval.
