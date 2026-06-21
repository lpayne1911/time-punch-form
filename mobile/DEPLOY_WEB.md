# Installable web app — deploy from your iPhone (no computer)

This deploys the app as an **installable web app**. You open it in Safari, tap
**Add to Home Screen**, and it runs full-screen with its own icon — an "app
container" — for free, with no Apple account.

It's a **second Vercel project** (separate from your existing `velvet` one):

- `velvet` project → the backend/API (already deployed)
- new `velvet-app` project → this installable app UI (what you're setting up now)

Everything below works from Safari on your iPhone.

---

## 0. First: make sure the backend has the latest code

The app needs the new API endpoints **and** the cross-origin (CORS) support that
ship in PR #17. Merge that PR (or point your `velvet` Vercel project at the
`claude/mobile-app-architecture-x65yxy` branch) so the backend is up to date.

Also confirm on the **velvet** project → Settings → Environment Variables:

- `PREVIEW_LOGIN` = `1`  (so login codes show on screen)

Note your backend URL, e.g. `https://velvet-xxxx.vercel.app`.

---

## 1. Create the new Vercel project

1. vercel.com → **Add New… → Project**.
2. Import the **same** GitHub repo (`time-punch-form`).
3. **Root Directory** → click *Edit* → choose **`mobile`**. ← important
4. Framework Preset: **Other** (the repo's `mobile/vercel.json` already sets the
   build command `npx expo export -p web` and output `dist`).

## 2. Add the backend URL

Before deploying, open **Environment Variables** and add:

- Name: **`EXPO_PUBLIC_API_URL`**
- Value: your backend URL with **no trailing slash**, e.g.
  `https://velvet-xxxx.vercel.app`
- Apply to: Production + Preview.

(This is baked into the app at build time, so it must be set before/at deploy.
If you change it later, redeploy.)

## 3. Deploy

Hit **Deploy**. When it finishes you'll get a new `…vercel.app` URL — that's the
app.

## 4. Install it on your home screen

1. Open the new URL in **Safari**.
2. Tap the **Share** icon → **Add to Home Screen** → **Add**.
3. Launch it from the new **Velvet** icon — it opens full-screen, no browser bars.
4. Sign in with any email → the 6-digit code appears on screen → onboarding → in.

---

## Notes & limits

- This is the real app UI (onboarding, swipe deck, tabs, messages, premium,
  settings). The swipe-deck *physics* feel a little smoother on a true native
  device than in a browser — everything else is the same.
- Photos still won't persist on the preview backend (serverless has no disk —
  see `velvet/DEPLOY.md`).
- If the login screen says **"Can't reach Velvet,"** double-check
  `EXPO_PUBLIC_API_URL` (exact URL, no trailing slash) and that PR #17 is
  deployed to the backend (CORS lives there).
