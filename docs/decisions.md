# Decision log

A running record of the decisions that shape Arohexis: what was chosen, what else was considered, and what follows from it. New entries go at the bottom. A decision that is replaced stays in the log, marked **Superseded by ADR-NNN**.

Statuses:
- **Accepted:** decided by the owner.
- **Proposed:** recommended in the spec and waiting for spec review.
- **Superseded.**

---

## ADR-001: A separate repository for Arohexis

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** The session started in `~/Nosolear`, an unrelated speaking-coach project with its own README and public remote.
- **Options:**
  - a new repo;
  - repurpose Nosolear;
  - a subfolder inside Nosolear.
- **Decision:** a new repo at `/Users/shreyan/Arohexis`, to be named `arohexis` on GitHub.
- **Consequences:** each portfolio piece gets its own README, CI and URL, and Nosolear stays untouched. The GitHub repo is created later, only with the owner's OK.

## ADR-002: The product is named Arohexis everywhere

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** One name has to be set for the repo, the README, the PWA manifest and the UI.
- **Options:**
  - one name everywhere;
  - a repo name that differs from the app's display name.
- **Decision:** Arohexis for the repo, README, PWA manifest and UI.
- **Consequences:** the name lives in one constant (`APP_NAME`), so a later rename is a one-line change plus the manifest.

## ADR-003: Design for the iPhone Home Screen web app first

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** The owner's daily device is an iPhone. On iOS:
  - web push works only for Home Screen web apps;
  - Safari and the Home Screen app keep separate storage;
  - there is no Vibration API.
- **Options:**
  - iPhone first;
  - Android first;
  - design for both, with the stricter platform as the baseline.
- **Decision:** iPhone first. Test on WebKit (Playwright iPhone preset) as the primary E2E project.
- **Consequences:**
  - onboarding explains how to add Arohexis to the Home Screen and that Safari's data is separate;
  - the reward has no haptics;
  - the reminders decision (ADR-011) is driven by iOS limits;
  - export/import doubles as the backup.

## ADR-004: A start counts the moment Start is tapped, with Undo

- Date: 2026-11-11 · Status: **Accepted** (the Undo refinement below is **Proposed**)
- **Context:** Starts per week is the key metric, and learning works best when the reward comes right after the behavior.
- **Options:**
  - count on tap, with Undo;
  - count only after surviving 2 minutes;
  - count on tap, then ask "Did you start?" when the timer ends.
- **Decision:** count and reward on tap.
  - Refinement for WCAG 2.2.1: a prominent **Undo** shows for 10 s. After that, a quiet "Remove this start" link stays while the Started screen is open, so there is no hard time limit.
- **Consequences:**
  - the reward is immediate and stopping early never feels like a loss;
  - the count is self-reported (spec §14);
  - timer length and whether the user kept going are recorded but never required.

## ADR-005: Task type is tagged after the start

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** Insights break starts down by task type, but every tap before Start adds friction at the hardest moment.
- **Options:**
  - an optional tag after the start;
  - one required tap before the feeling;
  - typing the first action.
- **Decision:** after the start, one optional tap on the Started screen. Untagged starts count.
- **Consequences:** Stuck to timer stays at 3 taps. Insights include an "Untagged" group.

## ADR-006: Two or three responses per feeling, rotated least-recently-shown

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** The "which responses led to starts" insight needs more than one response per feeling.
- **Options:**
  - fixed rotation;
  - a bandit-style "lean toward what works";
  - one response per feeling.
- **Decision:** a pure rule shows the enabled response shown least recently, with ties going to the lowest `order`. Responses can be edited and disabled.
- **Consequences:**
  - the rule is simple to explain and to property-test;
  - every response gets fair exposure, so start rates are comparable;
  - adaptive selection can be added later as a separate decision.

