# Anthropic Skills Repository — Index

Source: /home/workdir/.grok/skills-cache/anthropic-skills
Last known HEAD: 34040c9 (Update claude-api skill...)
Licenses: example skills mostly Apache 2.0; document skills are source-available (see THIRD_PARTY_NOTICES.md).

## Layout
- skills/ — individual skill folders (each with SKILL.md)
- spec/ — Agent Skills specification
- template/ — starter skill template

## Exact Skill List (skills/)

Document (source-available, production-derived)
- docx, pdf, pptx, xlsx
  Note: Grok already ships mature equivalents. Prefer bundled Grok skills unless extracting a unique production pattern.

Creative & Design
- algorithmic-art, canvas-design, frontend-design, theme-factory, brand-guidelines, slack-gif-creator

Development & Technical
- mcp-builder, webapp-testing, web-artifacts-builder, claude-api

Enterprise & Communication
- internal-comms, doc-coauthoring, academy-guide, discernment-nudge

Meta
- skill-creator

## Agent Skills Spec
See cache path: anthropic-skills/spec/agent-skills-spec.md
Defines frontmatter, progressive disclosure, resource layout. Grok’s skill-creator already aligns with the core of this standard.

## Quick access after clone
```bash
bash /home/workdir/.grok/skills/superpowers-anthropic/scripts/list-skills.sh anthropic
ls /home/workdir/.grok/skills-cache/anthropic-skills/skills/
```
