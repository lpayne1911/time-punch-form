# Deploy Velvet to Vercel (from your iPhone)

The app lives in the **`velvet/`** subfolder and uses **Postgres**. These are the
exact settings Vercel needs. All steps work from Safari on vercel.com.

## 1. Project settings (Settings → General)
- **Root Directory:** `velvet`  ← critical (the app is in this subfolder)
- **Framework Preset:** Next.js (set it if it shows "Other")
- Build Command / Install Command: leave as default — the repo's `npm run build`
  already runs `prisma generate && prisma db push && seed && next build`.

## 2. Add a database (Storage tab)
- Create a **Vercel Postgres** store and connect it to this project
  (or use any Postgres, e.g. Neon, and copy its connection string).
- Then add an env var so Prisma can find it:
  - **Settings → Environment Variables → Add**
  - Name: **`DATABASE_URL`**
  - Value: the **`POSTGRES_URL_NON_POOLING`** connection string from the storage
    page (the non-pooled URL works for both schema setup and queries).
  - Apply to: Production, Preview, Development.

## 3. Enable preview login (Environment Variables)
No email/SMS sender is wired up yet, so add:
- Name: **`PREVIEW_LOGIN`**  Value: **`1`**

With this set, the 6-digit sign-in code is shown on screen so you can log in.
**Remove this before any real public launch** — it exposes login codes.

## 4. Deploy
- Trigger a redeploy (Deployments → ⋯ → Redeploy, or push a commit).
- Open the `…vercel.app` URL → tap **Enter** → any email → the code shows on
  screen → finish onboarding. Admin dashboard: sign in as `admin@demo.velvet`.

## Known preview limitations
- **Photo uploads won't persist** on Vercel (serverless has no writable disk).
  Everything else (profiles, matching, messaging, events, premium, admin) works.
  Production fix: store photos in object storage (S3 / Vercel Blob).
- The in-memory rate limiter resets per serverless instance — fine for a preview.
- Seeding runs at build, so demo members/admin are recreated on each deploy
  (idempotent).

## If the build fails
- "No Next.js detected" → Root Directory isn't `velvet`.
- Prisma/`db push` error → `DATABASE_URL` is missing or wrong (use the
  non-pooling URL).
