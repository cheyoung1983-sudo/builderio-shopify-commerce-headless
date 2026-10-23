# Dependency rules (read before exporting from AI Studio / builders)

- npm only. Node 24.x, npm 11 (`packageManager` + `engines` in package.json, `engine-strict` in .npmrc).
- All direct dependencies are pinned to exact versions (`save-exact=true`).
- Never commit `bun.lock`, `yarn.lock`, `pnpm-lock.yaml` or `superpowers/` (gitignored).
- `.githooks/*` and `scripts/precheck.mjs` must stay executable (mode 100755).

If you change package.json, run `npm install` (not bun/yarn) so package-lock.json updates too.

CI runs `node scripts/check-repo-hygiene.cjs` first and fails with a fix hint if
any of the above drifts. To repair:

- locally: `npm run fix:repo`, then commit, or
- GitHub: Actions → "Repair lockfile" → Run workflow (opens a PR).

`braces` (Dependabot high, no patched release exists) is only reachable through
dev tooling (jest, eslint, stylelint); production installs are clean
(`npm audit --omit=dev` runs in CI).
