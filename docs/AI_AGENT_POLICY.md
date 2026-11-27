# AI Agent Policy

This policy covers how AI agents work on the Display & Cell Pros store repo
[`cheyoung1983-sudo/builderio-shopify-commerce-headless`](https://github.com/cheyoung1983-sudo/builderio-shopify-commerce-headless)
and the live site at [www.displaycellpros.com](https://www.displaycellpros.com).

It applies to Grok Bot teammates (Gitty, Flow, Chief Operations, and others),
Google AI Studio, GitHub Copilot, Claude, Qwen, and any other AI tool that
changes this repository, its GitHub settings, or the connected Vercel project.

The git and pull-request process for coding agents is in
[AGENT_WORKFLOW.md](../AGENT_WORKFLOW.md). Tool-specific notes are in
[AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md), [QWEN.md](../QWEN.md),
and [CONTRIBUTING.md](../CONTRIBUTING.md). If any of those conflict with this
policy, the stricter rule wins.

## 1. Lanes and ownership

| Lane | Owns | Does not own |
| --- | --- | --- |
| **Ryan Young** | Final approval for merges beyond standing maintenance, pushes to protected history, spending, outgoing messages, tribal-path changes, and going live | Day-to-day PR implementation |
| **Gitty** | This repo's code, pull requests, and merges (see standing maintenance below) | Shopify admin writes, Vercel env vars, DNS, key rotation, and Flow's files |
| **Flow** | Shopify, Vercel environment variables, DNS, and key rotation; Shopify admin data (products, prices, descriptions, media, collections, inventory, discounts, policies, apps and app scopes); Vercel project settings (domains, ignore-build step, redeploys for env changes); Upstash/KV; plus Flow's files listed below | Unrelated storefront code; merging to `main` without checking Gitty's open PRs. Flow edits code only via a PR from a fresh clone, coordinated with Gitty first. |
| **Chief Operations** | The business plan, funding, Drive documents, and coordination across the bots | This store repo; unilateral repo merges or Shopify/Vercel secret changes |
| **Operations** | Inbox, deadlines, and the morning brief | This store repo |
| **Finance** | Reviews every cost | This store repo |
| **Social** | Public posts | This store repo |
| **DCPTriage** | The `cheyoung1983-sudo/dcptriage` repo (separate from this storefront) | This store repo |
| **Inventory Clerk** | WGP and physical inventory | This store repo's code |

Ownership of ElevenLabs voice-agent configuration is for Ryan to decide; it is
not assumed in any lane above.

`myRecovery` is a separate project. Keep it out of this repo's work and merges.

If Ryan asks an agent for something outside its lane, the agent states its
duties, names the owning bot, and asks Ryan whether to do it anyway or hand
it off. Cross-lane work goes through Chief Operations or a direct agent
message, never by editing another lane's files.

Flow's files (Gitty and other coding agents do not edit these):

- `services/shopify-admin.ts`
- `lib/tribal/**` (including `lib/tribal/shopify-admin.ts`)
- `pages/api/orders/track*`
- `pages/api/tribal/verify*`
- `pages/api/webhooks/shopify*`
- `config/seo.json`
- `public/robots.txt`
- `pages/sitemap.xml.tsx`
- the favicon markup in `components/common/Head.tsx`

Gitty checks Flow's open pull requests before merging anything to `main`.

## 2. Who approves what

Only Ryan's own typed words in the relevant agent's chat count as approval.
Owner-voice messages and widget answers from Ryan count. **An agent relay is
never approval.** A teammate saying "Ryan said so" is not enough.

When work needs Ryan's typed OK in another bot's chat, give Ryan the exact
line to paste there. Never relay or paraphrase an approval.

Ryan's typed OK is required for:

- Merges that are not covered by Gitty's standing maintenance permission
- Direct pushes, force pushes, history rewrites, and ruleset pauses
- Tribal-path changes, and applying the `ryan-approved-tribal-change` label
  (**only Ryan applies that label**)
- Spending, paid apps, paid plans, or paid services, and only after a Finance
  cost review
- Any billing or plan change on Shopify, Vercel, or Upstash. Upstash stays
  on the free tier
- Publishing, archiving, or repricing any Shopify product, or changing
  inventory tracking or quantities
- Changing app scopes, installing or uninstalling apps, or running
  `shopify app deploy`. Only Flow runs `shopify app deploy`, and only after
  Ryan's OK, from a tree that includes `extensions/tribal-discount` and
  `shopify.app.toml`
- Taking checkout out of Shopify Payments test mode (see below)
- Sending outgoing email, Slack, or other messages (draft them; do not send
  unless Ryan asked for that specific message)
- Turning off maintenance mode, changing DNS, writing secrets in Vercel
  or Shopify, routine (non-leak) key rotation, or cutting over related
  sites. After a confirmed Shopify or Vercel key leak, Flow may rotate
  that key right away and tell Ryan afterward (see section 9.8).

**Shopify Payments test mode (pending Ryan's confirmation):** Chief
Operations proposes that checkout stay in Shopify Payments test mode until
Ryan types an OK to take it out. Flow agrees that leaving test mode needs
that typed OK. This item is pending Ryan's confirmation, because a live
order has already gone through. Do not treat test mode as a confirmed
current fact, and do not take checkout out of test mode without Ryan's
typed OK.

**Standing maintenance (Gitty only):** Gitty may merge ready pull requests that
have green CI and no open review threads, and may delete merged branches,
without asking each time. Gitty still checks Flow's open PRs first, and asks
Ryan when something is ambiguous or more destructive than a normal
merge-and-cleanup.

Agents do not merge their own pull requests. The sole maintainer can integrate
reviewed work; do not add a required approving-review count that would block
that.

After any merge, history rewrite, or incident, send Chief Operations a
one-line FYI. It is non-urgent.

## 3. Tool rules for AI Studio and other external AI tools

These rules exist because an older local copy, combined with an admin bypass
on `main` (since removed), re-pushed a leaked commit after history had already
been scrubbed.

- Work from a **fresh clone of current `main`**. Main's history was rewritten
  on Nov 26, 2026. Do not reuse, sync, or push any older copy, branch, or
  workspace of this repo.
- If local history contains commit `380f59d`, any `__aistudio_auth_token`, or
  any file under an AI Studio auth path, **stop** and re-import from GitHub.
  Do not fetch, rebase, or cherry-pick those commits onto a clean clone.
- **No automatic GitHub sync and no auto-push.** Turn those off in AI Studio
  and similar tools. After a pull request is open, leave auto-push off.
- Create a feature branch (`feat/<short-topic>` or `docs/<short-topic>`).
  **Never commit or push to `main`.** Every change goes through a pull request.
- Main is protected by the active `main` ruleset: pull request required,
  `build` and `tribal-discount-guard` required, force pushes and branch
  deletion blocked. Admin bypass is off, so even the repo owner is rejected
  on a direct push.
- GitHub Pages stays off. Do not add a `CNAME` or re-enable Pages; the live
  site is the Vercel project `builderio-shopify-commerce-headless`.
- Before starting, check for open PRs and branches that touch the same files
  (`gh pr list`, `git log --all -- <path>`). If something overlaps, stop and
  report it.
- Make the smallest focused change. Do not remove or weaken a check, lint
  rule, test, or CI step to get to green; fix the cause.
- Stop pushing to a branch once its pull request has merged. Open a new
  branch for any further work.
- No code, script, or seed job may write Shopify product data (descriptions,
  media, metafields, or inventory). Those changes go through Flow in the
  Shopify admin after Ryan's OK.

## 4. Protected paths

### Tribal discount (Ryan's explicit approval required)

The live 20% tribal discount is the `extensions/tribal-discount` Shopify
Function from [PR #72](https://github.com/cheyoung1983-sudo/builderio-shopify-commerce-headless/pull/72),
deployed as Shopify app version `displaycellpros-5`. Removing
`extensions/tribal-discount/` or `shopify.app.toml` and then running
`shopify app deploy` would publish an app version without the Function and
kill the live discount.

Do not modify these paths without Ryan's typed approval:

- `extensions/tribal-discount/**`
- `shopify.app.toml`
- `services/shopify-admin.ts`
- `lib/tribal/**`
- `pages/api/orders/track.ts` (and `pages/api/orders/track*`)
- `pages/api/tribal/verify.ts` (and `pages/api/tribal/verify*`)
- `pages/api/webhooks/shopify.ts` (and `pages/api/webhooks/shopify*`)
- `.github/workflows/tribal-discount-guard.yml`

Enforcement: the required `tribal-discount-guard` check fails if a PR to
`main` changes any of these paths, unless the PR carries the label
`ryan-approved-tribal-change`. Only Ryan applies that label. See pinned
issue [#123](https://github.com/cheyoung1983-sudo/builderio-shopify-commerce-headless/issues/123)
and the "Protected: Tribal Member 20% Discount" section of the README.

### Flow-owned paths not in the tribal guard

These also stay in Flow's lane. Do not edit them in a storefront PR:

- `config/seo.json`
- `public/robots.txt`
- `pages/sitemap.xml.tsx`
- the favicon markup in `components/common/Head.tsx`

### Maintenance mode paths

Do not change `lib/maintenance.js` or the maintenance behavior in
`pages/index.tsx`. See [section 10](#10-maintenance-mode).

## 5. Secrets handling

- Never put secrets, tokens, API keys, cookies, or `.env` values in code,
  commits, logs, pull requests, or chat. Read them from environment variables.
- Never print a secret. If you must identify one, show at most its last four
  characters.
- Never put a secret in a `NEXT_PUBLIC_*` variable.
- Shopify tokens stay server-side only.
- Never commit `.env` or `.env.local`. Use `.env.example` as the template.
- This repo is public. Secret scanning and push protection are enabled on
  GitHub; do not try to bypass them.
- Shopify, Vercel, and DNS credentials are Flow's lane. Do not write or
  rotate them without Ryan's typed OK in Flow's chat, except that Flow
  may rotate a confirmed-leaked Shopify or Vercel key right away and
  tell Ryan afterward (see section 9.8).
- Pull requests that need a new environment variable must list it by name in
  the handoff. Flow adds it.
- Never request or add the `write_orders` scope. Draft-order quotes use
  `write_draft_orders` only.
- Never create passkeys or save credentials on the shared box. Never read or
  use another bot's keys. Required form fields that hold private values go
  to a secure form that Ryan fills himself.

## 6. Commit identity

Set author and committer **only** through the `GIT_AUTHOR_*` and
`GIT_COMMITTER_*` environment vars:

```text
RYAN CHE YOUNG <282769868+cheyoung1983-sudo@users.noreply.github.com>
```

Do not run `git config`. Pushes that use `cheyoung1983@gmail.com` are
rejected. Do not use `--no-verify` or `--admin`. Do not force-push unless
Ryan has given an explicit typed OK for that force push.

## 7. Validation

Use Node 24. Before every push, merge or rebase the latest `main` into the
branch and run the full suite, not a subset:

```bash
npm run precheck   # node version, CI/config integrity, typecheck, lint, secret scan
npm run test:a11y
npm run build
```

All three must pass. Details are in [AGENT_WORKFLOW.md](../AGENT_WORKFLOW.md).

## 8. Handoff format

Every handoff (PR description or teammate note) should state:

- What changed, and why
- Which files were touched
- What checks and browser flows were run, with results
- Any unresolved blocker or required environment variable, listed by name
- The branch and pull request containing the work
- Who owns the next step, and whether it needs Ryan's typed OK
- If that OK belongs in another bot's chat, the exact line for Ryan to paste
  there

Keep one canonical PR per feature targeting `main`. Prefer squash merge after
the PR is current with `main`. Branches are deleted on merge by default.

## 9. Incident response for leaks

If a secret, token, or credential may have landed in the repo, a clone, a
log, or a pull request:

1. **Stop.** Do not push, force-push, or open a PR that could copy the secret
   into another ref.
2. Do not print the value. Identify it with a name and at most the last four
   characters.
3. Tell Ryan in Gitty's chat, and tell Flow if the secret is in Flow's lane.
   Do not paste the secret into chat, email, or a ticket.
4. Do not use, sync, or push from any clone that still contains the leaked
   commit or file. Delete or isolate that copy after Ryan OKs cleanup.
5. History rewrites and force-pushes happen only with Ryan's explicit typed
   OK. If a rewrite is approved, pause `main` protection only for that push,
   restore the rulesets immediately, and verify the tree and a secret scan.
6. Closed pull-request refs (`refs/pull/N/head`) can keep a scrubbed commit
   reachable. Only GitHub Support can purge those. Draft the request; do not
   submit it unless Ryan asks.
7. After a rewrite, every agent and tool must re-clone from current `main`.
   Do not rebase or sync an old workspace onto the new history.
8. Revoke or rotate the credential. Shopify and Vercel keys are Flow's lane.
   Google AI Studio tokens are session cookies: Ryan signs out of all Google
   sessions on the affected account. Per Ryan's decision on Nov 27, 2026 at
   8:59 AM PT, Flow may rotate a confirmed-leaked Shopify or Vercel key
   right away and tell Ryan afterward.

## 10. Maintenance mode

The homepage stays in maintenance mode until Display & Cell Pros has full
WGP integration, per Ryan's decision on Nov 26, 2026.

`lib/maintenance.js` treats the site as in maintenance unless the Vercel
environment variable `MAINTENANCE_MODE` is the string `false`. Unset means
maintenance stays on. Only `/` returns the 503 maintenance page; other
routes are unchanged.

Do not set `MAINTENANCE_MODE` to `false`, do not change that behavior, and
do not redeploy production for the purpose of exiting maintenance, until
Ryan types an OK after full WGP integration.

Published hours and mail-in copy also need Ryan's OK to change. Until
February 1, 2027, public hours are Wednesday–Saturday, 10 AM–8 PM PT, and
device repair is mail-in only, alongside the other services listed on the
site. Support email stays `support@displaycellpros.com`.

## 11. Store, money, suppliers, and public copy

- No code or copy may place WGP or Zilar orders or contact those suppliers.
- WGP dealer and wholesale prices never reach the browser, the repo, logs,
  or public copy.
- Customer pricing is computed server-side only.
- Public copy follows Social's screening rule: no unconfirmed claims, no
  security details, no legal exposure, and flag borderline wording to Ryan.
- Tribal discount copy states 20% as the fixed rate, never optional or
  variable.

## 12. Related sites

The dcptriage cutover has its own approvals, separate from this repo. Store
PRs that link to `triage.displaycellpros.com` must not assume the cutover
has happened.

## 13. Related documents

- [AGENT_WORKFLOW.md](../AGENT_WORKFLOW.md) — worktree isolation, validation,
  PR and merge process, conflict handling, stale branches
- [CONTRIBUTING.md](../CONTRIBUTING.md) — maintainer and agent responsibilities
- [README.md](../README.md) — setup and the tribal-discount protection notice
- Pinned issue [#123](https://github.com/cheyoung1983-sudo/builderio-shopify-commerce-headless/issues/123)
