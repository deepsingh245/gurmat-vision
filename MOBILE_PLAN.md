# Mobile Build Plan — Hukumnama AI Studio

Planning document only. No code changes are part of this file. Written after reading
`README.md`, `PLAN.md`, `SECURITY.md`, `FIREBASE_FUNCTIONS.md`, `firestore.rules`, and the
current `src/` and `functions/src/` code.

**Status: decided.** Going with **Capacitor** — wrapping the existing Vite/React app rather than
rewriting in React Native/Expo or Flutter. This doc is written as an execution plan against that
decision. The comparison against RN/Flutter is kept in Section 3 as reference for why, not as an
open question.

---

## 0. Sequencing against PLAN.md — do this before payments

Per the existing `PLAN.md`, three phases are still open before the project is "everything done
except payments": **Phase 10 (PWA)**, **Phase 11 (Analytics)**, **Phase 12 (Admin Dashboard)**.
Payments (Phase 9b) stays deferred until those three are closed — see the chat answer / project
memory for the full phase-by-phase audit.

How Capacitor work relates to those three:

- **Phase 10 (PWA) is effectively superseded, not skipped.** Capacitor does not need a
  `manifest.json` or service worker to produce an installable Android app — it packages the built
  `dist/` directly into a native shell. If browser-installability (Chrome "Add to Home Screen") is
  still wanted as a separate, lighter-weight distribution channel, a manifest can be added later,
  but it is no longer a prerequisite for a Play Store presence. Recommend: **drop Phase 10 as
  originally scoped, replace it with the Capacitor bring-up (Section 8, M1) in the phase order.**
- **Phase 11 (Analytics) and Phase 12 (Admin Dashboard) have no dependency on Capacitor** and can
  proceed on the web codebase in parallel with, or before, the Capacitor work below — neither
  blocks the other.
- Recommended order: **Phase 11 → Phase 12 → Capacitor M1–M4 (this doc) → Phase 9b (Payments)**,
  or Analytics/Admin Dashboard and Capacitor M1–M3 in parallel if there are two people to split
  the work. Either way, **Payments stays last**, consistent with the "not deploying yet, want
  everything else done first" instruction.

---

## 1. TL;DR

| Question | Answer |
|---|---|
| Reuse the existing React code or start over? | **Reused.** Wrap the existing Vite/React app with **Capacitor**. |
| New folder or same codebase? | **Same repo, same `src/`.** Add a thin platform layer (`src/platform/`) plus Capacitor's auto-generated `android/` (and `ios/` later) at repo root. Do not fork into a second app. |
| Biggest risk? | **Not code — policy.** Play Billing (virtual currency), AdSense→AdMob swap, and missing privacy policy/App Check are bigger blockers than any native-shell integration work. |
| When would a full React Native rewrite make sense? | Only later, if Capacitor's WebView performance or native-feel becomes a real user complaint after launch — not before. |

---

## 2. Current state audit (what mobile work is starting from)

- **Frontend:** React 19 + TypeScript 5.8 + Vite 6, Tailwind v4. No router library — page
  switching is a `useState<Page>` in [App.tsx](src/App.tsx). ~4,560 lines across `src/`, nothing
  oversized enough to block a wrapper approach.
- **Backend:** Firebase Cloud Functions v2 (`functions/`), all AI calls (`hukumnamaGenerateImage`,
  `hukumnamaGenerateVideo`, etc.) go through `onCall` functions — **already platform-agnostic**.
  A native app calling these via the Firebase SDK requires zero backend changes.
