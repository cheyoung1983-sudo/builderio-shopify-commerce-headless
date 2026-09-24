---
name: "elevenlabs-history"
description: "Accesses your speech history."
---

# history

> **PREREQUISITE:** Read `../elevenlabs-shared/SKILL.md` for auth, global flags, and output formatting. If missing, run `elevenlabs generate-skills` to create it.

```bash
elevenlabs history <method> [flags]
```

## API Resources

 - `delete` — Delete history item
 - `download` — Download history items
 - `get` — Get history item
 - `get_audio` — Get audio from history item
 - `list` — Get generated items
## Discovering Commands

**Agents: always prefer `--schema` over `--help`** — `--schema` returns JSON; `--help` returns human prose.

```bash
# Machine-readable surface (use this)
elevenlabs history --schema
elevenlabs history <method> --schema

# Human-readable help (for humans)
elevenlabs history --help
```

