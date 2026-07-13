# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Link** (link-22.com) — a Saudi services marketplace where clients book providers. Arabic/English, RTL-first. Three deployable pieces:

| Piece | Location | Runs on | Purpose |
|---|---|---|---|
| SPA | [src/](src/) | Vercel | React 18 + Vite + TS. Talks to Firestore **directly** from the browser. |
| Payment server | [server/](server/) | Cloud Run (`server-link`, europe-west3) | Express. Holds `MOYASAR_SECRET_KEY` / PayPal / Stripe secrets. Card capture, void, refund, Apple Pay, Resend emails. |
| Cloud Functions | [functions/](functions/) | Firebase (Node 20) | Firestore triggers + hourly scheduler: booking emails, auto-reject after 24h, auto-refund on rejection. |

There is no REST API between the SPA and the database — the client writes Firestore directly, so [firestore.rules](firestore.rules) *is* the authorization layer. Any change to role semantics or collection shape must be mirrored there.

## Commands

```sh
npm run dev            # SPA on http://localhost:8080 (not 5173)
npm run build          # production build; build:dev for dev-mode build
npm run lint           # eslint
npm test               # vitest run (single pass)
npm run test:watch
npx vitest run src/test/example.test.ts   # one file
npx vitest run -t "test name"             # one test by name

cd server && npm run dev    # payment server on :4242 — needed for any booking/subscription payment flow
```

Deploys: `firebase deploy --only functions` / `--only firestore:rules,storage`. The server auto-deploys to Cloud Run via [.github/workflows/deploy-server.yml](.github/workflows/deploy-server.yml) on push to `main` touching `server/**`. The SPA deploys via Vercel ([vercel.json](vercel.json) rewrites everything to `/` for client routing).

Env: copy [.env.example](.env.example) → `.env.local` (all `VITE_FIREBASE_*` plus `VITE_MOYASAR_*`). Payment pages resolve their backend as `VITE_MOYASAR_API_BASE_URL || VITE_PAYPAL_API_BASE_URL || ""`.

## Architecture

### Roles are an array, not a field

A user has `roles: UserRole[]` **and** `activeRole` (one user can be both CLIENT and PROVIDER and switch between them via `switchRole`). A legacy singular `role` field still exists on old documents and is still read as a fallback by `role()` in [firestore.rules](firestore.rules) — don't delete it without a migration.

- `ProtectedRoute` authorizes on **`roles` membership** ([src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx))
- `RoleBasedRedirect` navigates on **`activeRole`** ([src/App.tsx](src/App.tsx))
- Guest mode: `GuestContext` (localStorage flag) + `allowGuest` on `ProtectedRoute` lets unauthenticated users browse `/client` and `/provider`. Any new page under those trees must tolerate `user === null`.

Auth is real Firebase Auth ([src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)) — `onAuthStateChanged` hydrates the Firestore `users/{uid}` doc into `user`. Signup does a manual rollback (deletes the just-created auth user) if the phone is a duplicate or the Firestore write fails.

### Data layer

All Firestore access goes through [src/lib/firestore.ts](src/lib/firestore.ts) (~2100 lines; collection names in the `COLLECTIONS` const). React Query hooks in [src/hooks/queries/](src/hooks/queries/) wrap those functions and are what components consume. Don't call the Firestore SDK from a component — add a function to `firestore.ts` and a hook next to its siblings.

**Gotcha — silent mock fallbacks:** `getServices`, `getCategories`, and `getProviderProfile` fall back to `DEFAULT_SERVICES` / `DEFAULT_CATEGORIES` / a synthesized profile when Firestore is empty *or the read throws*. An empty or permission-denied database looks fully populated in the UI. When debugging "where did this data come from", check for these before assuming a write succeeded.

### Money: hold → capture, and it is not simple

Booking payments run through **Moyasar with a manual hold**. The booking row does not exist until the money is verified:

