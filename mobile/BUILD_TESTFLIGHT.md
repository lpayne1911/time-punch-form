# Ship the real native app to your iPhone (TestFlight)

This is the genuine App-Store-style path: a native build installed through
**TestFlight**. The build runs in **Expo's cloud (EAS)** and is triggered from
the **GitHub website**, so you never need a computer. You *do* need two accounts,
and Apple charges for theirs.

## What you need (one-time)

1. **A free Expo account** — sign up at [expo.dev](https://expo.dev).
2. **An Apple Developer account — $99/year** — [developer.apple.com/programs](https://developer.apple.com/programs/).
   This is Apple's requirement for putting any custom app on an iPhone; there's
   no free way around it.

## Setup (from your phone's browser)

### A. Connect the project to EAS
1. On [expo.dev](https://expo.dev), create a project (an "app"). Note the
   **project ID** and your **account/owner** name.
2. Add them to `mobile/app.json` under `expo` (ask me to commit this once you
   have the ID — editing JSON on a phone is no fun):
   ```json
   "owner": "your-expo-account",
   "extra": { "eas": { "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" } }
   ```

### B. Give GitHub permission to build
1. expo.dev → your account → **Access Tokens** → create a token.
2. In GitHub → the repo → **Settings → Secrets and variables → Actions → New
   repository secret**: name `EXPO_TOKEN`, paste the token.

### C. Point the build at your backend
In `mobile/eas.json`, set `EXPO_PUBLIC_API_URL` (under the `production` profile)
to your deployed `velvet` Vercel URL. (Ask me and I'll commit it.)

### D. iOS credentials
The first iOS build needs Apple signing credentials. EAS can create and store
them for you — on the **expo.dev dashboard → your project → Credentials**, sign
in with your Apple Developer account and let EAS manage them. This is the
fiddliest step; ping me when you're here and I'll walk you through it.

## Build it (no computer)

1. GitHub → repo → **Actions** tab → **EAS iOS build** → **Run workflow**.
2. Choose profile `production`, set **Submit to TestFlight** = `true`.
3. EAS builds in the cloud (~15–25 min) and submits to App Store Connect.

## Install on your iPhone

1. Install **TestFlight** from the App Store.
2. In **App Store Connect** (appstoreconnect.apple.com) add yourself as a tester
   for the build.
3. Open TestFlight → install **Velvet**. It's now a real native app on your phone.

---

**Not ready for the $99 yet?** Use the free
[installable web app](./DEPLOY_WEB.md) in the meantime — same UI, added to your
home screen as a standalone app. When you're ready for TestFlight, come back here
and I'll fill in the project ID / URL and help with the Apple credential step.
