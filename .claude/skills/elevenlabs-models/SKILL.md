---
name: "elevenlabs-models"
description: "Access the different models of the platform."
---

# models

> **PREREQUISITE:** Read `../elevenlabs-shared/SKILL.md` for auth, global flags, and output formatting. If missing, run `elevenlabs generate-skills` to create it.

```bash
elevenlabs models <method> [flags]
```

## API Resources

 - `list` — List models
## Discovering Commands

**Agents: always prefer `--schema` over `--help`** — `--schema` returns JSON; `--help` returns human prose.

```bash
# Machine-readable surface (use this)
elevenlabs models --schema
elevenlabs models <method> --schema

# Human-readable help (for humans)
elevenlabs models --help
```

