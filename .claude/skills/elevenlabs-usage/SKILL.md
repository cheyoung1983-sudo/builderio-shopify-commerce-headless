---
name: "elevenlabs-usage"
description: "Report character and credit usage for your workspace."
---

# usage

> **PREREQUISITE:** Read `../elevenlabs-shared/SKILL.md` for auth, global flags, and output formatting. If missing, run `elevenlabs generate-skills` to create it.

```bash
elevenlabs usage <method> [flags]
```

## API Resources

 - `get` — Get character usage metrics
## Discovering Commands

**Agents: always prefer `--schema` over `--help`** — `--schema` returns JSON; `--help` returns human prose.

```bash
# Machine-readable surface (use this)
elevenlabs usage --schema
elevenlabs usage <method> --schema

# Human-readable help (for humans)
elevenlabs usage --help
```

