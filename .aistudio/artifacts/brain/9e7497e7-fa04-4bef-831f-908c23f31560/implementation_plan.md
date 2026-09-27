# Implementation Plan: Container Build Directory Alignment & ElevenLabs Real-Time Events

## Overview
This plan addresses the container directory alignment to ensure build and dev server scripts execute reliably, resolves build and runtime warnings, and implements the requested ElevenLabs Conversational Agents features: full client-to-server events (`contextual_update` and `user_activity` pings).

---

## User Input Alignment
- **Primary Build Priority**: Fix container directory alignment and build script paths between `/` and `/app/applet`.
- **Primary Agent Priority**: Full client-to-server events for contextual updates (UI navigation, cart mutations, catalog search) and activity pings to prevent turn timeouts.

---

## Phase 1: Container Directory & Build Alignment
1. **Build Runner Directory Normalization**:
   - In `scripts/build.cjs`, ensure environment detection and path resolution work seamlessly whether npm is executed in `/app/applet`, `/`, or a container build environment.
   - Guard all sub-processes (`precheck`, `next build`) with explicit `cwd` parameter pointing to the resolved project directory.
2. **Next.js & Server Path Consistency**:
   - Ensure `package.json` scripts execute with normalized paths and proper environment variable references.
   - Verify dev server startup (`next dev -p 3000 -H 0.0.0.0`) is healthy on port 3000.

---

## Phase 2: ElevenLabs Client-to-Server Real-Time Events
1. **Contextual Updates (`contextual_update`)**:
   - Add support in `components/ElevenLabsAgent.jsx` to emit non-interrupting background updates:
     - Navigation updates when the user switches pages (e.g., viewing catalog, cart, account).
     - Cart updates when line items or quantities change.
     - Product inspection updates when a user opens a product quick view or repair modal.
2. **User Activity Heartbeat (`user_activity`)**:
   - Implement periodic activity pings during active user interaction (typing, scrolling, modal interaction) to reset the agent turn timeout without disrupting conversation flow.
3. **Queue Status & Enhanced Feedback**:
   - Add visual indicators for `queue_status` ("waiting", "admitted", "timed_out") to distinguish call hold states from active agent speech.

---

## Phase 3: Verification & Health Checks
1. Execute `npm run precheck` and `npm run typecheck` to confirm zero lint or TypeScript compiler errors.
2. Test dev server responsiveness on port 3000.
3. Verify live ElevenLabs conversation session startup with client tools and context updates.
