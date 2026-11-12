# Decision log

A running record of the decisions that shape Arohexis: what was chosen, what else was considered, and what follows from it. New entries go at the bottom. A decision that is replaced stays in the log, marked **Superseded by ADR-NNN**.

Statuses:
- **Accepted:** decided by the owner.
- **Proposed:** recommended and waiting for owner review.
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

- Date: 2026-11-11 · Status: **Accepted**
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

- Date: 2026-11-11 · Status: **Accepted**
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

- Date: 2026-11-11 · Status: **Accepted**
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

- Date: 2026-11-11 · Status: **Accepted**
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

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** TypeScript 7 (the native compiler) has been stable since July 2026. The owner's projects use 6.0, and tool support for 7 is uneven (SvelteKit 3, for example, accepts only 6).
- **Decision:** start on TypeScript 6.0 in strict mode, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. When scaffolding, check whether typescript-eslint and Vite tooling support 7. Switch only if both do, and record the result here.
- **Consequences:** a predictable toolchain now and an easy switch later.

## ADR-013: React Compiler stays off in v1

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** React Compiler 1.0 is stable. On Vite it needs `@rolldown/plugin-babel` (0.3.x, pre-1.0), or the built-in Oxc mode, which is marked experimental and needs a pinned transform version.
- **Decision:** off. The app is small and the hot path (the stuck flow) is a handful of components.
- **Consequences:** one less pre-1.0 dependency. To be revisited once the Vite integration reaches 1.0.

## ADR-014: Valibot for import validation

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** Imported JSON is untrusted and must be validated in the pure domain layer.
- **Options:**
  - Zod 4.6;
  - Valibot 1.5;
  - hand-written guards.
- **Decision:** Valibot. It is modular and tree-shakeable, keeping the offline bundle small, and has no DOM dependency.
- **Consequences:** schemas live in `domain/exportFormat.ts` and double as the TypeScript types for the export format.

## ADR-015: Hand-written CSS tokens plus CSS Modules instead of Tailwind

- Date: 2026-11-11 · Status: **Accepted**
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

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** Home Screen apps on iOS support the Badging API, but only with notification permission, and the badge can only update while the app or service worker runs.
- **Decision:** not used in v1. Without push, a badge couldn't appear at plan time, and asking for notification permission just for a badge adds a decision with little payoff.
- **Consequences:** to be revisited together with the v1.1 push path.

## ADR-017: Plans use wall-clock time in the device's current time zone

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** Plans repeat weekly at a local time, and the owner may travel or cross daylight-saving changes.
- **Options:**
  - store a time zone per plan;
  - follow the device's current time zone.
- **Decision:** a plan's `time` means that wall-clock time wherever the device currently is. Each event still stores its own `tz`, so hour-of-day insights reflect the local time when it happened.
- **Consequences:**
  - "9:00 at my desk" keeps meaning 9:00 after travel;
  - nonexistent times (spring-forward gaps) move to the next valid minute, and ambiguous times use the first instance;
  - the calendar export uses the time zone at export time.

## ADR-018: Visual direction C "Contrast"

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** Task 1 produced three mockups (`.superpowers/sdd/plan/design/`) for the owner to choose between. Task 11 turns this ADR into the CSS tokens, so the values below are exact. Spec §11.1 describes one accent reserved for the primary action and the "Started." moment.
- **Options:**
  - A "Paper": warm cream, sepia and blue ink with serif display. Not chosen as-is: the owner asked for higher contrast (an off-white background with jet-black text, inverted in dark mode) and kept Paper's typefaces and layout rhythm as the base for C.
  - B "Dusk": a dark, hued direction with a lamp-style Started moment. Not chosen: the owner preferred Paper's type and layout as the base.
  - C "Contrast": Paper's typefaces and layout rhythm, re-coloured as one neutral scale with no hue.
