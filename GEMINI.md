# Superpowers Active Processing Skills Configuration

<EXTREMELY_IMPORTANT>
You have superpowers installed and active.

**Below is the core operating bootstrap from 'superpowers:using-superpowers'. For all skills, use the dedicated file viewing and activation patterns:**

## The Rule
**Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.
- **Before entering plan mode or writing new features:** If you haven't already brainstormed, invoke `brainstorming` (`.agents/skills/brainstorming/SKILL.md`).
- **When diagnosing or fixing a bug:** Invoke `systematic-debugging` (`.agents/skills/systematic-debugging/SKILL.md`).
- **When implementing new code or logic:** Invoke `test-driven-development` (`.agents/skills/test-driven-development/SKILL.md`).
- **Before claiming any task is done:** Invoke `verification-before-completion` (`.agents/skills/verification-before-completion/SKILL.md`).

Announce "Using [skill] to [purpose]" and follow the skill's instructions.

## Installed Superpowers Skills Directory
All skills are installed in `.agents/skills/` and `.claude/skills/`:
- `using-superpowers`: `.agents/skills/using-superpowers/SKILL.md`
- `brainstorming`: `.agents/skills/brainstorming/SKILL.md`
- `systematic-debugging`: `.agents/skills/systematic-debugging/SKILL.md`
- `test-driven-development`: `.agents/skills/test-driven-development/SKILL.md`
- `writing-plans`: `.agents/skills/writing-plans/SKILL.md`
- `executing-plans`: `.agents/skills/executing-plans/SKILL.md`
- `verification-before-completion`: `.agents/skills/verification-before-completion/SKILL.md`
- `requesting-code-review`: `.agents/skills/requesting-code-review/SKILL.md`
- `receiving-code-review`: `.agents/skills/receiving-code-review/SKILL.md`
- `subagent-driven-development`: `.agents/skills/subagent-driven-development/SKILL.md`
- `dispatching-parallel-agents`: `.agents/skills/dispatching-parallel-agents/SKILL.md`
- `finishing-a-development-branch`: `.agents/skills/finishing-a-development-branch/SKILL.md`
- `using-git-worktrees`: `.agents/skills/using-git-worktrees/SKILL.md`
- `diagnosing-superpowers`: `.agents/skills/diagnosing-superpowers/SKILL.md`
- `writing-skills`: `.agents/skills/writing-skills/SKILL.md`

## Antigravity / Gemini Environment Tool Mapping
When skills call for generic actions, map them to our environment tools:
- **Read / View a file or skill:** `view_file`
- **Edit / Create files:** `edit_file`, `create_file`, `multi_edit_file`
- **Run command / tests / git:** `run_command`
- **App verification:** `lint_applet`, `compile_applet`
- **Task tracking:** Keep a clean markdown checklist in context or in task tracking files and mark items done as each step completes.
</EXTREMELY_IMPORTANT>
