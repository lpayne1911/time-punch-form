# Velvet — MVP (Phase 1: Core Safe-Dating Slice)

A private, consent-first dating & community web app for verified adults, built
compliance-first per the [product blueprint](../lifestyle-dating-app-blueprint.md).
This is the **Phase 1 walking skeleton**: a clickable, end-to-end happy path with
the safety and privacy primitives wired in from day one.

> Demo / reference implementation. Not production-hardened. See "Before production" below.

## Stack
- **Next.js 15** (App Router, React 19, TypeScript) — one full-stack codebase
- **Prisma + SQLite** for zero-config local dev (maps to PostgreSQL in prod, blueprint §35)
- Passwordless **email OTP** auth, cookie sessions
- No external services required to run locally

## What's implemented (maps to blueprint sections)
| Area | Blueprint | Status |
|---|---|---|
| Hard age gate (18+) + coarse-DOB assurance | §7, §8 | ✅ |
| Passwordless OTP auth + sessions | §7 | ✅ |
| Versioned Consent Pledge + Community Standards | §8, §17 | ✅ |
| No-solicitation / no-explicit notices | §8, §13 | ✅ |
| Privacy-first profile (controlled-vocab tags only, no free-text explicit fields) | §9, §13 | ✅ |
| Compatibility matching (values-based, not appearance) | §10 | ✅ |
| Blur-photo-until-mutual-match | §9, §20 | ✅ |
| Mutual-match-gated messaging | §11 | ✅ |
| Message moderation (solicitation/threat flagging → review queue) | §11, §18 | ✅ |
| Off-platform contact-info safety nudge | §11 | ✅ |
| Consent reminder + meeting-safety nudges | §11 | ✅ |
| Report (categorized) + block (closes conversation) | §11, §17 | ✅ |
| Visibility controls, incognito, emergency pause | §19, §20 | ✅ |
| Data export + hard account deletion | §19, §22 | ✅ |
| Safety Center | §5, §17 | ✅ |
| Photo upload + moderation pipeline (PENDING → human review) | §17, §18 | ✅ |
| Access-controlled photo serving (hidden until mutual match) | §9, §19, §20 | ✅ |
| Admin/moderation dashboard (reports, photos, flagged msgs, users, audit) | §36 | ✅ |
| Enforcement: warn / suspend / ban + lazy auto-expiry | §17 | ✅ |
| Append-only audit log of every moderator action | §17, §19, §36 | ✅ |
| Subscription tiers + entitlement model (Plus/Premium/Private Circle) | §21–§24 | ✅ |
| Feature gating: likes cap, see-who-likes-you, incognito, verified-only, travel, hide | §22–§24 | ✅ |
| Compliant paywall + cancel/resume (no dark patterns) | §29 | ✅ |
| Store-billing-ready architecture (dev purchase stand-in) | §33 | ✅ |

### Monetization (`/premium`)
Revenue comes only from **privacy, discovery, and convenience** — never access to
people or content (blueprint §21, §34). Safety tools are never gated (§22).
- **Free** — full safety tools, basic discovery, 10 likes/day, messaging on mutual match.
- **Plus** ($14.99/mo · $89.99/yr) — unlimited likes, see who likes you, read receipts.
- **Premium** ($29.99/mo · $179.99/yr) — + incognito, verified-only browsing, travel mode,
  advanced filters, hide-from-discovery, visibility audit.
- **Private Circle** ($59.99/mo · $399.99/yr) — + private circles, priority review, concierge.

Tiers, prices, and the cumulative feature map live in `src/lib/billing.ts`;
entitlement resolution and the daily-like cap in `src/lib/entitlements.ts`. Gates
are enforced server-side (API routes + server actions), not just hidden in the UI.