- **Decision:** Direction C. Jet black `#0A0A0A` on off-white `#F5F5F2` in light mode, inverted in dark mode with softened body text `#E6E6E2` (the owner's choice, to avoid halation on a black screen).

**Typefaces** (verified with `npm view` on 2026-11-11)
- Display: Newsreader, `@fontsource-variable/newsreader` **5.3.0** (italic, opsz 6–72, wght 200–800). Fallback stack: "Iowan Old Style", "Palatino Linotype", Georgia, serif.
- Text: Atkinson Hyperlegible Next, `@fontsource-variable/atkinson-hyperlegible-next` **5.3.0** (italic, wght 200–800). Fallback stack: "Segoe UI", "Helvetica Neue", Arial, sans-serif.
- Newsreader is used for the timer (weight 300, tabular lining figures), "Started." (italic 400) and headings. Atkinson is used for body text and controls.

**Palette primitives** (one neutral scale, no hue)

| Primitive | Hex | Light theme | Dark theme |
| --- | --- | --- | --- |
| `--mono-0` | `#FBFBF9` | surface | – |
| `--mono-50` | `#F5F5F2` | background, text on accent, text on selected | – |
| `--mono-100` | `#E6E6E2` | hover tint | text, accent, focus, selected |
| `--mono-200` | `#D6D6D2` | – | pressed fill |
| `--mono-400` | `#A3A39F` | – | muted text, border, rule |
| `--mono-600` | `#4F4F4C` | muted text, border, rule | – |
| `--mono-800` | `#2B2B2B` | pressed fill | – |
| `--mono-850` | `#1F1F1F` | – | hover tint |
| `--mono-900` | `#141414` | – | surface |
| `--mono-950` | `#0A0A0A` | text, accent, focus, selected | background, text on accent, text on selected |

**Semantic tokens**

| Token | Light | Dark |
| --- | --- | --- |
| `--color-bg` | `#F5F5F2` | `#0A0A0A` |
| `--color-surface` | `#FBFBF9` | `#141414` |
| `--color-hover` | `#E6E6E2` | `#1F1F1F` |
| `--color-text` | `#0A0A0A` | `#E6E6E2` |
| `--color-text-muted` | `#4F4F4C` | `#A3A39F` |
| `--color-border` | `#4F4F4C` | `#A3A39F` |
| `--color-rule` | `#4F4F4C` | `#A3A39F` |
| `--color-accent` (primary fill, "Started.") | `#0A0A0A` | `#E6E6E2` |
| `--color-accent-pressed` | `#2B2B2B` | `#D6D6D2` |
| `--color-on-accent` | `#F5F5F2` | `#0A0A0A` |
| `--color-focus` | `#0A0A0A` | `#E6E6E2` |
| `--color-selected` (selected chip, pressed feeling) | `#0A0A0A` | `#E6E6E2` |
| `--color-on-selected` | `#F5F5F2` | `#0A0A0A` |

**Accent and focus**
- There is no accent hue. The inverted text-colour fill takes the accent role: the primary button and the "Started." word are the text colour, and selected chips and pressed feelings use the same inversion. The primary button and a selected chip never share a screen with "Started.".
- This deliberately departs from the accent described in spec §11.1. The role is kept (one emphasis reserved for the primary action and the "Started." moment); the hue is dropped.
- Focus is a 2px ring in the text colour with a 3px offset, so the gap separates the ring from the element it surrounds.

**Type scale.** Ratio 1.333 (perfect fourth). Base 17px on a phone and 18px on desktop, fluid with `clamp()` between 375 and 1280px. Steps in use, phone → desktop:
- −1: 12.8 → 13.5px (key hints)
- 0: 17 → 18px (body, controls)
- 1: 22.7 → 24px (feelings, response, primary label, wordmark)
- 2: 30.2 → 32px (headings, "Two minutes done.")
- 3: 40.3 → 42.6px (timer)
- 5: 71.6 → 75.8px ("Started.")

**Motion character: settle into focus.** Calm and quick, with one easing and no decoration. Things answer a tap at once, then come to rest gently. Tokens: `--motion-quick: 120ms`, `--motion-calm: 240ms`, `--motion-slow: 480ms`, `--ease-standard: cubic-bezier(0.23, 1, 0.32, 1)`.
- Press feedback on buttons, feelings and chips: `scale(0.97)` plus a fill change over `--motion-quick`.
- Screen change after a tap: the incoming screen fades in over `--motion-quick`. A change from the keyboard is instant.
- "Started.": a single 240ms settle (`--motion-calm`), opacity 0→1 with a 6px drop into place and a 3px blur coming into focus. The reward lines appear with it, with no stagger (spec §8.4: one calm settle). The mockup's 60ms and 120ms stagger is not adopted.
- Undo → "Remove this start", "Two minutes done." and Home notices: opacity fade over `--motion-calm`.
- Timer digits, loops and decoration are never animated.
- Under `prefers-reduced-motion: reduce`: no transforms and no blur; every fade is opacity only and at most 120ms (`--motion-quick`). Press feedback is the fill change alone.

**Shape and layout**
- Radius: `--radius-s` 6px (chips), `--radius-m` 10px (buttons and feelings), `--radius-pill` 999px (unused).
- Lines are 1px.
- Touch targets are at least 48×48px. The primary button is 64px tall and full width on a phone; feelings are 56px tall.
- Layout: 24px phone gutter. On desktop, a 34rem column offset 15% from the left.

**Contrast** (WCAG 2.x relative luminance, ratio = (L1 + 0.05) / (L2 + 0.05), computed from the hex values above). Text needs 4.5:1; UI parts and large text need 3:1. Every pair passes, and every text pair clears 6.5:1.

| Pair | Light | Dark | Min |
| --- | --- | --- | --- |
| Text on bg | 18.13 | 15.82 | 4.5 |
| Text on surface | 19.11 | 14.72 | 4.5 |
| Text on hover tint | 15.82 | 13.17 | 4.5 |
| Muted on bg | 7.52 | 7.82 | 4.5 |
| Muted on surface | 7.93 | 7.28 | 4.5 |
| Muted on hover tint | 6.57 | 6.51 | 4.5 |
| "Started." (accent) on bg | 18.13 | 15.82 | 4.5 |
| Primary label on primary fill | 18.13 | 15.82 | 4.5 |
| Primary label on pressed fill | 12.96 | 13.58 | 4.5 |
| Selected label on selected fill | 18.13 | 15.82 | 4.5 |
| Control border on bg (UI) | 7.52 | 7.82 | 3 |
| Control border on surface (UI) | 7.93 | 7.28 | 3 |
| Focus ring on bg (UI) | 18.13 | 15.82 | 3 |
| Focus ring on surface (UI) | 19.11 | 14.72 | 3 |
| Primary fill on bg (UI) | 18.13 | 15.82 | 3 |
| Selected fill on bg (UI) | 18.13 | 15.82 | 3 |
| Selected fill on surface (UI) | 19.11 | 14.72 | 3 |

- **Consequences:**
  - the whole palette is ten neutral greys with no hue to manage, so contrast can be unit-tested straight from the token values;
  - hierarchy comes from fill inversion, size and italic instead of colour;
  - focus shares the text colour, so it relies on the 3px offset to read as a ring; a focus-only hue stays available as the smallest exception if device testing shows confusion;
  - Atkinson draws a slashed zero by design, so counts such as "10 starts this week" show it, while the timer uses Newsreader;
  - the 3px blur on "Started." has not been tested on an iPhone; if it stutters there, drop the blur and keep the settle;
  - spoken lines ("1:00 left", "Two minutes done.") and instant keyboard screen changes go beyond the spec's wording and are recorded here.

## ADR-019: TypeScript stays on 6.0.3 at scaffold

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** ADR-012 says to switch to TypeScript 7 at scaffold only if both typescript-eslint and the Vite tooling support it. The Vite template now ships `typescript ~7.0.2`, and TypeScript 7.0.2 is the latest release.
- **Options:**
  - TypeScript 7.0.2;
  - TypeScript 6.0.3, the last 6.0 release.
- **Decision:** TypeScript 6.0.3. `typescript-eslint@8.72.2` declares the peer range `typescript >=4.8.4 <6.1.0`, so it does not support 7. Vite 8.3 and vite-plugin-pwa 2.0 declare no TypeScript peer, so the lint tooling is what blocks the switch.
- **Consequences:**
  - `npm run lint` and the ESLint purity tests keep working on a supported compiler;
  - the template's `~7.0.2` pin is replaced with exact `6.0.3`;
  - revisit once typescript-eslint widens its peer range to include 7.

## ADR-020: Preview deploys

- Date: 2026-11-11 · Status: **Accepted**
- **Context:** Arohexis is hosted as static assets on a Cloudflare Worker. Every pull request needs a live URL that carries the production headers, and only `main` may reach production.
- **Options:**
  - `wrangler deploy` for every branch under a separate Worker name;
  - `wrangler versions upload --preview-alias <alias>`, which uploads a version without deploying it and gives it a stable alias URL.
- **Decision:** the second. The `preview` job runs on pull requests from the same repository only, because forks receive no secrets, and uses the alias `pr-<number>`. The verified command is `npx wrangler versions upload --preview-alias pr-<number>`, giving `https://pr-<number>-arohexis.<subdomain>.workers.dev`. `wrangler.jsonc` sets `preview_urls` and `workers_dev` to `true`, since Version URLs run only on `workers.dev`. The `deploy` job runs `npx wrangler deploy` on `push` to `refs/heads/main`, after `check` and `e2e`. Source: https://developers.cloudflare.com/workers/configuration/previews/ (checked 2026-11-11).
- **Consequences:**
  - aliases may use only lowercase letters, digits and dashes, start with a letter, and keep alias plus worker name within 63 characters, which `pr-<number>` satisfies;
  - Version URLs are public unless protected with Cloudflare Access, which is acceptable because the app holds no server data;
  - only the 1,000 most recent aliases are kept;
  - `public/_headers` is the single source of the CSP: Cloudflare serves it in production and `vite preview` serves its `/*` block, so the E2E suite runs under the real CSP.
