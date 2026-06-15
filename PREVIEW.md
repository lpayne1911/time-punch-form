# Preview Velvet on your iPhone (no computer needed)

Velvet is a web app, so you preview it in **Safari**. These steps run it in the
cloud using **GitHub Codespaces** and open it on your phone. Free monthly hours apply.

## One-time, from your iPhone

1. Open **Safari** and go to **github.com**, sign in.
   - Tip: tap the **aA** button in the address bar → **Request Desktop Website**.
     The Codespaces buttons are easier to use in desktop mode.
2. Go to the repo **lpayne1911/time-punch-form**.
3. Switch to the branch **`claude/lifestyle-dating-app-strategy-14xphq`**
   (tap the branch name dropdown and pick it). The app lives on this branch.
4. Tap the green **Code** button → **Codespaces** tab →
   **Create codespace on claude/lifestyle-dating-app-strategy-14xphq**.
5. Wait a few minutes. It installs everything, sets up the demo data, and starts
   the app automatically. (You'll see a VS Code editor in the browser — you don't
   need to touch it.)

## Open the app

6. In the codespace, open the **Ports** tab (bottom panel; in desktop-site Safari
   it's near the terminal). You'll see **"Velvet app" on port 3000**.
7. Tap the **globe / open-in-browser** icon next to port 3000. The app opens in a
   new Safari tab. (If your phone asks, sign in with the same GitHub account.)
8. Add it to your Home Screen for an app feel: Safari **Share → Add to Home Screen**.

## Sign in and look around

- Tap **Enter → type any email → tap Send code**.
- In preview, the **6-digit code is shown on the screen** — type it in and continue
  through the short onboarding (age → consent → community standards → profile).
- On **Discover** you'll see seeded demo members; express interest, match, message.
- To see the **moderator dashboard**, sign in with the email **admin@demo.velvet**
  (same on-screen-code flow), then open **/admin**.

## If the app doesn't load on port 3000

In the codespace **Terminal**, run:

```bash
cd velvet
npm run dev
```

Then open port 3000 from the **Ports** tab again.

## Notes

- The codespace is temporary scratch space — anything you create (test accounts,
  messages) lives only there and is fine to throw away. Stop or delete the
  codespace from github.com when you're done so it doesn't use your free hours.
- This is a **preview**, not the App Store app. Real email codes, photos
  moderation, and payments are wired to live providers only in a production deploy.