## ADR-007: Host on Cloudflare Workers Static Assets

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** The app needs a public URL deployed from CI, plus control over headers (CSP, and no-cache for `sw.js`) and SPA routing.
- **Options:**
  - **Cloudflare Workers Static Assets:** `_headers`, SPA `not_found_handling`, branch previews, free static requests. Cloudflare now points new projects to Workers rather than Pages.
  - **GitHub Pages:** no custom headers (every response gets `max-age=600`), no PR previews, a `/arohexis/` base path, and a `404.html` workaround that returns status 404.
  - **Netlify:** its free tier charges credits per deploy.
  - **Vercel:** its Hobby plan is non-commercial only.
- **Decision:** Cloudflare Workers Static Assets, deployed with Wrangler 4 from GitHub Actions.
- **Consequences:**
  - needs a free Cloudflare account and an API token stored as a GitHub secret;
  - the same platform could host a v1.1 push worker;
  - the exact preview-URL command is verified while scaffolding and recorded here.

## ADR-008: React + Vite + Dexie

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** The app is a local-first, offline PWA with a pure domain and a thin UI. Versions were checked on 2026-11-11.
- **Options:**
  1. **React 19.3 + Vite 8.3 + vite-plugin-pwa 2.0 + Dexie 4.4 + React Router 8:** the owner's daily stack and the largest ecosystem; cost is a ~60 kB React runtime.
  2. **SvelteKit 3.2 + adapter-static + @vite-pwa/sveltekit:**
     - smaller bundles and built-in transitions;
     - but Kit 3 is about a month old, its PWA integration now runs on a 0.0.x core, it requires TypeScript 6, and it's a new stack for the owner.
  3. **Lit + idb, no framework:** the smallest bundle, but routing, state and accessibility patterns are all hand-built, so it is the slowest to a usable milestone.
- **Decision:** option 1.
- **Consequences:** effort goes into the product over 10–12 weeks of daily use. The UI layer must be kept thin on purpose (spec §5.2 enforcement).

## ADR-009: Hybrid data model, with editable config and an append-only event log

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** Insights need full history. Labels change over time. Export, import and demo data must be simple.
- **Options:**
  - **Mutable records** (attempts updated in place): simple, but history and timing are lost.
  - **Full event sourcing**, including config: complete, but heavy for editing lists.
  - **Hybrid:** config as editable records; behavior as immutable events with label snapshots.
- **Decision:** hybrid. Every insight is a pure projection over events.
- **Consequences:**
  - metrics are deterministic and easy to test;
  - a demo dataset is just generated events;
  - editing a feeling never rewrites past insights;
  - the events table only grows (about 10 events per attempt, so a year of heavy use stays in the low tens of thousands, which is small for IndexedDB).

## ADR-010: The evidence wording was corrected from the brief

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** Each source in the brief was checked against primary records.
  - Rozental et al. (2018, *Front Psychol* 9:1588) is a meta-analysis of 12 small RCTs with a small overall effect (g=0.34). Its CBT estimate (g=0.55) rests on 3 studies, and the authors call CBT's superiority "unclear". It doesn't pool implementation intentions.
  - The APA podcast page could not be read (blocked by a CAPTCHA).
  - No trial tests a "two-minute start".
- **Decision:**
  - Replace "CBT and if-then plans have the best trial support" with "psychological treatments show small benefits; CBT looks promising in a few trials".
  - Cite Gollwitzer & Sheeran (2006) for if-then plans.
  - Add Sirois & Pychyl (2013) for the mood-repair account.
  - Add Garg et al. (2025) as the nearest evidence for naming feelings and taking a first step.
  - State plainly that the two-minute start is a practical technique without trial evidence.
  - Every claim carries its caveat (spec §3).
- **Consequences:** the README and the About screen are honest about how strong the evidence is. Copy uses hedged wording ("associated with", "in one study").

## ADR-011: Reminders use calendar export and in-app cues, with no push server in v1

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** A PWA can't fire a notification at a set time without a push server.
  - Chrome ended development of Notification Triggers.
  - Periodic Background Sync is Chromium-only and can't fire at a set time.
  - No newer API for scheduled local notifications was found as of 2026-11.
  - iOS web push works only for Home Screen apps, through a server, and every push must show a visible notification.