- **Security is further along than [SECURITY.md](SECURITY.md) reads.** That doc lists credit
  verification, rate limiting, daily caps, and payload validation as gaps — but
  [functions/src/guards.ts](functions/src/guards.ts) already implements all four
  (`spendCredits`, `rateLimit`, `checkDailyCap`, `validateImagePayload`). Treat SECURITY.md as
  partially stale; the only gap not visibly closed is **Firebase App Check** (gap #4).
- **PWA (PLAN.md Phase 10) has not shipped.** No `manifest.json`, no service worker found anywhere
  in the repo. This matters: Capacitor doesn't require a PWA first, but if you want an
  installable-web fallback alongside the Play Store app, that's still unbuilt.
- **Web-only surfaces that a native build must replace:**
  - `BannerAd.tsx` — Google **AdSense** (`adsbygoogle`). Does not work in a native shell.
  - `voiceRecorder.ts` — browser `MediaRecorder` + `getUserMedia`, outputs `audio/webm`.
  - No privacy policy page exists — only `ContentPolicyPage.tsx`. Play Console requires a
    privacy policy URL.
- **i18n:** English, Hindi, Punjabi already in `src/i18n/locales/` — carries over free.

---

## 3. Tech stack decision (reference — why Capacitor, kept for the record)

### Options considered

| | Capacitor (wrap existing app) | Expo / React Native | Flutter |
|---|---|---|---|
| Code reuse from `src/` | ~90% as-is (components, pages, hooks, i18n, Firebase JS SDK, Gemini service calls) | Business logic/types/constants portable; **every UI component rewritten** in RN primitives (no Tailwind/JSX-DOM) | 0% — new language (Dart), full rewrite |
| Firebase integration | Firebase Web SDK works unchanged (it's still a browser context) | Needs `@react-native-firebase/*` (native modules) or the JS SDK's newer RN support — more setup, more native-build surface | Needs `firebase_dart` / FlutterFire — separate ecosystem entirely |
| Dev time to first Play Store build | **~1–2 weeks** (mostly native shell config + AdMob/voice swaps) | ~5–8 weeks (rewriting ~15 components/pages) | ~8–12 weeks |
| Native feel / performance | WebView-based; fine for forms, text, image/video display (this app's actual UI) — not fine for heavy animation/gestures | True native widgets, better for complex gesture/animation-heavy UI | True native, best raw performance |
| Play Store scrutiny | "Minimum functionality" policy risk for pure WebView wrappers — **mitigated** by adding real native plugins (AdMob, share, push, mic permission, splash) rather than shipping a bare webview | Non-issue — natively built | Non-issue |
| Team's existing skill investment | Zero new framework to learn — same React/TS/Tailwind | New: RN component model, native module debugging | New: Dart, widget tree, entirely different tooling |

### Why Capacitor won

Given the explicit constraint "react code is already built," Capacitor is the only option that
doesn't throw away the ~4,500 lines already written and tested. It wraps the existing Vite build
in a real native Android (and later iOS) shell, and you add native plugins only where the web
platform genuinely can't do the job (ads, possibly voice, push notifications, native share).

This does **not** foreclose React Native later. If, post-launch, the WebView shows real
performance/UX limits (the templates browser or video generator feel sluggish, for example),
migrating specific screens to RN — or the whole app — remains possible, and by then you'd know
exactly which screens are worth the rewrite instead of guessing upfront.

Use **Capacitor 7** (current major as of this writing) — it supports Android 14/15 targets and
has first-party plugins for the pieces this app needs: `@capacitor/splash-screen`,
`@capacitor/share`, `@capacitor/push-notifications`, `@capacitor/app`, plus community plugins for
AdMob and voice recording (see Section 5).

---

## 4. Reuse vs. rewrite — risk breakdown

| Area | Risk | Mitigation |
|---|---|---|
| **In-app purchases / credits** | **HIGH.** PLAN.md's Phase 9b lists Razorpay + Stripe for future payments. Google Play policy **requires Google Play Billing** for purchasing virtual currency/credits consumed inside an Android app — Stripe/Razorpay direct checkout for in-app credits will get the app **rejected**. Play takes a 15–30% cut via Billing. | Decide now: (a) keep credits ad-earned/free-only in the native app and sell any paid tier only via the web version, or (b) integrate Play Billing (`@capacitor-community/in-app-purchases` or equivalent) for Android credit packs and keep Stripe/Razorpay for web-only checkout. Do not wire Stripe/Razorpay directly into the Android credit purchase flow. |
| **Ads (AdSense → AdMob)** | **HIGH.** `BannerAd.tsx` pushes to `window.adsbygoogle`, which is meaningless inside a native WebView. Serving AdSense web ads inside a wrapped native app also violates AdMob/Play ad policy (ads must be served via an ads SDK appropriate to the surface). | Create a separate AdMob account/app-ID, add a native ad plugin, and branch `BannerAd`/interstitial/rewarded-ad components on `Capacitor.isNativePlatform()` to render AdMob units instead of the `<ins>` AdSense tag on native. Rewarded-ad credit grants already verify server-side in `ads.ts` — that logic is unchanged, only the ad SDK swaps. |
| **Voice recording** | **MEDIUM.** `MediaRecorder`/`getUserMedia` works in Android's Chromium WebView with the `RECORD_AUDIO` permission wired into `AndroidManifest.xml` + a Capacitor permissions plugin. iOS WKWebView support is less consistent across OS versions. | Test on real Android hardware early. If reliability is poor, swap to a native plugin (e.g. `@capacitor-community/voice-recorder`) behind the same `VoiceRecorder` interface so `VoiceCommand.tsx` doesn't change. |
| **App Check / abuse (existing gap)** | MEDIUM — pre-existing, not new. | Native apps should use App Check's **Play Integrity API** provider (not reCAPTCHA, which is web-only) before launch. This closes SECURITY.md gap #4 for both platforms if done via a platform-conditional provider. |
| **File downloads (images/videos)** | MEDIUM. Web download via `<a download>` doesn't work the same in a native WebView; Android scoped storage requires MediaStore-aware saving. | Add `@capacitor/filesystem` + `@capacitor/share` and branch the existing download buttons in `CreationsPage.tsx`/generators on native vs. web. |
| **Privacy policy** | HIGH for store approval — **not a code risk, a content gap.** Play Console requires a published privacy policy URL; only `ContentPolicyPage.tsx` exists today. | Write and publish a Privacy Policy page (data collected: auth email, generation history, ad IDs) before submitting to Play Console. |
| **Deep linking / auth redirects** | LOW–MEDIUM. Firebase Auth Google sign-in redirect flow behaves differently in a native WebView vs. browser popups. | Use `@capacitor-firebase/authentication` (native Google Sign-In) instead of the web popup/redirect flow used today, gated on `isNativePlatform()`. |
| **Bundle size / cold start** | LOW. Vite output is already reasonably small; Capacitor just loads it locally instead of over network, which is actually faster than the current web load. | — |

---

## 5. Google Play Store guidelines — what specifically applies here

- **Target API level.** Play requires `targetSdkVersion` within roughly one Android release of
  current (Android 14 = API 34 baseline recently; expect **API 35 or the then-current requirement**
  by the time you submit — check Play Console's exact cutoff at build time, this shifts yearly).
- **Data safety form.** Must accurately declare: email (auth), generation history (Firestore),
  ad ID (AdMob), and mic access (voice feature) — declare everything the app actually touches or
  risk suspension on audit, not just rejection at submission.
- **Permissions minimalism.** Only request `RECORD_AUDIO` when the voice tab is actually used
  (already gated behind sign-in in `VoiceCommand.tsx` — good), and avoid broad storage permissions;
  use scoped storage via `@capacitor/filesystem`.
- **Ads policy.** AdMob units must be clearly distinguishable from content, no accidental-click
  layouts, and rewarded-ad completion must be server-verified before granting credits — **this
  last part is already correctly implemented** in `functions/src/ads.ts` (rate-limited to 3/day,
  atomic Firestore transaction). Keep it that way when swapping to AdMob.
- **In-app purchases policy.** As covered in Section 4 — Play Billing is mandatory for any
  Android-native purchase of credits/virtual currency. This is the single highest-risk
  compliance item in this whole plan if Phase 9b payments are ever extended to the native app
  without Play Billing.
- **Restricted/religious content.** The existing two-layer moderation (blocklist +
  Gemini review in `functions/src/moderation.ts`) blocking disrespectful depictions of the Ten
  Gurus, mockery of Gurbani, and hate speech directly satisfies Play's policy on respectful
  treatment of religious content — nothing new needed here, just don't regress it.
- **Privacy policy URL.** Required in Play Console before submission — doesn't exist yet (see
  Section 4).
- **App signing.** Use Play App Signing (Google-managed upload key) — standard default for new
  apps created via Play Console, no extra planning needed beyond enabling it.
- **Target audience / ads-to-children.** Declare the app as general audience, not
  "designed for children" — it has ads, AI generation, and no COPPA-relevant content, so this
  should be straightforward, but get the questionnaire right since Sikh/family content could be
  miscategorized if answered carelessly.
- **App Check / Play Integrity.** Not a Play Store submission blocker, but Google increasingly
  treats unprotected Cloud Functions as an abuse-bait pattern — pairs well with closing
  SECURITY.md gap #4 specifically via Play Integrity for the native build.

---

## 6. Folder structure — same repo, thin platform layer

**Recommendation: stay in this repo, do not fork a second app.** The backend
(`functions/`), Firestore rules, i18n locales, credit/template logic, and ~90% of UI components
are shared. Splitting into a second repo/app means maintaining templates, prompts, and moderation
rules in two places — a correctness risk with no offsetting benefit here.

Proposed additions (all new, nothing existing moves):

```
hukumnama-ai/
  src/
    ...                        (unchanged — existing web code)
    platform/                  NEW — thin abstraction swapped by isNativePlatform()
      ads.ts                   AdSense (web) vs AdMob (native) behind one interface
      voice.ts                 MediaRecorder (web) vs native voice plugin behind one interface
      download.ts              <a download> (web) vs Filesystem+Share (native)
      auth.ts                  Web popup/redirect vs @capacitor-firebase/authentication
  capacitor.config.ts          NEW — Capacitor project config
  android/                     NEW — auto-generated by `cap add android`, committed like any
                                native project (gradle files, manifest, res/)
  ios/                         Later, if/when iOS is pursued — same pattern
  PRIVACY_POLICY.md or
  src/pages/PrivacyPolicyPage.tsx   NEW — required before Play Console submission
```

Why not a `mobile/` or `apps/` monorepo split: that pattern earns its cost when the mobile and web
UIs genuinely diverge (RN rewrite scenario). For a Capacitor wrapper, the UI *is* the web UI —
introducing a second `apps/` folder here would just add path-aliasing and build-config overhead
for no isolation benefit, since the same `dist/` output is what gets embedded into the native shell.

---

## 7. Clean code carry-overs for the mobile layer

- Keep the `platform/*.ts` abstraction pattern (interface + two implementations) rather than
  scattering `Capacitor.isNativePlatform()` checks through components — matches this codebase's
  existing pattern of isolating environment concerns into `src/firebase/`, `src/hooks/`.
- No new state-management library — the existing `useState`/Context pattern
  (`AuthContext`, `GuestSessionContext`) is enough; don't introduce Redux/Zustand just because
  it's now "a mobile app."
- Don't add a router library to support native back-button handling — Capacitor's
  `@capacitor/app` `backButton` listener can call the same `setPage('studio')` /
  `goBack()` handlers already in [App.tsx](src/App.tsx).
- Keep credit/rate-limit/moderation logic exclusively server-side (already true) — a native
  client is just as untrustworthy as a browser console; nothing about mobile changes that threat
  model.

---

## 8. Phased roadmap (Capacitor execution plan)

### M1 — Capacitor bring-up (3–5 days)

- `npm install @capacitor/core @capacitor/cli @capacitor/android`
- `npx cap init` — app name `Hukumnama AI Studio`, app ID `com.hukumnamaai.studio` (reverse-DNS,
  must match the eventual Play Console package name exactly — cannot be changed after first
  publish without shipping as a new app).
- `capacitor.config.ts`: `webDir: 'dist'` (matches existing `vite build` output), keep
  `bundledWebRuntime` default.
- `npx cap add android` — generates `android/` at repo root; commit it like any native project
  (it is not a build artifact).
- `npm run build && npx cap sync android` to embed the current `dist/` into the native shell, then
  `npx cap open android` to run in Android Studio's emulator/device.
- Wire `@capacitor/app`'s `backButton` listener to the existing `setPage('studio')` /
  `goBack()` handlers already in [App.tsx](src/App.tsx) — no new navigation library needed.
- Exit criteria: the existing app loads and every tab (Hukumnama, Templates, Voice, Post, Quotes,
  Status, Video) renders correctly inside the Android emulator, auth and Firestore reads work
  against the real backend.

### M2 — Native plugin swaps (1–2 weeks)

Each swap follows the `src/platform/*.ts` pattern from Section 6 — one interface, one web
implementation (existing code, untouched), one native implementation, selected via
`Capacitor.isNativePlatform()`.

| Concern | Web (existing, untouched) | Native addition | Plugin |
|---|---|---|---|
| Ads | `BannerAd.tsx` AdSense `<ins>` | AdMob banner/interstitial/rewarded units, separate AdMob app ID | `@capacitor-community/admob` |
| Voice | `VoiceRecorder` (MediaRecorder) | Native mic capture if WebView recording proves unreliable on-device | `@capacitor-community/voice-recorder` (add only if M1 testing shows it's needed) |
| Download/share | `<a download>` in `CreationsPage.tsx`/generators | Save to MediaStore + native share sheet | `@capacitor/filesystem`, `@capacitor/share` |
| Google Sign-In | Firebase Auth web popup/redirect | Native Google Sign-In (redirect flow is unreliable in WebViews) | `@capacitor-firebase/authentication` |
| Splash/status bar | — | Native splash screen, status bar color matching `navy-900` brand color | `@capacitor/splash-screen`, `@capacitor/status-bar` |
| Push (optional, not currently in `PLAN.md`) | — | Only add if a notification use case is actually planned (e.g. daily Hukamnama reminder) | `@capacitor/push-notifications` + FCM |

- Exit criteria: AdMob test ads render and rewarded-ad credit grants still go through the existing
  server-verified `hukumnamaGrantAdReward` flow unchanged; downloads save correctly to the device
  gallery; sign-in works without the redirect-flow issues common to WebView OAuth.

### M3 — Compliance (3–5 days)

- Build and publish a Privacy Policy page (new route, same pattern as `ContentPolicyPage.tsx`) —
  disclose: auth email, generation history, ad ID (AdMob), mic access (voice feature).
- Complete the Play Console **Data Safety** form against that same disclosure list.
- Add Firebase **App Check** with the **Play Integrity API** provider for the native build
  (closes the one remaining gap from `SECURITY.md`/`functions/src/guards.ts` review — web can
  keep reCAPTCHA v3 separately, App Check supports multiple providers per project).
- Re-verify moderation (`functions/src/moderation.ts`) and credit/rate-limit guards
  (`functions/src/guards.ts`) are unaffected — they're server-side and platform-agnostic, so this
  should be a no-op confirmation, not new work.
- Set up Android app signing via **Play App Signing** (Google-managed upload key — default for
  new Play Console apps).

### M4 — Play Console submission (review time outside your control)

- Internal testing track first (immediate, small group) → closed testing (required minimum
  duration + tester count before production access on new Play Console developer accounts) →
  production rollout, staged (e.g. 10% → 50% → 100%).
- Verify the **target API level** requirement current at submission time in Play Console directly
  (this shifts yearly — do not rely on a number written into this doc in advance).

### M5 — Optional, only if triggered by real feedback

- Evaluate a targeted React Native rewrite for specific screens **only if** post-launch data shows
  a genuine WebView performance/UX complaint (e.g. the templates browser or video generator
  feeling sluggish on low-end devices). Do not pre-emptively start this — M1–M4 shipping a working
  Play Store app is the higher-value outcome given the "not deploying yet" timeline pressure is
  already off the table once M4 lands.

---

## 9. Open decisions that need your input before implementation starts

1. **Credits monetization on Android:** free/ad-earned only, or integrate Google Play Billing for
   paid credit packs? (Directly affects whether Phase 9b's Stripe/Razorpay plan needs a
   Play-Billing-specific branch.)
2. **iOS timeline:** ship Android-only first via Capacitor, or plan iOS in parallel? (iOS adds
   Apple Developer account, App Store review policy differences, and the MediaRecorder-on-WKWebView
   risk noted in Section 4.)
3. **AdMob account ownership:** who sets up the AdMob account/app ID — same Google account as
   the current AdSense one, or separate?
