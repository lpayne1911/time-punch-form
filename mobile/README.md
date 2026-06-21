# Velvet — Native Mobile Client (Expo)

A true native app (iOS + Android) for Velvet, built with **Expo + React Native +
expo-router**. This is the mobile front end; it talks to the existing Velvet
backend (the Next.js app in [`../velvet`](../velvet)) over HTTP and reuses its
matching, safety, billing, and verification logic unchanged.

> This replaces the "make the website look like an app" approach. The web app
> remains the backend / admin / reference surface; this is the product members
> install.

## Stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Runtime            | Expo SDK 52 (React Native 0.76, new architecture)  |
| Navigation         | `expo-router` (typed routes), native bottom tabs   |
| Gestures           | `react-native-gesture-handler`                     |
| Animation          | `react-native-reanimated` (swipe deck)             |
| Safe areas         | `react-native-safe-area-context`                   |
| Secure token store | `expo-secure-store`                                |
| Theme              | Design tokens in `theme/tokens.ts` (no CSS)        |

## Layout

```
app/
  _layout.tsx          # providers: gesture root, safe-area, auth, themed Stack
  index.tsx            # bootstrap → age-gate or tabs
  (auth)/
    age-gate.tsx       # consent-first 18+ entry
    login.tsx          # passwordless email + code
  (tabs)/
    _layout.tsx        # native bottom tabs (Discover/Likes/Matches/Events/Profile)
    discover.tsx       # full-screen swipe deck
    likes.tsx  matches.tsx  events.tsx  profile.tsx
components/
  SwipeDeck.tsx        # PanGesture + Reanimated card stack (like/pass/super-like)
  SwipeCard.tsx        # compatibility-first card (photos blurred pre-match)
  MatchOverlay.tsx     # "it's mutual" modal
  ui/                  # Screen, AppHeader, Button, Tag, EmptyState
lib/
  api.ts               # typed API client (Bearer auth via SecureStore)
  auth.tsx             # AuthProvider / useAuth
  config.ts  types.ts  haptics.ts
theme/tokens.ts        # colors, spacing, radius, gradients
```

## How auth works with the existing backend

The web app authenticates with an **httpOnly cookie**, which a native client
can't use. The backend was extended **additively** (no change to the web flow):

- `POST /api/auth/verify` with header `x-velvet-client: native` now also returns
  the session `token` in the body. The app stores it in `expo-secure-store`.
- Every request sends `Authorization: Bearer <token>`. `getCurrentUser()` reads
  the bearer token when no cookie is present.

JSON endpoints added for the native client:

- `GET /api/me` — current member + profile summary
- `GET /api/discover` — ranked compatibility deck (reuses `getCandidates`)
- `GET /api/likes` — who likes you (gated by `seeWhoLikedYou`)
- `GET /api/matches` — bucketed match list
- `GET /api/messages/[matchId]` — full conversation (marks read, builds starters)
- `GET /api/events`, `POST /api/events/rsvp` — events list + reserve/cancel
- `GET /api/billing` — entitlements, tiers, à-la-carte catalog
- `GET/POST /api/settings` — privacy/safety toggles (premium-gated to enable)
- existing `POST /api/like`, `/api/superlike`, `/api/message`, `/api/match`,
  `/api/report`, `/api/block`, `/api/billing/subscribe`, `/api/billing/purchase`
  now accept bearer auth

## Running it

> **Want to try it on your phone?** See **[RUN_ON_IPHONE.md](./RUN_ON_IPHONE.md)** —
> a step-by-step guide using Expo Go against your deployed Vercel backend.

This is a **native app**, so it is *not* served from a Vercel URL — Vercel hosts
only the `velvet/` backend. You run the app through Expo Go (phone) or a
simulator, and it talks to the backend over HTTP.

From this `mobile/` directory:

```bash
# Point at your backend. For a real phone, use your DEPLOYED Vercel URL:
echo "EXPO_PUBLIC_API_URL=https://your-velvet-app.vercel.app" > .env
# (or, against a local backend in another terminal: cd ../velvet && npm run dev)

npm install
npx expo start          # add --tunnel if the phone isn't on your Wi-Fi
```

`EXPO_PUBLIC_API_URL` (see `.env.example`) is the one thing to set. If it's
unset, the app falls back to inferring a local dev server:

- iOS simulator reaches a local host at `http://localhost:3000`
- Android emulator must use `http://10.0.2.2:3000`
- A physical device on a local backend must use your machine's LAN IP

To get login codes without an email provider, the backend must run with
`PREVIEW_LOGIN=1` — the 6-digit code is then shown in the app.

## Product & store guardrails

Consent-first, mature, private — never explicit or transactional. Photos are
blurred until a mutual match; Discover leads with **why** two people are
compatible (shared values/intentions), never a desirability score. This keeps
the client Apple/Google review-friendly.

## Modules

All core modules from the product spec are wired to live API data:

| Module            | Screen                          | Backed by                          |
| ----------------- | ------------------------------- | ---------------------------------- |
| Login / age gate  | `(auth)/age-gate`, `(auth)/login` | `/api/auth/*`                    |
| Onboarding        | `onboarding`                    | `/api/onboarding`, `/api/onboarding/config` |
| Discover          | `(tabs)/discover`               | `/api/discover`, like/superlike    |
| Likes             | `(tabs)/likes`                  | `/api/likes` (+ upsell when locked)|
| Matches           | `(tabs)/matches`                | `/api/matches`                     |
| Messages          | `messages/[matchId]`            | `/api/messages/[id]`, `/api/message` |
| Events            | `(tabs)/events`                 | `/api/events`, `/api/events/rsvp`  |
| Profile           | `(tabs)/profile`                | `/api/me`                          |
| Premium / add-ons | `premium`                       | `/api/billing` (+ subscribe/purchase) |
| Settings / safety | `settings`                      | `/api/settings`, report/block      |

The **native onboarding funnel** (age gate → consent pledge → community
standards → basics → optional full profile) gates entry: a signed-in member who
hasn't cleared `onboardingNext` is routed to `/onboarding` from both the
bootstrap and the tab guard. In-conversation **report/block** and the
premium-gated privacy toggles are live.

Next phases: mutual photo-reveal rendering in threads, and push notifications.
```
