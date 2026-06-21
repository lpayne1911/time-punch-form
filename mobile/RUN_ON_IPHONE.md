# Run Velvet on your iPhone (Expo Go)

This is the **native app**. It doesn't live on a Vercel URL — Vercel only hosts
the *backend* (the `velvet/` website + API). To see the real app you run it
through **Expo Go**, Expo's free preview app, which loads the app onto your phone.

There are two pieces:

1. **Backend** — already deployed on Vercel (the `velvet/` project). The phone
   app talks to it over the internet. Nothing to install for this part.
2. **The app's code** — served to your phone by a small "bundler" (Metro) that
   runs with one command. **This needs a computer** (Mac, Windows, or Linux) —
   iOS can't run the bundler itself. The computer and phone don't have to be
   fancy; they just both need internet.

---

## One-time: make sure the backend shows login codes

No email sender is wired up yet, so the 6-digit sign-in code is shown on screen.
In your **Vercel → velvet project → Settings → Environment Variables**, confirm:

- `PREVIEW_LOGIN` = `1`  (Production + Preview)

If you just added it, hit **Redeploy**. Note your app's URL, e.g.
`https://velvet-xxxx.vercel.app`.

---

## On a computer (5 minutes)

You need [Node.js 18+](https://nodejs.org). Then:

```bash
git clone https://github.com/lpayne1911/time-punch-form.git
cd time-punch-form/mobile

# Tell the app where your backend lives (your Vercel URL, NO trailing slash):
echo "EXPO_PUBLIC_API_URL=https://velvet-xxxx.vercel.app" > .env

npm install
npx expo start            # add --tunnel if your phone isn't on the same Wi-Fi
```

A QR code appears in the terminal.

## On your iPhone

1. Install **Expo Go** from the App Store.
2. Open the **Camera** app and point it at the QR code (or open Expo Go →
   *Scan QR code*).
3. Tap the banner — the app downloads and opens in Expo Go.
4. Sign in: type **any email** → the **6-digit code appears on screen** → enter
   it → go through onboarding → you're in.

That's the real, native app — swipe deck, tabs, gestures, the works.

---

## If your phone and computer aren't on the same Wi-Fi

Use a tunnel (routes through the internet instead of the local network):

```bash
npx expo start --tunnel
```

Then scan the QR the same way.

## No computer at all?

Expo Go still needs a bundler running somewhere, which iOS can't do. Two routes:

- **Borrow any computer** for a few minutes and run the steps above with
  `--tunnel` — your phone connects from anywhere.
- **Ship a standalone build** with [EAS Build](https://docs.expo.dev/build/setup/)
  and install it via TestFlight. This is the real App-Store-style path but needs
  an Apple Developer account; tell me if you want to go this route and I'll set
  up the EAS config.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| QR won't connect / stuck loading | Re-run with `npx expo start --tunnel`. |
| "Can't reach Velvet" on the login screen | Check `.env` has your exact Vercel URL with **no trailing slash**, and the site loads in a browser. |
| Login code never appears | Set `PREVIEW_LOGIN=1` on the Vercel velvet project and redeploy. |
| Photos don't show after matching | Expected on the preview — photo storage isn't wired for serverless yet (see `velvet/DEPLOY.md`). |
