# Firebase Functions — Local Development and Deployment

All AI calls (Gemini, Imagen, Veo) run inside Firebase Cloud Functions. The Gemini API key lives in Firebase Secret Manager and never touches the browser bundle.

---

## Functions in this project

All functions are prefixed `hukumnama` to avoid naming conflicts with other projects on the same Firebase account.

| Function name | Trigger | What it does |
|---|---|---|
| `hukumnamaGetHukumnama` | `onCall` | Fetches daily Hukumnama via Gemini + Google Search |
| `hukumnamaGenerateImage` | `onCall` | Generates image via Imagen, uploads to Storage |
| `hukumnamaGenerateVideo` | `onCall` | Generates video via Veo, uploads to Storage |
| `hukumnamaGenerateVideoFromImage` | `onCall` | Image-to-video via Veo, uploads to Storage |
| `hukumnamaGeneratePost` | `onCall` | Generates social post text via Gemini |
| `hukumnamaGenerateQuotePack` | `onCall` | Generates Gurbani quote pack via Gemini |
| `hukumnamaProcessVoice` | `onCall` | Parses voice audio to intent via Gemini |
| `hukumnamaModerateContent` | `onCall` | Content safety pre-check (blocklist + Gemini) |
| `hukumnamaGrantAdReward` | `onCall` | Grants +5 credits after rewarded ad, rate-limited (3/day) |

---

## Part 1 — Local emulator setup

Running functions locally lets you test without deploying. The Firebase Emulator Suite runs a local Functions runtime that the frontend calls automatically.

### Step 1 — Install dependencies

```bash
cd functions
npm install
cd ..
```

### Step 2 — Create the local secrets file

The emulator cannot read from Firebase Secret Manager, so you provide the key in a local file instead. This file is gitignored.

```bash
# Create functions/.env.local
echo "GEMINI_API_KEY=your_gemini_api_key_here" > functions/.env.local
```

Replace `your_gemini_api_key_here` with your key from [Google AI Studio](https://aistudio.google.com).

### Step 3 — Point the frontend at the emulator

In `src/firebase/config.ts`, add the emulator connection after `initializeApp`. Only do this while testing locally — remove before deploying.

```ts
import { connectFunctionsEmulator } from 'firebase/functions';

// Add this line after: export const functions = getFunctions(app);
connectFunctionsEmulator(functions, '127.0.0.1', 5001);
```

> **Important:** Remove or comment out `connectFunctionsEmulator` before running `firebase deploy`. If you leave it in, your production frontend will try to call localhost.

### Step 4 — Start the emulator

Open a terminal and run:

```bash
firebase emulators:start --only functions
```

The emulator starts on port 5001 by default. You will see output like:

```
functions: Loaded functions definitions from source: hukumnamaGetHukumnama, hukumnamaGenerateImage, ...
functions: http function initialized (http://127.0.0.1:5001/...)
All emulators ready!
```

### Step 5 — Start the frontend

In a second terminal:

```bash
npm run dev
```

The frontend now calls the local emulator for all AI generation. Auth and Firestore continue talking to your real Firebase project.

---

## Part 2 — Testing functions locally

### Watch function logs

While the emulator is running, all `console.log` output from your functions appears in the emulator terminal. Watch that window when you trigger a generation from the UI.

### Test with the Firebase Emulator UI

The emulator also serves a local web UI at `http://127.0.0.1:4000` when you run:

```bash
firebase emulators:start --only functions --inspect-functions
```

You can trigger callable functions directly from the UI for quick tests without the frontend.

### Run TypeScript type-check on functions

```bash
cd functions
npx tsc --noEmit
```

### Build functions (compile TypeScript to JS)

```bash
cd functions
npm run build
```

The compiled output goes to `functions/lib/`. The emulator runs from this compiled output, so rebuild after code changes (the emulator does not auto-rebuild):

```bash
# Quick rebuild + restart cycle
cd functions && npm run build && cd .. && firebase emulators:start --only functions
```

### Common emulator issues

| Issue | Fix |
|---|---|
| `GEMINI_API_KEY not set` | Check `functions/.env.local` exists and has the key |
| `Function not found` | Run `npm run build` in `functions/` first |
| Frontend still hitting production | Confirm `connectFunctionsEmulator` is in `src/firebase/config.ts` |
| Port 5001 already in use | Run `firebase emulators:start --only functions --port 5002` and update the `connectFunctionsEmulator` call to match |

---

## Part 3 — Deploying to production

### One-time setup — store the Gemini API key in Secret Manager

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

You will be prompted to paste the key. It is encrypted and stored in Google Secret Manager — never in your code or environment files.

To verify it was stored:

```bash
firebase functions:secrets:access GEMINI_API_KEY
```

### Deploy functions only

```bash
firebase deploy --only functions
```

This runs `npm run build` in `functions/` automatically (via the `predeploy` hook in `firebase.json`), then uploads the compiled code.

### Deploy everything at once

```bash
npm run build          # build the frontend
firebase deploy        # deploy functions + hosting + firestore + storage
```

This is the full production deploy. Run it when you have changes across both the frontend and functions.

### Deploy specific services

```bash
# Functions + Firestore rules only
firebase deploy --only functions,firestore

# Hosting only (frontend build)
firebase deploy --only hosting

# Firestore rules + indexes only
firebase deploy --only firestore
```

### Check deployed functions in the console

After deploying, your functions appear in the Firebase Console under **Functions**. They will all be prefixed `hukumnama`:

```
hukumnamaGetHukumnama
hukumnamaGenerateImage
hukumnamaGenerateVideo
...
```

### View production logs

```bash
firebase functions:log
```

Or filter to a specific function:

```bash
firebase functions:log --only hukumnamaGenerateImage
```

---

## Part 4 — Before going live checklist

- [ ] `connectFunctionsEmulator` removed from `src/firebase/config.ts`
- [ ] `GEMINI_API_KEY` set in Secret Manager (`firebase functions:secrets:access GEMINI_API_KEY` to verify)
- [ ] `.env` has all `VITE_FIREBASE_*` values
- [ ] Firestore rules deployed (`firebase deploy --only firestore`)
- [ ] Firebase Auth has Google and Email/Password providers enabled
- [ ] Firebase project is on the Blaze plan
- [ ] Storage is enabled in the Firebase Console
- [ ] Frontend built without errors (`npm run build`)

---

## File reference

```
functions/
  src/
    index.ts          Main functions file — all hukumnama* exports
    ads.ts            hukumnamaGrantAdReward
    moderation.ts     Blocklist + Gemini safety check (not exported, used internally)
  lib/                Compiled output — gitignored, auto-generated by npm run build
  .env.local          Local secrets — gitignored, never commit this
  package.json
  tsconfig.json
```
