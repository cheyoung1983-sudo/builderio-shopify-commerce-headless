---
name: "elevenlabs-text-to-voice"
description: "Design and generate custom voices from a text prompt."
---

# text-to-voice

> **PREREQUISITE:** Read `../elevenlabs-shared/SKILL.md` for auth, global flags, and output formatting. If missing, run `elevenlabs generate-skills` to create it.

```bash
elevenlabs text-to-voice <method> [flags]
```

## API Resources

 - `create` — Create A New Voice From Voice Preview
 - `create_previews` — Voice design
 - `design` — Design A Voice.
 - `remix` — Remix A Voice.

### preview

 - `stream` — Text To Voice Preview Streaming
## Discovering Commands

**Agents: always prefer `--schema` over `--help`** — `--schema` returns JSON; `--help` returns human prose.

```bash
# Machine-readable surface (use this)
elevenlabs text-to-voice --schema
elevenlabs text-to-voice <method> --schema

# Human-readable help (for humans)
elevenlabs text-to-voice --help
```

