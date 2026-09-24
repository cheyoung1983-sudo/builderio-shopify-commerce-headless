---
name: superpowers-anthropic
description: Meta-skill for the Superpowers software development methodology (brainstorming → design approval → planning → subagent-driven TDD) plus clone/list/port helpers for obra/superpowers and anthropics/skills. Trigger on superpowers, agentic workflow, subagent-driven development, TDD methodology, brainstorm first, install anthropic skills, clone skills repos, port skills, or structured agent software workflows.
---

# Superpowers + Anthropic Skills Meta-Skill

Apply the Superpowers gated methodology to software work and provide on-demand access to the two upstream skill libraries.

## Core Superpowers Workflow (mandatory gates)

When the user is building software or starting non-trivial coding work, follow this sequence. Do not jump to implementation.

1. **Brainstorming** (use before any creative work)
   - Classify the request out loud as Spike / Bounded / Architectural.
   - Discover intent, write back understanding, invite correction.
   - Present design at the right fidelity and obtain explicit approval.
   - Hard-gate: no product code, scaffolding, or implementation skills until the selected path’s approval is obtained.
   - Spike = cheap throwaway probe. Bounded = short in-chat design + yes. Architectural = written spec then hand off to writing-plans.
   - Save approved design (DESIGN.md or docs/design.md) when architectural.

2. **Using Git Worktrees** (after design approval, when git is in use)
   - Create isolated workspace on a new branch, run setup, confirm clean test baseline.

3. **Writing Plans**
   - Break approved design into 2–5-minute tasks.
   - Every task lists exact file paths, complete expected code/change, and concrete verification steps.
   - Enforce red/green TDD, YAGNI, DRY.
   - Save plan (PLAN.md or docs/plan.md).

4. **Execution**
   - Prefer subagent-driven-development (fresh context + two-stage review per task) when subagents are available.
   - Otherwise use executing-plans (inline sequential + final review).
   - Always apply test-driven-development: RED (failing test first) → GREEN (minimal code) → REFACTOR. Delete any code written before its tests.

5. **Code Review & Finishing**
   - Review against the plan between tasks or at milestones; critical issues block progress.
   - On completion: verify full test suite, present merge/PR/keep/discard options, clean up worktrees.

Check for relevant skills before every task. These gates are mandatory.

## Meta Capabilities

### Clone / refresh the upstream repos
```bash
bash scripts/clone-repos.sh          # shallow clone or update
bash scripts/clone-repos.sh --force  # wipe and re-clone
```
Cache location: `/home/workdir/.grok/skills-cache/`
- superpowers/ — methodology skills + plugins + harness adapters
- anthropic-skills/ — example skills + Agent Skills spec + template

### List available skills
```bash
bash scripts/list-skills.sh          # both
bash scripts/list-skills.sh superpowers
bash scripts/list-skills.sh anthropic
```

### Port a skill into Grok format
1. Ensure cache is populated (clone if needed).
2. Read the source SKILL.md under the cache.
3. Initialize a Grok skill if required:  
   `bash /root/.grok/skills/skill-creator/scripts/init-skill.sh <name> /home/workdir/.grok/skills`
4. Adapt to Grok rules (plain-scalar description, no `: ` or `<>`, imperative body, long material → references/).
5. Validate:  
   `bash /root/.grok/skills/skill-creator/scripts/validate-skill.sh /home/workdir/.grok/skills/<name>`
6. Prefer Grok’s bundled docx/pdf/pptx/xlsx unless the Anthropic version has a unique production pattern worth extracting.

### Superpowers plugins & other harnesses
After cloning, consult `superpowers/README.md`, `docs/`, and the various `.*-plugin` directories for install instructions (Claude Code, Cursor, Codex, Devin, OpenCode, Pi, Hermes, Muse, Grok Build CLI, etc.).

## Resource Map
- scripts/clone-repos.sh — maintain the skills cache
- scripts/list-skills.sh — enumerate upstream skills
- references/superpowers-workflow.md — detailed skill list, hard rules, anti-patterns
- references/anthropic-skills-index.md — Anthropic skill inventory + license notes
- Live cache after clone: /home/workdir/.grok/skills-cache/{superpowers,anthropic-skills}

## Constraints
- Encode only the Superpowers process gates and the install/port helpers. Do not restate generic coding or TDD knowledge the model already has.
- Keep this file concise; load references on demand.
- Never embed full upstream repos inside the skill directory — always use the cache.
- Respect upstream licenses (Superpowers MIT; Anthropic examples mostly Apache 2.0; document skills source-available).
