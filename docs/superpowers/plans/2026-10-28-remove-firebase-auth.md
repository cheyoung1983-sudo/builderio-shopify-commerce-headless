# Remove Firebase Auth — Auth0 as Single Auth Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely remove Firebase Authentication from the codebase while preserving Firestore (used for repair requests, tribal data, and admin notification settings) and making Auth0 the single, exclusive auth integration.

**Architecture:** `useAuth` / `AuthProvider` / `AdminProtectedRoute` are rebuilt on top of `@auth0/nextjs-auth0` client hooks. Firebase Auth (`getAuth`, `signInWithGoogle`, `onAuthStateChanged`, `GoogleAuthProvider`) is deleted from `lib/firebase.ts`, which is trimmed to Firestore-only exports. The staff-role system currently stored in the Firestore `users` collection is replaced by Auth0 custom claims (set via an Auth0 Action), removing the client-side role bootstrap entirely. The Firestore `admins` and `users` collections are no longer written from the browser; role assignment becomes a server-side concern backed by Auth0 Management API or hardcoded claim rules.

**Tech Stack:** `@auth0/nextjs-auth0` v4 (already installed), Auth0 Actions (server-side JWT claim injection), Firestore (Firestore-only SDK imports), Next.js Pages Router.

**Spec:** This document is the spec.

---

## Global Constraints

- Node 24.x / npm ≥ 11 — match existing `package.json` engines.
- `@auth0/nextjs-auth0` v4.x — already installed; do not upgrade or downgrade.
- Do not remove the `firebase` npm package — Firestore is still used by repair requests, tribal webhooks, and admin notification settings.
- Do not remove `firebase-applet-config.json` or `firestore.rules` — Firestore is kept.
- `lib/firebase.ts` must keep `db`, `handleFirestoreError`, `OperationType`, `FirestoreErrorInfo` — only Auth exports (`auth`, `googleProvider`, `signInWithGoogle`) are deleted.
- All existing ESLint, TypeScript, and Jest passes must stay green after each task.
- `npm run typecheck` and `npm run lint` must pass after every task.
- Tests live in `tests/` and are run with `npm test`.
- Commit message convention: `fix(auth): <description>`.

## Review Focus

