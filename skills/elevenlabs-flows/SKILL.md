---
name: "elevenlabs-flows"
description: "Run multi-step generation flows across speech, image and video."
---

# flows

> **PREREQUISITE:** Read `../elevenlabs-shared/SKILL.md` for auth, global flags, and output formatting. If missing, run `elevenlabs generate-skills` to create it.

```bash
elevenlabs flows <method> [flags]
```

## API Resources


### image

 - `create` — Create Image Generation
 - `get` — Get Image Generation
 - `list` — List Image Generations

### text-to-speech

 - `create` — Create Speech Generation
 - `get` — Get Speech Generation
 - `list` — List Speech Generations

### video

 - `create` — Create Video Generation
 - `get` — Get Video Generation
 - `list` — List Video Generations
## Discovering Commands

**Agents: always prefer `--schema` over `--help`** — `--schema` returns JSON; `--help` returns human prose.

```bash
# Machine-readable surface (use this)
elevenlabs flows --schema
elevenlabs flows <method> --schema

# Human-readable help (for humans)
elevenlabs flows --help
```