| Verified-host applications + admin host review | §27 | ✅ |
| Event lifecycle: create → admin approval → public listing | §12, §26 | ✅ |
| RSVP with capacity/waitlist + attendee privacy (count only) | §12, §26 | ✅ |
| Event reporting → moderation queue | §12 | ✅ |
| Private circles (tier-gated, moderated, approval-based) | §12, §24 | ✅ |
| Admin community queue (hosts, events, circles, memberships) | §36 | ✅ |
| Provider-based verification (photo liveness + ID) with webhook flow | §17 | ✅ |
| Verification levels + trust badges + provider-backed age assurance | §17 | ✅ |
| Admin verification review queue | §17, §36 | ✅ |
| À-la-carte add-ons: profile boost, thoughtful intros, travel pass | §25 | ✅ |

### Add-ons (`/shop`)
One-time consumable purchases that improve **visibility, discovery, or
convenience** — never access to a person or content (`src/lib/shop.ts`,
`src/lib/purchases.ts`):
- **Profile Boost** — a 60-minute window that raises your discovery ranking for
  other members (visibility only, never a guaranteed match).
- **Thoughtful Intros (super-likes)** — surface higher on someone's Likes list;
  connection still requires **mutual interest** (no paid access to a person, §34).
- **Travel Pass** — 24-hour temporary travel mode for non-premium members.
- Credits are granted on purchase and consumed atomically. Purchases use the same
  store-billing-ready, dev-only simulated flow as subscriptions (§33).

### Verification (`/verify`)
Trust levels: **Unverified → Email → Photo → ID** (`src/lib/verification-levels.ts`).
- `src/lib/verification.ts` is a **provider abstraction** shaped like Persona /
  Veriff / Stripe Identity: `start()` opens a hosted flow, the provider POSTs a
  signed result to `/api/verification/webhook`, and `applyDecision()` raises the
  user's level (never downgrades) and sets age assurance on ID approval.
- The **dev provider** routes to `/verify/simulate/[checkId]` (a local stand-in
  for the hosted flow) which calls the same webhook a real provider would.
- The webhook **rejects unsigned calls in production** (signature verification is
  the documented TODO) and only accepts the dev simulation outside production.
- **Privacy:** we store only the decision + a tokenized `externalId` — never raw
  ID images or document numbers (§19, §40).
- Checks needing human review surface in the **admin verification queue**
  (`/admin/verification`); every manual decision is written to the audit log.

### Community & events (`/events`, `/circles`)
- **Hosts** apply (`/events/host`); a moderator approves before they can publish.
- **Events** are created by verified hosts and are **reviewed before listing** —
  only the non-explicit, lawful categories in `src/lib/events.ts` are allowed.
- **RSVP** respects capacity (auto-waitlist) and keeps attendee identities private
  (only an aggregate count is shown). Free events RSVP directly.
- **Paid tickets are real-world goods** settled by an external processor (Stripe
  Connect), kept separate from store-billed subscriptions (§33). Hosts receive
  payouts minus a 15% platform fee and handle their own taxes. The demo records
  the reservation; a real build creates a Stripe Checkout session + payment webhook.
- **Private circles** are reserved for the Private Circle tier, moderated, and
  approval-gated (both the circle and each join request).
- The **admin Community queue** (`/admin/community`) approves hosts, events,
  circles, and membership requests; every decision is written to the audit log.

**Payment compliance (§33):** on real iOS/Android, digital subscriptions go through
Apple IAP / Google Play Billing (via RevenueCat), and a verified webhook grants the
entitlement — we never route around store billing or collect card details in-app.
The `/api/billing/subscribe` route is a **dev-only simulated purchase** (disabled in
production) that exists solely to exercise the entitlement model locally.

### Moderation dashboard (`/admin`)
Staff-only (role `MODERATOR`/`ADMIN`). Sign in as the seeded **admin@demo.velvet**
via the normal OTP flow, then open **/admin**:
- **Dashboard** — queue counts + safety north-stars (report rate, etc., blueprint §32)
- **Reports** — open reports, urgent (minor-safety/threats) first; resolve with a note
- **Photos** — approve/reject pending uploads (hidden from members until approved)
- **Flagged** — messages auto-flagged for solicitation/threats
- **Users** — search + warn / suspend (N days) / ban / reinstate
- **Audit** — append-only log of every action (who, what, whom, when)

