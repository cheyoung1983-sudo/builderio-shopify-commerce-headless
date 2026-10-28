# Implementation Plan - Auth0 Integration (Pages Router)

This plan outlines the integration of Auth0 authentication into the existing Pages Router architecture, replacing Firebase Auth with Auth0.

## Scope of Implementation
1. **SDK Setup**: Configure `@auth0/nextjs-auth0` for the Pages Router (api routes: `/api/auth/[...auth0]`).
2. **Auth Refactor**: Replace `useAuth` hook in `AdminDashboard` and `WholesaleDashboard` with `@auth0/nextjs-auth0/client` (`useUser`).
3. **Route Protection**: Implement `withPageAuthRequired` for administrative pages.
4. **Environment Variables**: Configure Auth0 credentials (ID, Secret, Domain, Secret).

---

## Technical Architecture

### 1. Auth0 API Routes (`/pages/api/auth/[...auth0].ts`)
- Use `handleAuth()` from `@auth0/nextjs-auth0`. This handles login, logout, callback, and user sessions.

### 2. Dashboard Refactoring
- **Admin Dashboard**: Update to use `withPageAuthRequired` and `useUser`.
- **Wholesale Dashboard**: Update to use `useUser` for identity verification and access control.

### 3. Middleware/App Wrapper
- Update `_app.tsx` to wrap components with `UserProvider`.

---

## Verification Plan
- Typecheck, Lint, and Build.
- Functional testing of authentication flows (Login/Logout/Protected Routes).
