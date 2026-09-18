<!--
See AGENT_WORKFLOW.md's "Pull requests" and "Handoff" sections for the full
policy this template is derived from. Fill in every section — "N/A" is a
valid answer, silence is not.
-->

## Summary

<!-- What changed and why. Link the issue/task this addresses if one exists. -->

## Files touched

<!-- List the files/areas changed. Call out anything outside the stated scope. -->

## Validation

Ran the full validation suite against a freshly-merged `main` immediately before opening this PR (AGENT_WORKFLOW.md → Validation):

- [ ] `npm run precheck` (node version consistency, CI/config integrity, dependency health, typecheck, lint, secret scan, customer-account-auth-health)
- [ ] `npm run test:a11y`
- [ ] `npm run build`
- [ ] Browser-verified the golden path and relevant edge cases (frontend/UI changes only — state N/A otherwise)

<!-- Paste any relevant script output, screenshots, or a short description of what you exercised manually. -->

## Known limitations / unresolved blockers

<!-- Anything left incomplete, any required env var not set in this environment, any check that couldn't run and why. "None" if truly none. -->

## Pre-submission checklist

- [ ] Checked for other open/recent branches touching the same files (`git log --all --oneline -- <path>`, `gh pr list`) before starting
- [ ] Change is the smallest focused diff that satisfies the task — no unrelated refactors or speculative abstractions
- [ ] No secrets, credentials, or hardcoded fallback values for sensitive env vars introduced
- [ ] Not self-merging this PR if it's agent-authored (per CONTRIBUTING.md)
