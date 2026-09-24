---
name: "elevenlabs-assets"
description: "Manage uploaded media assets."
---

# assets

> **PREREQUISITE:** Read `../elevenlabs-shared/SKILL.md` for auth, global flags, and output formatting. If missing, run `elevenlabs generate-skills` to create it.

```bash
elevenlabs assets <method> [flags]
```

## API Resources

 - `create` — Upload Asset
 - `delete` — Delete Asset
 - `get` — Get Asset
 - `list` — List Assets
## Discovering Commands

**Agents: always prefer `--schema` over `--help`** — `--schema` returns JSON; `--help` returns human prose.

```bash
# Machine-readable surface (use this)
elevenlabs assets --schema
elevenlabs assets <method> --schema

# Human-readable help (for humans)
elevenlabs assets --help
```

