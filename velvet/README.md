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
- `next.config.ts` sets `X-Robots-Tag: noindex` — no public indexing of member content.

## Before production (not yet built — later phases per blueprint §37)
- Real email/SMS delivery for OTP; rate-limiting + abuse protection on auth.
- Swap SQLite → PostgreSQL; encryption at rest, secrets management.
- Real image upload + automated nudity moderation + human review queue UI (admin dashboard, §36).
- Provider-based age assurance & identity/photo verification (§17).
- Apple IAP / Google Play Billing via RevenueCat for subscriptions (§33) — none of the
  monetization surfaces are in this slice by design.
- Legal review of ToS, privacy policy, FOSTA/SESTA posture (§40).
