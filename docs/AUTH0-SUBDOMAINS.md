# Auth0 across displaycellpros.com subdomains

> **Standing note (Ryan, 2026-10-23):** Auth0 is implemented on **every** displaycellpros.com
> subdomain using one Auth0 tenant/application. **Every subdomain must be listed explicitly** in the
> Auth0 application's **Allowed Callback URLs**, **Allowed Logout URLs** and **Allowed Web Origins**.
> Wildcards are not used in production. **Real keys are required before turning it on**; until then
> login fails closed (`503 Login is not configured`), and no fake users or placeholder credentials are used.

## Subdomain inventory (read-only check, 2026-10-23)

| Host | Vercel project (team dcpllc) | Repo | Auth0 use |
|---|---|---|---|
| `displaycellpros.com` | store (`prj_pn2n…`) | builderio-shopify-commerce-headless | customer login / Track Repair |
| `www.displaycellpros.com` | store (`prj_pn2n…`) | builderio-shopify-commerce-headless | same as apex |
| `triage.displaycellpros.com` | `dcp-triage` | dcp-triage | staff only (`/admin`); public triage stays public |

`*.displaycellpros.com` is wildcard DNS to Vercel, so any other name (for example `trios.`) resolves but
returns `DEPLOYMENT_NOT_FOUND`. It is not an app. When a new subdomain goes live, add it to every list below.

## Configured Auth0 application (as of 2026-10-23)

- Tenant domain (`AUTH0_DOMAIN`): `dev-wqlbqf0zkr5j45di.us.auth0.com`
- Application: **Display & Cell Pros Web** (Regular Web App)
- Client ID (`AUTH0_CLIENT_ID`, not secret): `6Up40LuJtv1LHZYUO7gFXlGm1WrNRKOZ`
- Application Login URI: `https://www.displaycellpros.com/auth/login`
- Routes: nextjs-auth0 v4 defaults in both repos: `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/profile`
- The client secret is never written here. It lives only in the Auth0 dashboard and Vercel.

## Auth0 dashboard: Applications → Display & Cell Pros Web → Settings (configured)

**Allowed Callback URLs**
```
https://displaycellpros.com/auth/callback,
https://www.displaycellpros.com/auth/callback,
https://triage.displaycellpros.com/auth/callback,
http://localhost:3000/auth/callback
```

**Allowed Logout URLs**
```
https://displaycellpros.com,
https://www.displaycellpros.com,
https://triage.displaycellpros.com,
http://localhost:3000
```

**Allowed Web Origins**
```
https://displaycellpros.com,
https://www.displaycellpros.com,
https://triage.displaycellpros.com,
http://localhost:3000
```

**Vercel preview URLs are deliberately NOT allowed.** Auth0 rejects any `redirect_uri` that isn't listed, so login
on `*.vercel.app` previews fails by design. Don't add `https://*.vercel.app` wildcards: Auth0 says wildcard subdomains
"should not be used in production". If preview login is ever needed, use a separate dev Auth0 application.

## Environment variables (names only; Flow sets values in Vercel)

| Var | dcp-triage | store | Notes |
|---|---|---|---|
| `AUTH0_DOMAIN` | required | required | `dev-wqlbqf0zkr5j45di.us.auth0.com` (or the custom domain later) |
| `AUTH0_CLIENT_ID` | required | required | `6Up40LuJtv1LHZYUO7gFXlGm1WrNRKOZ` (same app for both) |
| `AUTH0_CLIENT_SECRET` | required | required | sensitive; Flow copies it from the Auth0 dashboard |
| `AUTH0_SECRET` | required | required | 32+ random bytes (`openssl rand -hex 32`), **different per project** |
| `APP_BASE_URL` | Production: `https://triage.displaycellpros.com` | Production: `https://displaycellpros.com,https://www.displaycellpros.com` | comma-separated allow-list is supported in v4; previews can't log in anyway (see above) |
| `DCP_STAFF_EMAILS` | required | n/a | comma-separated verified staff emails allowed into `/admin` |
| `AUTH0_COOKIE_DOMAIN` | leave unset | leave unset | only set `.displaycellpros.com` if you deliberately want one shared app session |

The store's code currently reads the v3-style `AUTH0_BASE_URL` / `AUTH0_ISSUER_BASE_URL`. These docs use the
v4 names (`APP_BASE_URL`, `AUTH0_DOMAIN`). Aligning the store code is a follow-up after its in-flight Auth0 fix merges.

## SSO across subdomains

Use one tenant and one application with the explicit lists above. Each subdomain keeps its own app session
cookie (host-only). Single sign-on comes from the Auth0 tenant session: after logging in on one subdomain, the
others complete `/auth/login` without asking for a password again. Sharing the app cookie through
`AUTH0_COOKIE_DOMAIN=.displaycellpros.com` is possible but widens the blast radius, so it is not recommended here.

## Optional custom domain (`login.displaycellpros.com`)

Auth0 Custom Domains (Dashboard → Branding → Custom Domains) needs a CNAME `login` → the target Auth0 provides,
and that explicit record overrides the Vercel wildcard for that name. After it verifies, set `AUTH0_DOMAIN` to
`login.displaycellpros.com` in both projects. The CSP form-action picks it up automatically.

## Turn-on checklist

1. Done: the Auth0 app exists with the URL lists above. Consider disabling public sign-ups; `/admin` also requires `DCP_STAFF_EMAILS`.
2. Flow: per project, set `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` (from the dashboard), a freshly generated `AUTH0_SECRET` (different per project), `APP_BASE_URL`, and `DCP_STAFF_EMAILS` (triage), then redeploy.
3. Verify: `https://triage.displaycellpros.com/admin` redirects to Auth0, comes back to `/admin`, and logout returns to the origin.

## References

- nextjs-auth0 v4 README / EXAMPLES (APP_BASE_URL allow-list, inference, cookie domain): https://github.com/auth0/nextjs-auth0 , https://github.com/auth0/nextjs-auth0/blob/main/EXAMPLES.md
- Subdomain URL placeholders / wildcard caveats: https://auth0.com/docs/get-started/applications/wildcards-for-subdomains
- Application settings (callbacks, logout, web origins): https://auth0.com/docs/get-started/applications/application-settings
- Logout redirect allow-list: https://auth0.com/docs/authenticate/login/logout/redirect-users-after-logout
- Custom domains: https://auth0.com/docs/customize/custom-domains
- Single sign-on: https://auth0.com/docs/authenticate/single-sign-on