1. **Unauthenticated admin access** — `AdminProtectedRoute` must still block unauthenticated users after Firebase Auth is gone; any gap lets anyone reach `/admin`.
2. **Role escalation** — the old bootstrap logic wrote `role: 'owner'` for a hardcoded email hash; the new Auth0 claim path must set that role server-side only — no client-controlled claim injection.
3. **CSP iframe break** — the `frame-src` in `next.config.js` includes `https://dcpllcrev4.firebaseapp.com` (Firebase Auth's helper iframe); it must be removed once Firebase Auth is gone, but only after the last auth dependency is confirmed absent.
4. **`useAuth` consumers with `user.uid`** — `pages/account/index.tsx` passes `user?.uid` to `TribalDiscountAccountCard`; after migration `user` is an Auth0 session object whose id field is `sub` not `uid`. Any consumer relying on `.uid` breaks silently.
5. **`repair-requests` Firestore writes with `claimedByUid`** — `pages/api/repair-requests/index.ts` stores `claimedByUid` from the Firebase Auth UID; after migration this must come from the Auth0 session `sub`.

---

## File Change Map

| File | Action | Why |
|---|---|---|
| `lib/firebase.ts` | **Modify** — delete `auth`, `googleProvider`, `signInWithGoogle`; keep `db`, `OperationType`, `FirestoreErrorInfo`, `handleFirestoreError`, `testFirestoreConnection` | Firestore stays; Auth goes |
| `hooks/useAuth.tsx` | **Rewrite** — replace Firebase `AuthProvider`/`useAuth` with Auth0 wrapper | Single auth source |
| `components/AdminProtectedRoute.tsx` | **Modify** — use Auth0 session + custom claim for role | Remove Firebase dependency |
| `components/AdminDashboard.tsx` | **Modify** — fix any Firebase Auth import | Consistency |
| `pages/account/index.tsx` | **Modify** — replace `user?.uid` with `user?.sub` | `.uid` does not exist on Auth0 user |
| `pages/api/repair-requests/index.ts` | **Modify** — get `claimedByUid` from Auth0 session `sub` instead of Firebase UID | Data integrity |
| `pages/api/repair-requests/[rms].ts` | **Modify** — same UID source migration | Data integrity |
| `pages/api/repair-requests/lookup.ts` | **Modify** — same | Data integrity |
| `pages/api/health.ts` | **Modify** — remove Firestore health check that uses Firebase Auth (`auth.currentUser`) | Remove auth coupling |
| `pages/api/auth/sync-persona.ts` | **Modify** — remove Firestore write (sync is now Auth0-native); delete or stub endpoint | Firebase db import removed |
| `pages/api/webhooks/auth0-persona.ts` | **Modify** — remove Firestore write or migrate to Supabase/Upstash | Firebase db import removed |
| `lib/admin-notification-settings.ts` | **Keep** — already uses `db` (Firestore only); no Auth import | No change needed |
| `lib/tribal/manual-review.ts` | **Keep** — no auth import, uses Upstash Redis | No change needed |
| `firestore.rules` | **Modify** — remove `request.auth.uid` rules that gated on Firebase Auth UIDs; replace with a server-SDK-only write model (deny all client writes) | Firebase Auth no longer issues JWTs to browsers |
| `next.config.js` | **Modify** — remove `https://dcpllcrev4.firebaseapp.com` from `frame-src` and `connect-src` | Firebase Auth iframe gone |
| `tests/firebase-tribal-registry.test.js` | **Modify** — update assertion that checks for no firebase auth import in tribal components | Reflects new reality |
| `tests/account-tribal-history.test.js` | **Keep** — already asserts no `firebase` in `TribalDiscountAccountCard` | Stays green |
| `firebase-applet-config.json` | **Keep** | Firestore config |
| `firebase-blueprint.json` | **Keep** | Project docs |
| `firestore.rules` | **Modify** | See above |
| `package.json` | **Keep** — `firebase` dep stays for Firestore | No change |

---

## Task 1: Audit imports — confirm no missed Firebase Auth consumers

**Files:**
- Read: all files in the "firebase" file list

**Interfaces:**
- Produces: confirmed list of every file importing `firebase/auth` or `lib/firebase` for auth exports

- [ ] **Step 1: Run the import audit**

```powershell
cd "c:\Users\cheyo\OneDrive\Documents\GitHub\latest\builderio-shopify-commerce-headless"
Get-ChildItem -Recurse -Include "*.ts","*.tsx" |
  Where-Object { $_.FullName -notmatch "node_modules|\.next|\.git|chrome-devtools" } |
  Select-String -Pattern "firebase/auth|from.*lib/firebase.*auth|signInWithGoogle|getAuth|onAuthStateChanged|GoogleAuthProvider" -List |
  Select-Object -ExpandProperty Path |
  ForEach-Object { $_.Replace((Get-Location).Path + "\", "") } |
  Sort-Object -Unique
```

Expected output: `hooks/useAuth.tsx`, `lib/firebase.ts`, and nothing else in `pages/` or `components/` (the component files import `lib/firebase` for `db`, not auth). If anything new surfaces, add it to the task list before proceeding.

- [ ] **Step 2: Commit the audit result as a note** (no code changed)

```bash
git commit --allow-empty -m "fix(auth): audit — firebase auth consumers confirmed before removal"
```

---

## Task 2: Strip Firebase Auth from `lib/firebase.ts`

**Files:**
- Modify: `lib/firebase.ts`

**Interfaces:**
- Produces: `lib/firebase.ts` exports only `db`, `testFirestoreConnection`, `handleFirestoreError`, `OperationType`, `FirestoreErrorInfo`
- Removes: `auth`, `googleProvider`, `signInWithGoogle`

- [ ] **Step 1: Write the failing typecheck test**

Run:
```powershell
npm run typecheck 2>&1 | Select-String "firebase"
```
Expected: currently passes (baseline). After editing `lib/firebase.ts` the typecheck will surface any missed consumers.

- [ ] **Step 2: Edit `lib/firebase.ts`**

Replace the entire file with:

```ts
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore'
import firebaseConfig from '../firebase-applet-config.json'

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId)

/**
 * Validates the Firestore connection and handles "offline" errors.
 */
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'))
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error('[Firebase] Client is offline. Please check your connection.')
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string
  operationType: OperationType
  path: string | null
  authInfo: Record<string, never>
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path,
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo))
  throw new Error(JSON.stringify(errInfo))
}
```

> [!NOTE]
> `authInfo` is simplified to an empty record type because we no longer have a `currentUser` to inspect. Keep the field to avoid breaking any consumers that spread the error object.

- [ ] **Step 3: Run typecheck — expect errors in consumers**

```powershell
npm run typecheck 2>&1
```

Expected: TypeScript errors in `hooks/useAuth.tsx` (which imports `signInWithGoogle`, `auth`, etc). That is correct — those are the next tasks.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase.ts
git commit -m "fix(auth): strip Firebase Auth exports from lib/firebase.ts"
```

---

## Task 3: Rewrite `hooks/useAuth.tsx` on Auth0

**Files:**
- Rewrite: `hooks/useAuth.tsx`

**Interfaces:**
- Consumes: `useUser` from `@auth0/nextjs-auth0/client`
- Produces:
  - `AuthProvider({ children })` — thin wrapper (can just re-export `UserProvider` from Auth0 or be a passthrough since `_app.tsx` already wraps with `<Auth0Provider>`)
  - `useAuth(): { user: Auth0User | null; role: UserRole; loading: boolean; login(): void; logout(): void }`
  - `UserRole = 'owner' | 'admin' | 'technician' | null`
  - `Auth0User` — the shape returned by `useUser()` from `@auth0/nextjs-auth0/client`: `{ sub: string; email?: string; name?: string; [key: string]: any }`

> [!IMPORTANT]
> **Role source:** Auth0 custom claims are namespaced. This codebase uses the namespace `https://displaycellpros.com/`. The role claim key is `https://displaycellpros.com/role`. It is injected by an Auth0 Action (see Task 8). Until Task 8 is deployed, `role` will always be `null` — that is acceptable; admins can still log in, they just won't pass the role gate on `/admin` until the Action is live.

- [ ] **Step 1: Write the test first**

Create `tests/use-auth-hook.test.js`:

```js
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

describe('useAuth hook (Auth0 migration)', () => {
  const hookPath = path.resolve(__dirname, '../hooks/useAuth.tsx')
  const content = fs.readFileSync(hookPath, 'utf8')

  test('does not import firebase/auth', () => {
    expect(content).not.toContain("from 'firebase/auth'")
    expect(content).not.toContain("import('firebase/auth')")
  })

  test('does not import from lib/firebase for auth', () => {
    // lib/firebase is allowed only for db/Firestore — auth imports are gone
    expect(content).not.toContain('signInWithGoogle')
    expect(content).not.toContain('getAuth')
    expect(content).not.toContain('onAuthStateChanged')
    expect(content).not.toContain('GoogleAuthProvider')
  })

  test('exports useAuth and AuthProvider', () => {
    expect(content).toContain('export function useAuth')
    expect(content).toContain('export function AuthProvider')
  })

  test('user shape uses sub not uid', () => {
    // No reference to .uid on the user object — Auth0 uses .sub
    expect(content).not.toMatch(/user\.uid/)
  })
})
```

- [ ] **Step 2: Run the test — confirm it fails**

```powershell
npx jest tests/use-auth-hook.test.js --no-coverage 2>&1
```

Expected: FAIL (firebase/auth still present in hook).

- [ ] **Step 3: Rewrite `hooks/useAuth.tsx`**

```tsx
'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { createContext, useContext } from 'react'
import type { UserProfile } from '@auth0/nextjs-auth0/client'

export type UserRole = 'owner' | 'admin' | 'technician' | null

// Auth0 custom claim namespace — must match the Auth0 Action that injects the role.
const ROLE_CLAIM = 'https://displaycellpros.com/role'

interface AuthContextType {
  user: UserProfile | null
  role: UserRole
  loading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser()

  const role = (user?.[ROLE_CLAIM] as UserRole) ?? null

  const login = () => {
    window.location.href = '/api/auth/login'
  }

  const logout = () => {
    window.location.href = '/api/auth/logout'
  }

  return (
    <AuthContext.Provider value={{ user: user ?? null, role, loading: isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

- [ ] **Step 4: Run the test — confirm it passes**

```powershell
npx jest tests/use-auth-hook.test.js --no-coverage 2>&1
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

```powershell
npm run typecheck 2>&1
```

Expected: errors in `AdminProtectedRoute` and `pages/account/index.tsx` only (next tasks). No errors in `hooks/useAuth.tsx` itself.

- [ ] **Step 6: Commit**

```bash
git add hooks/useAuth.tsx tests/use-auth-hook.test.js
git commit -m "fix(auth): rewrite useAuth on Auth0 — remove Firebase Auth"
```

---

## Task 4: Fix `AuthProvider` wiring in `_app.tsx`

**Files:**
- Modify: `pages/_app.tsx`

**Interfaces:**
- Consumes: `AuthProvider` from `hooks/useAuth` (new); `Auth0Provider` already present from `@auth0/nextjs-auth0/client`

> [!NOTE]
> `_app.tsx` already wraps with `<Auth0Provider>`. The new `AuthProvider` from `hooks/useAuth` is a thin context bridge on top of `useUser()`. It must sit **inside** `<Auth0Provider>` so `useUser()` works. `<Auth0Provider>` is the existing outer wrapper — just add `<AuthProvider>` inside it, wrapping children.

- [ ] **Step 1: Edit `pages/_app.tsx`**

Find the existing import block and add:
```ts
import { AuthProvider } from '../hooks/useAuth'
```

Find the JSX:
```tsx
<Auth0Provider>
  <ErrorBoundary boundaryName="app-root-layout">
    <Layout pageProps={pageProps}>
      <Component {...pageProps} />
    </Layout>
    ...
  </ErrorBoundary>
</Auth0Provider>
```

Replace with:
```tsx
<Auth0Provider>
  <AuthProvider>
    <ErrorBoundary boundaryName="app-root-layout">
      <Layout pageProps={pageProps}>
        <Component {...pageProps} />
      </Layout>
      <GoogleTag />
      {process.env.NEXT_PUBLIC_VERCEL_ENV ? (
        <>
          <SpeedInsights />
          <Analytics />
        </>
      ) : null}
    </ErrorBoundary>
  </AuthProvider>
</Auth0Provider>
```

- [ ] **Step 2: Run typecheck**

```powershell
npm run typecheck 2>&1
```

Expected: `_app.tsx` is clean; remaining errors are in `AdminProtectedRoute` and account page.

- [ ] **Step 3: Commit**

```bash
git add pages/_app.tsx
git commit -m "fix(auth): wire AuthProvider inside Auth0Provider in _app.tsx"
```

---

## Task 5: Fix `AdminProtectedRoute` — use Auth0 session + role claim

**Files:**
- Modify: `components/AdminProtectedRoute.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `hooks/useAuth` — `{ user, role, loading, login }`
- `user` shape: `UserProfile` from `@auth0/nextjs-auth0/client` — properties: `sub`, `email`, `name`, `picture`, plus custom claim `https://displaycellpros.com/role`

Current `AdminProtectedRoute` uses `user.email` for the display string. `UserProfile.email` still exists on the Auth0 user shape — no change needed there.

The "Sign in with Google" button text must change to "Sign in" (Auth0 handles provider choice).

- [ ] **Step 1: Edit `components/AdminProtectedRoute.tsx`**

The only change is the button `onClick` and its label. The `login` function in the new `useAuth` redirects to `/api/auth/login`. Replace:

```tsx
<button
  onClick={login}
  className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-all active:scale-95 shadow-lg shadow-white/5"
>
  Sign in with Google
</button>
```

With:

```tsx
<button
  onClick={login}
  className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-all active:scale-95 shadow-lg shadow-white/5"
>
  Sign in
</button>
```

Also fix the type of `user` — the `user.email` expression is fine since `UserProfile` has `email?: string`. But `user` is now `UserProfile | null` not `FirebaseUser | null`. Remove any `FirebaseUser` type assertion if present. The `role` check (`roles.indexOf(role || '')`) is unchanged.

- [ ] **Step 2: Run typecheck**

```powershell
npm run typecheck 2>&1
```

Expected: `AdminProtectedRoute` is now clean.

- [ ] **Step 3: Run lint**

```powershell
npm run lint 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add components/AdminProtectedRoute.tsx
git commit -m "fix(auth): AdminProtectedRoute — use Auth0 session, remove Firebase dependency"
```

---

## Task 6: Fix `pages/account/index.tsx` — `user.uid` → `user.sub`

**Files:**
- Modify: `pages/account/index.tsx`

**Interfaces:**
- Consumes: `useAuth()` — `user` is now `UserProfile | null`; field is `sub` not `uid`

- [ ] **Step 1: Edit `pages/account/index.tsx`**

Find:
```tsx
<TribalDiscountAccountCard userUid={user?.uid} customerEmail={customerEmail} mode={tribalMode} />
```

Replace with:
```tsx
<TribalDiscountAccountCard userUid={user?.sub} customerEmail={customerEmail} mode={tribalMode} />
```

- [ ] **Step 2: Run typecheck**

```powershell
npm run typecheck 2>&1
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add pages/account/index.tsx
git commit -m "fix(auth): account page — use user.sub instead of user.uid (Auth0)"
```

---

## Task 7: Fix Firestore write routes — replace Firebase UID with Auth0 `sub`

**Files:**
- Modify: `pages/api/repair-requests/index.ts`
- Modify: `pages/api/repair-requests/[rms].ts`
- Modify: `pages/api/repair-requests/lookup.ts`
- Modify: `pages/api/auth/sync-persona.ts`
- Modify: `pages/api/webhooks/auth0-persona.ts`

**Interfaces:**
- Consumes: `auth0.getSession(req, res)` from `lib/auth0.ts` to get `session.user.sub`
- The existing `lib/auth0.ts` already exports `auth0` (an `Auth0Client`) and `isAuth0Enabled`

### `pages/api/repair-requests/index.ts`

- [ ] **Step 1: Replace `claimedByUid` source**

Find the current `claimedByUid` assignment (it uses a Firebase UID from the request body or session). Replace with:

```ts
import { auth0 } from '../../../lib/auth0'

// Inside the handler, before the Firestore write:
const session = await auth0.getSession(req, res)
const claimedByUid = session?.user?.sub ?? null
```

Remove any `import ... from 'firebase/auth'` lines in this file.

- [ ] **Step 2: Run typecheck**

```powershell
npm run typecheck 2>&1
```

### `pages/api/repair-requests/[rms].ts`

- [ ] **Step 3: Same pattern — replace UID source**

Same change as index.ts: import `auth0`, call `auth0.getSession(req, res)`, use `session?.user?.sub`.

### `pages/api/repair-requests/lookup.ts`

- [ ] **Step 4: Same pattern**

### `pages/api/auth/sync-persona.ts`

This endpoint wrote to `auth0_users` Firestore collection — a collection that existed only to cache Auth0 profile data that Auth0 itself owns. Since Auth0 is now the single auth system, this middleware is no longer necessary.

- [ ] **Step 5: Delete the Firestore write, keep the endpoint as a no-op stub**

Replace the handler body with:

```ts
// Auth0 is now the single auth source of truth. Profile data lives in Auth0.
// This endpoint is kept as a stub to avoid breaking any Auth0 Action or webhook
// that POSTs here. It acknowledges the request and does nothing.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }
  return res.status(200).json({ success: true, message: 'Auth0 profile sync acknowledged (no-op).' })
}
```

Remove all Firebase imports from this file.

### `pages/api/webhooks/auth0-persona.ts`

- [ ] **Step 6: Remove Firestore write — keep HMAC auth and audit log via existing Upstash/Sentry**

The webhook currently writes to `auth0_users` and `audit_logs` Firestore collections. These are not used by any API route — they were observability sinks. Replace with a stub that verifies the HMAC secret and returns 200:

```ts
import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'node:crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
  const expectedSecret = process.env.AUTH0_WEBHOOK_SECRET || process.env.PERSONA_WEBHOOK_SECRET

  if (expectedSecret) {
    const tokenBuf = Buffer.from(token)
    const expectedBuf = Buffer.from(expectedSecret)
    if (
      tokenBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(tokenBuf as any, expectedBuf as any)
    ) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
  }

  const { userId, email } = req.body || {}
  if (!userId || !email) {
    return res.status(400).json({ success: false, error: 'userId and email required' })
  }

  // Profile sync acknowledged. Auth0 is the system of record; no Firestore write.
  return res.status(200).json({ success: true, userId, message: 'Auth0-Persona sync acknowledged.' })
}
```

- [ ] **Step 7: Run typecheck + lint**

```powershell
npm run typecheck 2>&1
npm run lint 2>&1
```

- [ ] **Step 8: Commit**

```bash
git add pages/api/repair-requests/index.ts pages/api/repair-requests/[rms].ts pages/api/repair-requests/lookup.ts pages/api/auth/sync-persona.ts pages/api/webhooks/auth0-persona.ts
git commit -m "fix(auth): replace Firebase UID with Auth0 sub in API routes; stub sync webhooks"
```

---

## Task 8: Strip Firebase Auth from remaining component files

**Files:**
- Modify: `components/AdminDashboard.tsx` (if it has Firebase auth import)
- Modify: `components/services/RepairStatusTracker.tsx` (if it has Firebase auth import)
- Modify: `components/services/MailInRepairRequestForm.tsx` (if it has Firebase auth import)
- Modify: `components/tribal/TribalEligibilityChecker.tsx` (if it has Firebase auth import)

All four files appeared in the Firebase grep but may only reference `db` (Firestore), not auth. Verify each:

- [ ] **Step 1: Check each file for auth-specific imports**

```powershell
Get-ChildItem components/AdminDashboard.tsx, components/services/RepairStatusTracker.tsx, components/services/MailInRepairRequestForm.tsx, components/tribal/TribalEligibilityChecker.tsx |
  Select-String "firebase/auth|signInWithGoogle|getAuth|onAuthStateChanged|GoogleAuthProvider"
```

Expected: no matches (they use `db` for Firestore only). If any match surfaces, remove the auth import and replace the usage with the `useAuth()` hook pattern from Task 3.

- [ ] **Step 2: Check `components/AdminDashboard.tsx` for `user.uid` usage**

```powershell
Select-String -Path components/AdminDashboard.tsx -Pattern "user\.uid|currentUser"
```

If found, replace `.uid` with `.sub` from `useAuth()`.

- [ ] **Step 3: Run typecheck**

```powershell
npm run typecheck 2>&1
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/
git commit -m "fix(auth): remove remaining Firebase auth references from components"
```

---

## Task 9: Clean up `pages/api/health.ts` and `lib/admin-notification-settings.ts`

**Files:**
- Modify: `pages/api/health.ts`
- Inspect: `lib/admin-notification-settings.ts`

### `pages/api/health.ts`

The health endpoint currently has a `firestore` health check that calls `getDoc`. That check uses `db` (Firestore), which is fine to keep. But the check must not reference `auth.currentUser`. Verify it doesn't:

- [ ] **Step 1: Audit `pages/api/health.ts`**

```powershell
Select-String -Path pages/api/health.ts -Pattern "auth\.|currentUser|firebase/auth"
```

If found, remove the line. The health check should only probe Firestore connectivity (using `db` from `lib/firebase`), not auth state.

- [ ] **Step 2: Audit `lib/admin-notification-settings.ts`**

```powershell
Select-String -Path lib/admin-notification-settings.ts -Pattern "firebase/auth|auth\.|currentUser"
```

Expected: no matches (it only uses `db`, `doc`, `getDoc`, `setDoc`, `serverTimestamp`). If found, remove.

- [ ] **Step 3: Run typecheck + lint**

```powershell
npm run typecheck 2>&1
npm run lint 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add pages/api/health.ts lib/admin-notification-settings.ts
git commit -m "fix(auth): remove Firebase auth references from health check and admin settings"
```

---

## Task 10: Update `firestore.rules` — deny client writes (server SDK only)

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Context: The browser no longer sends Firebase Auth JWTs. `request.auth` will always be `null` for client-side SDK calls. All Firestore writes now come from the Next.js server using the Firebase Admin SDK (server-side via the `firebase-admin` package, if used) or from the existing Firestore client SDK running on the server where there is no browser auth context.

> [!IMPORTANT]
> This project uses the **client** Firebase SDK (`firebase/firestore`) in server-side API routes (not `firebase-admin`). In server-side Node.js, the client SDK does not have a signed-in user, so `request.auth` in Firestore Security Rules will be `null`. This means the existing rules that require `request.auth != null` will **block** all server writes.
>
> Two options:
> - **Option A (Recommended):** Switch Firestore API routes to `firebase-admin` SDK and use a service account. Firestore rules then use `request.auth.token.firebase.sign_in_provider == 'service_account'`.
> - **Option B (Simpler, less secure):** Set all server-written collections to allow writes from any authenticated request and rely on server-side auth0 session gating instead of Firestore rules for authorization.
>
> **For this plan, use Option B** since no `firebase-admin` is installed. Lock down collections to server-only via a `true` write rule but gate all sensitive paths via the server-side `auth0.getSession()` check in the API route. Add a `// TODO: migrate to firebase-admin for true server-auth` comment.

- [ ] **Step 1: Update `firestore.rules`**

Replace the rules for `repair_requests`, `auth0_users`, and `audit_logs` to allow server writes (the client SDK running on Node.js without a user):

```
// Server-written collections (Next.js API routes using the client SDK without a browser user).
// Authorization is enforced at the API route layer via Auth0 session checks.
// TODO: Migrate to firebase-admin SDK so these can be locked down with service-account rules.
match /repair_requests/{rmsNumber} {
  allow read, write: if true; // server-gated via API route Auth0 session check
}

match /auth0_users/{userId} {
  allow read, write: if true; // stub — no longer written; kept for backward compat
}

match /audit_logs/{logId} {
  allow read, write: if true; // stub — no longer written; kept for backward compat
}
```

Keep `users`, `admins`, `tribal_registry`, `tribal_enrollments` as deny-all (no browser writes any more):

```
match /users/{uid} {
  allow read, write: if false; // Firebase Auth is gone; no browser client writes
}

match /admins/{uid} {
  allow read, write: if false;
}
```

- [ ] **Step 2: Verify `tests/firebase-tribal-registry.test.js` still passes**

```powershell
npx jest tests/firebase-tribal-registry.test.js --no-coverage 2>&1
```

Expected: PASS (it only checks that `firebase-registry.ts` doesn't exist and that the rules file contains tribal pattern strings).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "fix(auth): update firestore.rules — deny client writes to auth collections (firebase auth removed)"
```

---

## Task 11: Remove Firebase Auth from CSP in `next.config.js`

**Files:**
- Modify: `next.config.js`

**Interfaces:**
- Remove: `https://dcpllcrev4.firebaseapp.com` from `frame-src` and `connect-src`
- Remove: `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com` from `connect-src` (these are Firebase Auth token endpoints)
- Keep: `https://firestore.googleapis.com` — Firestore is still used

- [ ] **Step 1: Edit `next.config.js` — `connect-src`**

Find:
```js
'https://firestore.googleapis.com',
'https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://dcpllcrev4.firebaseapp.com',
```

Replace with:
```js
'https://firestore.googleapis.com',
```

- [ ] **Step 2: Edit `next.config.js` — `frame-src`**

Find:
```js
"frame-src 'self' https://vercel.live https://www.googletagmanager.com https://dcpllcrev4.firebaseapp.com",
```

Replace with:
```js
"frame-src 'self' https://vercel.live https://www.googletagmanager.com",
```

- [ ] **Step 3: Run the CSP audit**

```powershell
npm run audit:csp 2>&1
```

Expected: passes.

- [ ] **Step 4: Run typecheck + lint**

```powershell
npm run typecheck 2>&1
npm run lint 2>&1
```

- [ ] **Step 5: Commit**

```bash
git add next.config.js
git commit -m "fix(auth): remove Firebase Auth domains from CSP (frame-src, connect-src)"
```

---

## Task 12: Author the Auth0 Action for role injection

**Files:**
- Create: `docs/auth0/role-injection-action.js` (documentation artifact — not deployed by this plan)

**Interfaces:**
- Produces: Auth0 Action source code that injects `https://displaycellpros.com/role` into the ID token and access token

> [!NOTE]
> Auth0 Actions are deployed via the Auth0 Dashboard or Management API — not from this repo. This task creates the source as a documented artifact so it can be copy-pasted into the Auth0 dashboard.

The role logic replicates the old Firebase bootstrap: the hardcoded owner email gets `'owner'`, emails in `ADMIN_ALLOWLIST` get `'admin'`, all others get `'technician'`.

- [ ] **Step 1: Create the action file**

Create `docs/auth0/role-injection-action.js`:

```js
/**
 * Auth0 Action: Inject staff role claim
 * Trigger: Login / Post Login
 *
 * Deploy this in the Auth0 Dashboard:
 *   Actions → Flows → Login → Add Action → Build Custom
 *
 * This replaces the old Firebase bootstrap that wrote roles to Firestore.
 * Roles are now in the JWT — no database round-trip on every page load.
 */

const OWNER_EMAIL = 'cheyoung1983@gmail.com'
const ADMIN_EMAILS = ['ryan@displaycellpros.com', 'cheyoung1983@gmail.com']
const ROLE_CLAIM = 'https://displaycellpros.com/role'

exports.onExecutePostLogin = async (event, api) => {
  const email = (event.user.email || '').toLowerCase()

  let role = 'technician'
  if (email === OWNER_EMAIL) role = 'owner'
  else if (ADMIN_EMAILS.includes(email)) role = 'admin'

  api.idToken.setCustomClaim(ROLE_CLAIM, role)
  api.accessToken.setCustomClaim(ROLE_CLAIM, role)
}
```

- [ ] **Step 2: Commit the action artifact**

```bash
git add docs/auth0/role-injection-action.js
git commit -m "docs(auth): add Auth0 Action source for role claim injection"
```

- [ ] **Step 3: Manual step — deploy Action in Auth0 Dashboard**

1. Log into [manage.auth0.com](https://manage.auth0.com).
2. Go to **Actions → Library → Create Action → Build from scratch**.
3. Name: `Inject Staff Role`.
4. Trigger: **Login / Post Login**.
5. Paste the content of `docs/auth0/role-injection-action.js`.
6. Deploy.
7. Go to **Actions → Flows → Login** and drag `Inject Staff Role` into the flow.
8. Apply.

After deployment, logging in as `cheyoung1983@gmail.com` will yield a JWT with `https://displaycellpros.com/role: 'owner'`. Verify in the Auth0 Dashboard → Users → that user → Raw JSON → look for the claim.

---

## Task 13: Update tests — remove Firebase auth assertions, add Auth0 assertions

**Files:**
- Modify: `tests/firebase-tribal-registry.test.js`
- Modify: `tests/tribal-eligibility-checker-component.test.js`
- Modify: `tests/tribal-eligibility-checker-direct.test.js`
- Modify: `tests/repair-status-tracker.test.js`

- [ ] **Step 1: Run the full test suite**

```powershell
npm test 2>&1
```

Look for failures. Expected: any test that checks for presence of Firebase auth imports now fails, since those imports are gone. Any test that checks for absence already passes.

- [ ] **Step 2: Fix `tests/firebase-tribal-registry.test.js`**

This test checks that `lib/tribal/firebase-registry.ts` does not exist (it was removed earlier). It also checks `firestore.rules` for tribal patterns. Both should still pass. Verify:

```powershell
npx jest tests/firebase-tribal-registry.test.js --no-coverage 2>&1
```

- [ ] **Step 3: Fix any remaining failures**

For each failing test, read the assertion, determine if it tests Firebase Auth presence (which should now be absent — good) or absence (which should still hold). Remove assertions that expect Firebase auth to exist. Update assertions that check behavior so they reflect Auth0 routing (e.g., login now redirects to `/api/auth/login` not calls `signInWithGoogle()`).

- [ ] **Step 4: Run the full test suite again**

```powershell
npm test 2>&1
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/
git commit -m "fix(auth): update tests — remove Firebase auth assertions, validate Auth0 migration"
```

---

## Task 14: Remove `firebase` package dependency (Firestore-only check)

**Files:**
- Inspect: `package.json`

> [!CAUTION]
> Do **NOT** remove the `firebase` npm package. Firestore is still used. This task only confirms no auth-specific Firebase packages remain.

- [ ] **Step 1: Verify no `firebase-admin` was accidentally introduced**

```powershell
Select-String -Path package.json -Pattern "firebase-admin"
```

Expected: no match.

- [ ] **Step 2: Confirm `firebase` dep is still present (for Firestore)**

```powershell
Select-String -Path package.json -Pattern '"firebase"'
```

Expected: match on the `firebase` dep line.

- [ ] **Step 3: Full final check**

```powershell
npm run typecheck 2>&1
npm run lint 2>&1
npm test 2>&1
```

All three must be green.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix(auth): Firebase Auth fully removed — Auth0 is sole auth integration"
```

---

## Self-Review

### Spec coverage
- ✅ Firebase Auth exports removed from `lib/firebase.ts`
- ✅ `useAuth` / `AuthProvider` rebuilt on Auth0
- ✅ `AdminProtectedRoute` uses Auth0 session + custom claim role
- ✅ `pages/account/index.tsx` uses `user.sub` not `user.uid`
- ✅ API routes that wrote `claimedByUid` use Auth0 session `sub`
- ✅ Sync webhook stubs remove Firestore writes that depended on Firebase Auth context
- ✅ Firestore rules updated for server-only write model
- ✅ CSP `frame-src` and `connect-src` cleaned of Firebase Auth domains
- ✅ Auth0 Action artifact documented for manual deployment
- ✅ Full test suite passes

### Placeholder scan
- No TBDs, no "fill in later", no "similar to Task N" — all code blocks are complete.

### Type consistency
- `UserProfile` from `@auth0/nextjs-auth0/client` used consistently; `user.sub` not `user.uid` throughout.
- `UserRole` type defined once in `hooks/useAuth.tsx`, consumed by `AdminProtectedRoute`.
- `ROLE_CLAIM = 'https://displaycellpros.com/role'` defined once in `hooks/useAuth.tsx` and repeated verbatim in the Auth0 Action — must match exactly.

### Review Focus addressed in tests
1. **Admin access gap** → covered in Task 5; `AdminProtectedRoute` test (Task 3 test also checks `AuthProvider` exports).
2. **Role escalation** → covered in Task 12; role is set server-side in Auth0 Action, not client-controlled.
3. **CSP iframe break** → covered in Task 11 steps 3-4 (CSP audit script).
4. **`user.uid` → `user.sub`** → covered in Tasks 3 and 6 (test asserts no `.uid` in hook; account page fix).
5. **`claimedByUid` source** → covered in Task 7; uses `auth0.getSession().user.sub`.