1. `BookingPage` stashes a `MoyasarBookingDraft` in localStorage (`MOYASAR_DRAFT_KEY`) and hands off to Moyasar's hosted form.
2. Mada/most Saudi cards force a 3-D Secure **redirect**, so `on_completed` never fires. Finalization therefore has two entry points: `PaymentCallbackPage` (primary, after redirect) and `MoyasarCheckout`'s `on_completed` (fallback, non-3DS).
3. Both call [src/lib/finalizeMoyasarBooking.ts](src/lib/finalizeMoyasarBooking.ts), which is **idempotent**: it de-dupes on the Moyasar payment id, re-verifies status *and amount* server-side via `GET /moyasar/payment/:id`, and only then creates the `PENDING` booking + `AUTHORIZED` payment. Never trust the client-reported payment status; keep this function the only place bookings are created from a payment.
4. Provider **accepts** → `POST /moyasar/capture/:id` charges the held funds *before* the booking flips to `ACCEPTED` ([ProviderDashboardPage](src/pages/provider/ProviderDashboardPage.tsx)). Provider **rejects** → `/moyasar/void/:id` (still held) or `/moyasar/refund/:id` (already captured).
5. Server-side safety nets in [functions/index.js](functions/index.js): `autoRejectExpiredBookings` (hourly, rejects + refunds `PENDING` bookings older than 24h) and `onBookingStatusChanged` (refunds on any transition to `REJECTED`). These two would double-refund each other, so the auto-reject path tags the booking `rejectionReason: "auto_rejected_timeout"` and the trigger skips it. Preserve that guard when touching rejection logic.

The same authorize/verify shape repeats for provider subscriptions ([finalizeMoyasarSubscription.ts](src/lib/finalizeMoyasarSubscription.ts) + `SubscriptionCallbackPage`).

### Provider subscription gating

Providers pay a subscription; `useSubscriptionStatus` ([src/hooks/useSubscriptionStatus.ts](src/hooks/useSubscriptionStatus.ts)) derives `isLocked` / `isExpired` / trial days, expires trials lazily on access (`checkAndExpireTrial`), and reads the `providers` doc with the `users` doc as fallback. `getServices` hides services belonging to `LOCKED` or expired-subscription providers from clients (an N+1 profile fetch per service — beware when adding call sites).

Two distinct verification concepts on `ProviderProfile`, easily confused: `identityVerified` (admin-approved, required to publish services) vs `isVerified` (the "trusted provider" badge, auto-granted after 10 completed bookings via `checkAndGrantTrustedBadge`).

## Conventions

- **Imports:** always `@/...`, never relative paths out of a directory.
- **i18n:** every user-facing string is a key in **both** [ar.json](src/i18n/locales/ar.json) and [en.json](src/i18n/locales/en.json). Direction is flipped on `languageChanged` in [src/i18n/index.ts](src/i18n/index.ts) — test new UI in Arabic/RTL, especially anything with icons, arrows, or absolute positioning.
- **TypeScript is deliberately loose** (`strictNullChecks: false`, `noImplicitAny: false`, unused-vars lint off). Don't "fix" this repo-wide; match local style.
- **shadcn/ui** primitives in [src/components/ui/](src/components/ui/) are generated — regenerate via the CLI rather than hand-editing. Compose with `cn()` from [src/lib/utils.ts](src/lib/utils.ts).
- Chat messages and reviews are screened by `isContentClean` ([src/lib/contentFilter.ts](src/lib/contentFilter.ts)) before submit — keep new free-text surfaces behind it.

## Known stale / dead code

- [.github/copilot-instructions.md](.github/copilot-instructions.md) is **out of date**: its "Implementation Tasks" list marks Firebase auth, Firestore, React Query, chat, payouts, etc. as 🔴 Not Started — all of them are built. Trust the code, not that file.
- [src/pages/placeholders.tsx](src/pages/placeholders.tsx) is unused; every page it stubs now exists.
- [ProviderSchedulePage](src/pages/provider/ProviderSchedulePage.tsx) keeps weekly availability in local React state only — it is never persisted to Firestore, so the `AvailabilityRule` / `AvailabilityException` types are defined but unwritten. Booking time slots do not currently consult real availability.
