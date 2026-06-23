# Hukumnama AI — Product Build Plan

## Overview

An AI-powered content creation platform for Sikh and Punjabi culture. Users generate
Gurbani quote cards, Gurpurab posters, reels templates, and daily inspiration content.
Launched as a PWA first, monetized via ads. Payments are planned for a future phase.

---

## Tech Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Frontend   | React, PWA                                          |
| Auth       | Firebase Auth (Google, Email; Apple later)          |
| Database   | Firestore                                           |
| Storage    | Firebase Storage                                    |
| Functions  | Firebase Cloud Functions                            |
| Hosting    | Firebase Hosting                                    |
| AI         | Gemini (text/moderation), Imagen (images), Veo (video) |
| Ads        | Google AdMob / AdSense                              |
| Payments   | Razorpay + Stripe (future phase)                    |
| Notifs     | FCM                                                 |
| Analytics  | Firebase Analytics / custom                         |

---

## Phases

---

### Phase 1 — Clean Up Existing Code
**Duration:** 2–4 days  
**Goal:** Make the codebase readable and handoff-ready before adding anything new.

**Folder structure:**
```
src/
  components/
  pages/
  hooks/
  services/
  contexts/
  firebase/
  utils/
  types/
```

**Actions:**
- [ ] Audit AI Studio project for dead code, duplicate logic, giant components
- [ ] Move hardcoded API keys to environment variables
- [ ] Remove unused files and dependencies
- [ ] Split oversized components into smaller units
- [ ] Add consistent naming conventions across the codebase

**Exit criteria:** A new developer can orient themselves in under 30 minutes.

---

### Phase 2 — Firebase Foundation
**Duration:** 2 days  
**Goal:** Establish auth, database schema, and storage buckets.

**Auth providers:**
- Google (launch)
- Email/password (launch)
- Apple (post-launch)

**Firestore collections:**

```
users/
  uid, name, email, photoUrl, plan, credits, createdAt

projects/
  userId, name, createdAt

generations/
  userId, type, prompt, resultUrl, creditsUsed, createdAt

adEvents/
  userId, type (impression | click), adUnit, createdAt
  (future) subscriptions/ — userId, plan, status, renewsAt, provider
```

**Storage buckets:**
- `generated-images/`
- `generated-videos/`
- `user-assets/`

**Actions:**
- [ ] Initialize Firebase project with above config
- [ ] Write Firestore security rules (users can only read/write their own data)
- [ ] Set up Storage CORS and security rules
- [ ] Create `firebase/` service layer in `src/`

---

### Phase 3 — User System
**Duration:** 2–3 days  
**Goal:** Basic authenticated experience with profile and history.

**Pages:**
- Dashboard
- My Creations
- Credits & Usage (earn via ads, daily bonus)
- Settings
- User Profile (name, photo, language preference)

**Actions:**
- [ ] Build auth flow (sign in, sign out, protected routes)
- [ ] Create user document on first sign-in
- [ ] Build profile edit screen
- [ ] Build dashboard shell (empty states ready for later phases)

---

### Phase 4 — Credits System
**Duration:** 3 days  
**Goal:** Gate AI generation behind credits before any AI calls go live.

**Plans (ad-based, no payment required):**

| Plan       | Credits | How to earn              |
|------------|---------|--------------------------|
| Free       | 10      | On signup                |
| Watch Ad   | +5      | Per rewarded ad watched  |
| Daily Bonus| +2      | Each day the user opens the app |

**Generation costs:**

| Type        | Credits |
|-------------|---------|
| Image       | 1       |
| Quote Card  | 1       |
| Video       | 10      |

**Actions:**
- [ ] Add `creditsRemaining` and `lastDailyBonus` fields to user document
- [ ] Write Cloud Function to check and deduct credits before every AI call
- [ ] Return error to frontend if credits are insufficient — never silently fail
- [ ] Build credits display in UI (header badge + dedicated credits page)
- [ ] Daily bonus: grant +2 credits on app open if not already claimed today
- [ ] "Watch Ad" flow: show rewarded ad → verify completion → grant +5 credits via Cloud Function

---

### Phase 5 — AI Gateway (Cloud Functions)
**Duration:** 3–5 days  
**Goal:** All AI calls go through Cloud Functions, never directly from the frontend.