Photos live outside `public/` and are only served through `/api/photo/[id]`,
which serves the image to the owner, a moderator, or a confirmed mutual match
(when approved) — everyone else gets a blurred placeholder.

## Run it
```bash
cd velvet
npm install
npm run db:push     # create the SQLite schema
npm run db:seed     # add 4 wholesome, compatible demo members
npm run dev         # http://localhost:3000
```

### Try the flow
1. Open `/`, click **Enter**.
2. Enter any email → in **dev mode the 6-digit code is shown on screen**
   (in production it is delivered by email/SMS and never returned to the client).
3. Walk the funnel: age gate → consent pledge → community standards → profile.
4. On **Discover**, express interest. The seeded members let you exercise matching;
   to see a mutual match instantly you can express interest from two accounts.
5. In a conversation, try sending text with "rates/cashapp" (gets **flagged**) or a
   phone number (triggers a **safety nudge**). Use **Report**/**Block** from the thread.
6. Visit **Settings** to toggle incognito, pause, export data, or delete the account.

## Architecture notes
- `src/lib/tags.ts` — the **controlled vocabulary**. Profile text can only come from
  these curated, non-explicit lists; submissions are sanitized against them. This is
  the structural reason in-app text stays store-compliant (blueprint §13).
- `src/lib/safety.ts` — transparent moderation heuristics + report categories. In
  production, augment with Hive / Perspective / Rekognition (blueprint §35).
- `src/lib/matching.ts` — weighted compatibility scoring; photos contribute nothing.
- `src/lib/policy.ts` — versioned pledge/standards text; bumping a version forces re-acceptance.
- `next.config.ts` sets security headers (X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, `X-Robots-Tag: noindex`, and HSTS in production).

## Hardening (implemented)
- **Auth rate limiting** (`src/lib/ratelimit.ts`): OTP requests are capped per
  email (3 / 15 min) and per IP (10 / 15 min); verify attempts per email (5) and
  per IP (30) — combined with the 10-minute code expiry this defeats code
  brute-force. In-memory for now; swap the Map for Redis in production.
- **Webhook signature verification** (`src/lib/webhooks.ts`): constant-time HMAC-
  SHA256 over the raw body. The verification webhook **fails closed** — it refuses
  unsigned/invalid calls and returns 503 when no secret is configured. The dev
  verification flow does NOT use the public webhook; it runs through an
  authenticated server action (`/verify/simulate`), so the webhook stays strict
  in every environment.
- **Security headers** + `poweredByHeader: false` (no `X-Powered-By`).
- **Env-driven datasource** for a one-line Postgres swap.

### Required production environment variables
- `DATABASE_URL` — Postgres connection string (and set `provider = "postgresql"`).
- `VERIFICATION_WEBHOOK_SECRET` — HMAC secret shared with the identity provider.
- `BILLING_WEBHOOK_SECRET` — for the (future) RevenueCat/Stripe billing webhook.
- Run with `NODE_ENV=production` (this disables all dev-only routes: OTP-code
  echo, the simulated subscribe/purchase, and the verification simulate page).

## Before production (still outstanding)
- Real email/SMS delivery for OTP codes.
- Swap SQLite → PostgreSQL (`provider` + `DATABASE_URL`); encryption at rest, a
  managed secrets store, and a shared rate-limit store (Redis).
- Wire a real image-moderation provider (Hive/Rekognition) into the photo pipeline.
- Integrate real identity verification (Persona/Veriff/Stripe Identity) → the
  signed webhook is ready; point the provider at `/api/verification/webhook`.
- Apple IAP / Google Play Billing via RevenueCat for subscriptions and consumables,
  plus Stripe Connect + a signed billing webhook for events (§33).
- Legal review of ToS, privacy policy, FOSTA/SESTA posture (§40).
