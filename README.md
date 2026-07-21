# Hukumnama AI Studio

An AI-powered Sikh content creation web app. Generates status images, videos, quote packs, and social posts inspired by the daily Hukumnama Sahib from Sri Darbar Sahib. Built with React, Firebase, and Google Gemini.

---

## What it does

- Fetches the daily Hukumnama Sahib using Gemini with Google Search grounding
- Generates 9:16 status images (Imagen), background videos (Veo), and Gurbani quote packs
- 26 curated content templates across Gurbani, Gurpurab, Khalsa, Reel, and Inspiration categories
- Two-layer content safety: keyword blocklist + Gemini moderation — runs before every generation
- Credit system gates all AI generation (5 free guest credits, 10 on sign-up, daily bonus, ad rewards)
- Guest mode — no login required to start creating; session history stored locally
- My Creations page with pagination, filter by type, download, and soft-delete
- AdSense banner ads and interstitial between generations; rewarded ad flow (+5 credits)
- Voice command intent parsing via Gemini audio understanding

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Styling | Tailwind CSS v4 (CSS-first, `@theme`) |
| Auth | Firebase Authentication (Google + email) |
| Database | Cloud Firestore |
| Storage | Firebase Storage |
| AI backend | Firebase Cloud Functions v2 (Node 20) |
| AI models | Gemini 2.5 Flash, Imagen, Veo 3 |
| API key | Firebase Secret Manager — never in the browser bundle |

---

## Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project on the **Blaze (pay-as-you-go)** plan — required for Cloud Functions
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)

---

## Local development

### 1. Clone and install

```bash
git clone <repo-url>
cd hukumnama-ai
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` with your Firebase web app credentials (Firebase Console → Project Settings → Your apps):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`VITE_ADSENSE_CLIENT_ID` is optional — leave blank to see a dev placeholder instead of real ads.

### 3. Run the frontend

```bash
npm run dev
```

The app opens at `http://localhost:5173`. Guest mode works immediately (5 free session credits). AI generation requires Cloud Functions running — see [FIREBASE_FUNCTIONS.md](FIREBASE_FUNCTIONS.md).

---

## Firebase setup (one-time)

In the Firebase Console for your project:

1. **Authentication** — Enable Google and Email/Password sign-in providers
2. **Firestore** — Create a database (start in test mode, then deploy rules below)
3. **Storage** — Click "Get started"
4. **Functions** — Requires Blaze plan

Then deploy Firestore rules, indexes, and Storage rules:

```bash
firebase deploy --only firestore,storage
```

---

## Deployment

Full production deploy:

```bash
# Set the Gemini API key in Secret Manager (one-time)
firebase functions:secrets:set GEMINI_API_KEY

# Build and deploy everything
npm run build
firebase deploy
```

This deploys: Cloud Functions, Firestore rules + indexes, Storage rules, and hosting.

For a functions-only redeploy after changes:

```bash
firebase deploy --only functions
```

See [FIREBASE_FUNCTIONS.md](FIREBASE_FUNCTIONS.md) for local emulator setup and testing.

---

## Project structure

```
hukumnama-ai/
  src/
    components/        UI components (generators, ads, modals)
    contexts/          AuthContext, GuestSessionContext
    firebase/          Firestore helpers, auth wrappers, config
    hooks/             useCredits (dual-mode: Firestore / localStorage)
    pages/             Studio, Creations, Credits, Auth, Policy pages
    services/          geminiService.ts — all httpsCallable wrappers
    constants/         Templates, credit costs, prompt templates
    types/             Shared TypeScript interfaces
  functions/
    src/
      index.ts         All Cloud Functions (prefixed hukumnama*)
      ads.ts           Rewarded ad grant function
      moderation.ts    Blocklist + Gemini content safety
  firestore.rules      Security rules
  firestore.indexes.json  Composite indexes
  storage.rules        Storage security rules
```

---

## Content safety

Every AI generation goes through a two-layer check before any credits are spent:

1. **Keyword blocklist** — fast regex pass; catches obvious violations (facial depictions of the Ten Gurus, sexual content, mockery of Sikh faith, hate speech)
2. **Gemini moderation** — nuanced check for anything the blocklist misses

Refusals are logged to the `refusals/` Firestore collection (Admin SDK only, no client access). See the Content Policy page in the app for the full list of what is and isn't permitted.

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Storage bucket name |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_ADSENSE_CLIENT_ID` | No | AdSense publisher ID (`ca-pub-...`). Omit for dev placeholder. |
| `GEMINI_API_KEY` | Functions only | Set via Secret Manager, not `.env`. See [FIREBASE_FUNCTIONS.md](FIREBASE_FUNCTIONS.md). |