```
Frontend → Cloud Function → Gemini / Imagen / Veo
```

**Benefits:** API keys never exposed, rate limiting, cost logging, easy model swaps.

**Functions to build:**
- `generateQuoteCard(prompt, template)` — Gemini + Imagen
- `generatePoster(event, style)` — Imagen
- `generateReel(prompt)` — Veo
- `moderateContent(prompt)` — Gemini safety check (runs before every generation)

**Actions:**
- [ ] Set up Firebase Functions project with TypeScript
- [ ] Store Gemini/Imagen/Veo API keys in Secret Manager (not `.env`)
- [ ] Implement per-user rate limiting in Functions
- [ ] Log every AI call to Firestore (`generations/` collection)
- [ ] Return structured errors the frontend can display

---

### Phase 6 — Content History
**Duration:** 2 days  
**Goal:** Every generation is persisted and browsable.

**Generation document:**
```json
{
  "userId": "...",
  "type": "quote-card | poster | reel",
  "prompt": "...",
  "resultUrl": "...",
  "creditsUsed": 1,
  "createdAt": "timestamp"
}
```

**Actions:**
- [ ] Write generation record to Firestore on every successful AI call (done in Cloud Function)
- [ ] Build "My Creations" page with infinite scroll / pagination
- [ ] Add download button per item
- [ ] Add delete (soft-delete, keep Firestore record but mark deleted)

---

### Phase 7 — Sikh Content Templates
**Duration:** 5–7 days  
**Goal:** Build the content moat — curated templates nobody else ships.

**Template categories:**

| Category              | Examples                                      |
|-----------------------|-----------------------------------------------|
| Gurbani Quotes        | Daily hukamnama cards, custom verse cards     |
| Gurpurab Posters      | Guru Nanak Jayanti, Vaisakhi, Hola Mohalla    |
| Khalsa Artwork        | Nishan Sahib compositions, Khanda art         |
| Reels Templates       | Vertical 9:16 animated quote cards            |
| Daily Inspiration     | Morning Ardas cards, evening reflection cards |

**Template schema:**
```json
{
  "id": "...",
  "name": "Gurpurab Poster",
  "category": "gurpurab",
  "promptTemplate": "Create a respectful poster for {event} in style {style}...",
  "previewUrl": "...",
  "creditCost": 1
}
```

**Actions:**
- [ ] Design and seed initial 20–30 templates in Firestore
- [ ] Build template browser UI (filterable by category)
- [ ] Wire template selection to AI Gateway
- [ ] Build prompt interpolation logic (fill `{event}`, `{style}`, etc.)

---

### Phase 8 — Safety & Respect Layer
**Duration:** Ongoing — starts in Phase 5, hardened here  
**Goal:** Never generate content that disrespects Sikh Gurus, Gurbani, or religious symbols.

**Block list (hard rules, no user override):**
- Offensive depictions of the Ten Gurus
- Mockery or parody of Gurbani
- Violence glorification in religious context
- Political propaganda using religious imagery
- Hate speech in any language

**Implementation:**
- [ ] Pre-generation moderation prompt sent to Gemini before every call
- [ ] Custom keyword blocklist (Punjabi + English) checked server-side
- [ ] Refused generations logged for review — never silently dropped
- [ ] Admin dashboard flag to review borderline cases
- [ ] Write a public content policy page (linked from footer)

**This is non-negotiable. It ships before any AI generation goes live.**

---

### Phase 9 — Ads System
**Duration:** 2–3 days  
**Goal:** Monetize via ads and let users earn credits by watching rewarded ads.

**Ad placements:**

| Placement       | Type           | When shown                              |
|-----------------|----------------|-----------------------------------------|
| Banner          | Display ad     | Bottom of dashboard, My Creations page  |
| Rewarded        | Opt-in video   | "Get +5 credits" button on credits page |
| Interstitial    | Full-screen    | After every 5th generation              |

**Ad provider:** Google AdSense (web/PWA). Switch to AdMob when native app ships.

**Actions:**
- [ ] Set up Google AdSense account and get publisher ID
- [ ] Integrate banner ad units on dashboard and creations pages
- [ ] Build "Watch Ad → Earn Credits" flow:
  - User taps "Watch ad for +5 credits"
  - Rewarded ad plays (Google IMA SDK or AdSense rewarded)
  - On verified completion, call Cloud Function to grant credits
  - Cloud Function logs the event and updates `creditsRemaining`