- **Options:**
  - calendar export (.ics);
  - a minimal push worker (Worker + D1 + cron + VAPID);
  - in-app cues only.

  Full comparison in spec §10.
- **Decision:** in-app cues plus a per-plan `.ics` export (weekly RRULE, a VALARM at the plan time, a stable UID, no deep link).
- **Consequences:**
  - On-time alarms come from the OS calendar, with no backend and no data leaving the device except what the user puts in their calendar.
  - Edits need a manual re-add (re-importing doesn't update events on iOS).
  - A push worker likely needs the paid Workers plan, which goes against the owner's no-extra-spend preference.
  - The v1.1 path is documented: Declarative Web Push with a generic title, and the service worker fills in the text locally.

## ADR-012: TypeScript 6.0 now; TypeScript 7 evaluated at scaffold

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** TypeScript 7 (the native compiler) has been stable since July 2026. The owner's projects use 6.0, and tool support for 7 is uneven (SvelteKit 3, for example, accepts only 6).
- **Decision:** start on TypeScript 6.0 in strict mode, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. When scaffolding, check whether typescript-eslint and Vite tooling support 7. Switch only if both do, and record the result here.
- **Consequences:** a predictable toolchain now and an easy switch later.

## ADR-013: React Compiler stays off in v1

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** React Compiler 1.0 is stable. On Vite it needs `@rolldown/plugin-babel` (0.3.x, pre-1.0), or the built-in Oxc mode, which is marked experimental and needs a pinned transform version.
- **Decision:** off. The app is small and the hot path (the stuck flow) is a handful of components.
- **Consequences:** one less pre-1.0 dependency. To be revisited once the Vite integration reaches 1.0.

## ADR-014: Valibot for import validation

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** Imported JSON is untrusted and must be validated in the pure domain layer.
- **Options:**
  - Zod 4.6;
  - Valibot 1.5;
  - hand-written guards.
- **Decision:** Valibot. It is modular and tree-shakeable, keeping the offline bundle small, and has no DOM dependency.
- **Consequences:** schemas live in `domain/exportFormat.ts` and double as the TypeScript types for the export format.

## ADR-015: Hand-written CSS tokens plus CSS Modules instead of Tailwind

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** The brief asks for design tokens first and a distinctive, typography-led look. The owner uses Tailwind 4 elsewhere.
- **Options:**
  - Tailwind 4 `@theme`, where tokens become utilities;
  - CSS custom properties plus CSS Modules;
  - vanilla-extract.
- **Decision:** plain CSS custom properties in two layers (primitive and semantic), plus CSS Modules.
- **Consequences:**
  - the token file reads as the design system itself;
  - there is no utility-class look to fight;
  - contrast can be unit-tested straight from the token values;
  - styling takes slightly more CSS than with utilities.

## ADR-016: Badging API skipped

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** Home Screen apps on iOS support the Badging API, but only with notification permission, and the badge can only update while the app or service worker runs.
- **Decision:** not used in v1. Without push, a badge couldn't appear at plan time, and asking for notification permission just for a badge adds a decision with little payoff.
- **Consequences:** to be revisited together with the v1.1 push path.

## ADR-017: Plans use wall-clock time in the device's current time zone

- Date: 2026-11-11 · Status: **Proposed**
- **Context:** Plans repeat weekly at a local time, and the owner may travel or cross daylight-saving changes.
- **Options:**
  - store a time zone per plan;
  - follow the device's current time zone.
- **Decision:** a plan's `time` means that wall-clock time wherever the device currently is. Each event still stores its own `tz`, so hour-of-day insights reflect the local time when it happened.
- **Consequences:**
  - "9:00 at my desk" keeps meaning 9:00 after travel;
  - nonexistent times (spring-forward gaps) move to the next valid minute, and ambiguous times use the first instance;
  - the calendar export uses the time zone at export time.
