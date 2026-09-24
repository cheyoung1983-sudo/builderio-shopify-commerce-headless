<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Superpowers Active Processing Skills

<EXTREMELY_IMPORTANT>
Superpowers are installed in the project (`.agents/skills/` and `.claude/skills/`).

## The Core Rule
Invoke relevant or requested skills BEFORE taking actions:
- **Creative / feature requests / building components**: Invoke `brainstorming` (`.agents/skills/brainstorming/SKILL.md`)
- **Bugs / test failures / unexpected behavior**: Invoke `systematic-debugging` (`.agents/skills/systematic-debugging/SKILL.md`)
- **Implementation & code generation**: Invoke `test-driven-development` (`.agents/skills/test-driven-development/SKILL.md`)
- **Before claiming work complete or fixed**: Invoke `verification-before-completion` (`.agents/skills/verification-before-completion/SKILL.md`)
- **Multi-step planning & execution**: Invoke `writing-plans` (`.agents/skills/writing-plans/SKILL.md`) and `executing-plans` (`.agents/skills/executing-plans/SKILL.md`)

When a skill applies, announce "Using [skill] to [purpose]" and follow its procedures.
</EXTREMELY_IMPORTANT>