- [ ] Interstitial after every 5th generation (frequency cap server-side)
- [ ] Never show ads during generation loading state — bad UX
- [ ] Log ad impressions and clicks to `adEvents/` collection for internal tracking

**Do NOT trust the frontend** to report ad completion — always verify server-side.

---

### Phase 9b — Payments (Future)
**Status:** Not in current scope. Planned after ads system proves user willingness to pay.

**When to build:** After seeing users consistently hitting credit limits and watching multiple ads — that's the signal they'd pay instead.

**Providers:** Razorpay (India), Stripe (rest of world).

---

### Phase 10 — PWA
**Duration:** 1–2 days  
**Goal:** Installable on Android and iOS home screens before any native app work.

**Why PWA first:**
- One deployment, no app store approval cycle
- Fast iteration on feedback
- Works on any device

**Actions:**
- [ ] Add `manifest.json` with app name, icons, theme color
- [ ] Register service worker for offline shell
- [ ] Add "Add to Home Screen" prompt (deferred, shown after first generation)
- [ ] Test install flow on Android Chrome and iOS Safari
- [ ] Set `display: standalone` in manifest

**Native app (Expo):** planned post-PWA, not in this phase.

---

### Phase 11 — Analytics
**Duration:** 1–2 days  
**Goal:** Instrument the product before launch so day-1 data is available.

**Events to track:**

| Event              | Properties                          |
|--------------------|-------------------------------------|
| `sign_up`          | provider                            |
| `generation_start` | type, template, credits_before      |
| `generation_done`  | type, success, credits_after        |
| `ad_impression`    | ad_unit, placement                  |
| `ad_rewarded_start`| ad_unit                             |
| `ad_rewarded_done` | credits_granted                     |
| `template_view`    | template_id, category               |
| `share`            | type, platform                      |

**Dashboards to build:**
- Daily Active Users
- Generations per day (by type)
- Credits consumed vs earned (ads vs daily bonus)
- Retention (D1, D7, D30)
- Ad impressions, rewarded completions, estimated revenue

**Actions:**
- [ ] Add Firebase Analytics to frontend
- [ ] Instrument above events at call sites
- [ ] Set up BigQuery export for custom queries
- [ ] Build basic admin analytics page (DAU, generations, revenue)

---

### Phase 12 — Admin Dashboard
**Duration:** 2–3 days  
**Goal:** Moderate content and monitor health without touching the database directly.

**Features:**
- User list (search by email, view plan/credits)
- Generation log (filter by type, date, user)
- Moderation queue (flagged/refused generations)
- Manual credit adjustment
- Ad revenue summary (impressions, completions, estimated earnings)

---

## Launch Checklist

- [ ] Firestore security rules audited
- [ ] No API keys in frontend bundle
- [ ] Content safety layer live and tested
- [ ] Credits system tested (cannot go negative)
- [ ] Rewarded ad completion verified server-side before granting credits
- [ ] PWA installable on Android + iOS
- [ ] Analytics instrumented
- [ ] Content policy page published
- [ ] Error monitoring set up (Firebase Crashlytics or Sentry)
- [ ] Rate limits on all Cloud Functions

---

## Phase Order Summary

| Phase | Name                   | Days  | Dependency          |
|-------|------------------------|-------|---------------------|
| 1     | Code Cleanup           | 2–4   | —                   |
| 2     | Firebase Foundation    | 2     | Phase 1             |
| 3     | User System            | 2–3   | Phase 2             |
| 4     | Credits System         | 3     | Phase 3             |
| 5     | AI Gateway             | 3–5   | Phase 4             |
| 8     | Safety Layer           | —     | Phase 5 (blocks it) |
| 6     | Content History        | 2     | Phase 5             |
| 7     | Sikh Templates         | 5–7   | Phase 5             |
| 9     | Ads System             | 2–3   | Phase 4             |
| 10    | PWA                    | 1–2   | Phase 3             |
| 11    | Analytics              | 1–2   | Any time            |
| 12    | Admin Dashboard        | 2–3   | Phase 6 + 8         |

**Total estimated:** 28–42 days of focused development.

> Payments (Razorpay + Stripe) are deferred to a future phase after ads system ships and user behavior validates the upgrade path.
