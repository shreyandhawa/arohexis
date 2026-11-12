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

- Date: 2026-11-11 · Status: **Accepted** · Amended by ADR-023: the tag is now a part
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

- Date: 2026-11-11 · Status: **Accepted** · Amended by ADR-021: "no hue" applies to chrome; Brain space's plate carries part colours
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

## ADR-021: Brain space is the main visual, and the owner's review of the built Home is its gate

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:** The owner's brief of 2026-11-12 adds Brain space (spec §16), with reference stills and a canvas prototype in `docs/reference/brain-space/`. The brief asked for this to be recorded as ADR-018, replacing the A/B gate. But ADR-018 to ADR-020 already exist, and the gate already ran: three directions were built and Direction C was chosen (ADR-018). ADR-018 also defines the palette as ten neutral greys with no hue.
- **Options:**
  - a new ADR that amends ADR-018 for Brain space only;
  - supersede ADR-018 with a dark direction for the whole app.
- **Decision:** the first.
  - ADR-018 still governs all chrome: typefaces, the mono palette, the single accent, chrome motion and layout.
  - Brain space adds a plate that is always black, part colours as data, hairlines with additive light, no outlines around strokes or parts, no pastel, no gradients on UI, and labels in Atkinson Hyperlegible Next.
  - The gate for the look is the owner's review of the built Home screen on a preview URL, during M2 and before M2's later screens are built (plan M2, Task 7).
- **Consequences:**
  - ADR-018 is amended, not superseded: its "no hue" now reads "no hue in chrome";
  - the reference is matched in look and behaviour, and none of its code is reused;
  - the prototype's outline around a selected part, its Inter labels, its auto-rotation, its line added only when the timer ends, and its anatomy-named identifiers are not adopted.

## ADR-022: Brain space is Milestone 2

- Date: 2026-11-12 · Status: **Accepted** (the owner chose the order on 2026-11-12)
- **Context:** Brain space depends on parts (new) and on plans (M2 as first planned) for its growing lines. Because it is a pure projection over events, every start recorded before it ships still appears once it lands.
- **Options:**
  - right after M1, as the new M2, with Plans moving to M3;
  - after Plans, so plan lines grow from day one.
- **Decision:** right after M1. The order becomes M2 Brain space, M3 Plans, M4 Insights, M5 Demo, restore and onboarding, M6 Configuration and v1.0.
- **Consequences:**
  - the riskiest parts (frame rate on the iPhone, the look) are proven first, and the Home review gates the screens that follow;
  - until M3, only faint start lines and core sparks appear, because only on-cue plan starts grow lines (ADR-024);
  - branch names shift: `m2-brain-space`, `m3-plans`, `m4-insights`, `m5-demo-data`, `m6-config-v1`;
  - mentions of the old milestone numbers in the README and in code comments are updated in M2 Task 1.

## ADR-023: Part replaces Task type

- Date: 2026-11-12 · Status: **Accepted** (the owner chose "replace" and approved the details on 2026-11-12)
- **Context:** An unplanned start has to land in a part. The only place to choose one without adding a tap is the optional "What is it?" row after the start (ADR-005).
- **Options:**
  - Part replaces Task type in that row;
  - Part sits beside it, as two chip rows on Started;
  - parts come only from plans, and task types stay.
- **Decision:** Part replaces Task type.
  - **Events:** `start.tagged` keeps its shape. `taskTypeId` now holds a part id, so old events and backups need no rewrite. From M3, a start made from a plan gets a `start.tagged` with the plan's part in the same transaction.
  - **Storage:** Dexie version 2 replaces `taskTypes` with `parts`, adding a colour id and a region, both 1 to 6. Every enabled task type except `other-task` becomes a part with the same id and label; `other-task` maps to no part.
  - **Export:** `version: 2` with `parts`. Version 1 files migrate on import.
  - **Limits:** at most six parts, one region each, fixed at creation. Each colour id is used once. Parts are disabled, never deleted.
  - **Defaults for a new user:** Work, Study, Health, Home, Money.
  - **One function attributes a start to a part:** `partOfStart`, the latest tag, serves both Brain space and Insights.
- **Consequences:**
  - ADR-005 still holds: one optional tap after the start, and Stuck to timer stays at 3 taps;
  - "What is it?" becomes one sideways-scrolling row, so six parts never push Started into scrolling;
  - Insights' "Task types" section becomes "Parts";
  - the stored field name `taskTypeId` no longer matches its meaning. One mapping in the fold hides that from the rest of the code.

## ADR-024: Lines grow only from on-cue starts, and nothing is removed

- Date: 2026-11-12 · Status: **Accepted** (the owner chose "on-cue only" and approved the details on 2026-11-12)
- **Context:** The brief proposed that only plan lines grow past the first step, because a fixed cue is what the evidence supports (Gollwitzer & Sheeran 2006; Singh et al. 2024, where a stable cue "is thought to help but was not tested"). The brief also asked that nothing ever be removed, and that the signals stop and the lines dim slightly after 48 hours without a start. The review found that tagging after the start, and Undo, would move or remove light.
- **Options for growth:**
  - any start in the part;
  - any start from the plan, at any time;
  - only on-cue starts, linked to an occurrence.
- **Decision:**
  - **On-cue is defined by data:** a counted start whose attempt carries `planId` and `occurrence`. That covers **Start now**, **I'm stuck on this** and **Yes, I started**. Each occurrence counts once.
  - **Growth:** only on-cue starts grow a plan line. There is one line per plan and part. Every other counted start leaves a faint start line in its part, or a core spark if it has no part.
  - **Steps:** 1, 5, 15 and 40 on-cue starts. The top step sits near the review's median of about two months: a weekday plan started on most days reaches 40 in about nine to ten weeks.
  - **Settling:** the newest light can move only when its own start is re-tagged.
    - It settles when a later attempt opens, and settled light never moves.
    - Undo removes that start's light, the one deliberate exception, because it corrects the record (ADR-004). The undone start keeps its fibre, so nothing else moves.
    - Changing a plan's part starts a new line in the new part from its next on-cue start, and the old line stays.
  - **Resting:** after 48 hours without a counted start, signals stop and light dims by one fixed step to 85%. It never dims further, and one start ends it.
  - **What else removes light:** only Delete everything and importing a backup, which replace all data.
- **Consequences:**
  - a line's strength honestly means "times you started on this cue";
  - the part card shows **Start now** only while an occurrence is open, the same rule as the Home plan card. This narrows the brief's "any waiting plan with a Start button", and the owner confirmed it on 2026-11-12;
  - resting is a recency signal and could read as a streak by another name. It is mitigated by one fixed step, by copy that never names it as a loss, and by "One start sets them moving again." The owner judges it at the Home review;
  - Brain space is cumulative only: no weeks, comparisons, streaks or completions.

## ADR-025: Brain space copy: strength labels, focus lines, and no brain claim

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:**
  - The reference labels lines Faint, Steady and Automatic. "Automatic" overclaims, because the weekly SRBAI check-in is the measure of automaticity (spec §6.4).
  - The reference's focus lines fail spec §3 and §9.5:
    - one uses the banned word "missed";
    - "the same time and place each day is what lets repetition stick" overstates Singh et al. 2024;
    - "quiz yourself… spread sessions" has no source in §3;
    - "fire the line" edges toward the banned "rewires".
  - Parts are named by the user, so advice written for one kind of part (studying, money) can't be matched to a part.
- **Options for labels:**
  - the reference's labels;
  - New, Repeated, Steady, Well-worn, each shown with its count;
  - counts only.
- **Decision:**
  - **Labels:** New, Repeated, Steady, Well-worn, always with the count ("Steady · 18 starts on cue"). Waiting plans read "Waiting".
  - **Focus lines:** "What to focus on" is a pure, state-based rule with five cases (spec §16.9). Each case ties to an existing §3 row and links to About. Singh's line keeps the review's caveats: "a median of about two months", and "the range was wide".
  - **The brief's "basis":** it is read as a §3 source. Three of the five lines are also `Basis` values. The other two use Gollwitzer & Sheeran and Singh et al., which are §3 rows but not bases.
  - **About:** a paragraph saying Brain space is a picture, not a scan, and that Arohexis makes no claim that your brain changes. The sentence naming the check-in waits for M4, when the check-in exists.
  - **Banned words** gain rewire, rewires, rewired, rewiring, neural, neuron, neurons, synapse, synapses, plasticity, neuroplasticity, fire, fired and firing. The anatomy list applies to copy too.
- **Consequences:**
  - no new evidence rows are needed;
  - advice for a particular kind of task, such as study techniques, would need its own ADR and new §3 rows with caveats.

## ADR-026: The plate is always dark, with its own contrast checks

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:** Additive light only reads on black. The app has light and dark themes and a contrast rule of 4.5:1 for text and 3:1 for UI parts (spec §11.2). The review measured that a part colour as text on the light theme fails (cyan is about 1.6:1), and that labels on a translucent backing over bright light drop below 4.5:1.
- **Options:**
  - the plate is always dark, and chrome follows the theme;
  - the whole app turns dark by default once Brain space ships;
  - a light plate, which loses the additive look.
- **Decision:** the plate is always dark, with the tokens in spec §16.7, which are the same in both themes. Chrome follows the theme setting (system by default), as today.
  - **Controls on the plate** (**Still**, zoom, turn, the parts row and the summary line) are scoped to the dark theme's tokens, including its focus ring.
  - **Labels** on the plate use the base part colour on an opaque `--plate-bg` backing, at least 4.5:1.
  - **Outside the plate**, part colours are only swatches beside a name, and no text is ever set in a part colour.
  - **Lines and points are supplementary.** Everything they convey is also in the text equivalent and the part card. Base colours and waiting lines meet 3:1, and start lines are fainter by design.
  - **Distinctness:** base colours stay apart by CIEDE2000 ≥ 12 in normal vision, and ≥ 6 under simulated protanopia, deuteranopia and tritanopia (Machado et al. 2009, full severity). The reference's five colours measure 13.3, 9.0, 8.6 and 6.6 at their closest.
- **Consequences:**
  - in the light theme, Home carries a black panel. The owner judges its weight at the Home review;
  - Insights stays neutral, with no part colours.

## ADR-027: Motion that carries state, and the Still control

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:**
  - Spec §11.2 and ADR-018 say no motion is decorative or looping, and that the reward is one calm settle of 240 ms. §11.1 rules out confetti.
  - Brain space needs moving signals, a burst on the start and a two-minute reveal.
  - ADR-004 requires the reward to land on the tap. The prototype only added the line when the timer finished.
  - WCAG 2.2.2 requires a way to pause moving content that starts on its own and lasts more than 5 s, and the reveal on Started runs for two minutes.
- **Decision** (spec §16.8):
  - **State motion:** signals move on lines of strength 2 or more while Brain space is moving, and stop while it rests.
  - **Event motion:**
    - a burst of at most 1.8 s, once per start, as a single rise and fall under WCAG 2.3.1's flash threshold;
    - a reveal during the timer, driven by `timerState(start.at, now)`. It follows a re-tag to the new place, and on an on-cue start it is a bright pass along the existing line;
    - a ring that settles at the line's end.

    Backfilled starts get neither burst nor reveal.
  - **The light exists from the tap.** The reveal only animates it, and Home always shows it whole.
  - **Never:** auto-rotation, drift or decoration.
  - **Still** is on every plate, on Home and on Started, and in Settings.
    - It is stored as `kv.brainStill`: `'still'`, `'moving'`, or unset to follow the system.
    - Under reduced motion, unset means Still, and a user who turns it off is respected.
  - **Rendering:** the render loop runs only while something moves.
- **Consequences:**
  - §11.2 gains one exception: Brain space's state motion, which stops with Still or while resting;
  - the Started reward keeps its 240 ms settle in the chrome, and the burst is on the strip;
  - fewer frames rendered also means less battery.

## ADR-028: Geometry is generated locally from a seed, and the projection is pure

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:**
  - No network requests are allowed after load (spec §12), and the domain must stay pure (spec §5.2).
  - The brief asked for geometry from a seed or a precached asset, and asked that the licence and size be checked first if real tractography data is proposed.
- **Options:**
  - **Procedural:** a seeded generator, as in the reference.
  - **Real tractography data** as a precached asset. Not chosen: published atlases carry data-use terms or share-alike licences and run to megabytes. A real scan would also make the picture read as someone's brain, which works against "not a scan". Licence and size weren't checked further, because the procedural option meets the brief.
  - **A hand-authored asset:** a fixed file to maintain, with no advantage over a seed.
- **Decision:** procedural, in three layers:
  - `src/domain/brainSpace.ts`, `focus.ts` and `random.ts` (mulberry32, shared with the M5 demo generator) are pure;
  - `src/geometry/` is pure and seeded, with its own DOM-free tsconfig, the domain's lint bans, and a lines ≥ 90% coverage gate. It may import from `src/domain` only;
  - `src/app/brain/` renders, and is the only layer that touches the canvas.

  **Field:** about 670 fibres and about 83,000 vertices, giving about 6,000 points of light at the strand ends. Each region keeps 12 fibres for plan lines, and overflow lights further strand ends in order.
- **Consequences:**
  - the field is deterministic, so screenshots and geometry hashes can be tested;
  - nothing is downloaded;
  - generating about 83,000 vertices costs some time on first draw. It is cached in memory and measured in M2;
  - if the owner later wants real data, its licence and size get their own ADR.

## ADR-029: Renderer for Brain space

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:**
  - Brain space draws about 670 fibres and about 6,000 points, with additive light and hairlines, in a 358×340 CSS px canvas at device pixel ratio 2.
  - The CSP stays exactly as written (no `unsafe-eval`, no inline scripts or styles, no `blob:` workers). The initial bundle must stay at most 150 kB gzip, and it was 128.9 kB at the end of M1.
  - The brief asked for canvas 2D, raw WebGL2 and a library to be compared, with measured frame times on the WebKit iPhone preset.
- **Spike (2026-11-12):** a throwaway build in the session scratchpad, at the same counts and draw passes.
  - **Setup:** every page was served with the exact CSP header. Playwright ran headless with `devices['iPhone 15']` on WebKit and `devices['Pixel 7']` on Chromium. There were 3 runs per scenario, and the median is reported.
  - **Scenarios:** A is idle with signals moving; B is a drag that re-projects every frame; C is a zoom while the regions pull apart.

| Option | Renderer gzip | CSP | WebKit rAF p50/p95, A / B / C (ms) | WebKit draw p50/p95 (mean), A / B / C (ms) | Frames over 20 ms |
|---|---|---|---|---|---|
| Canvas 2D (offscreen cache for static layers) | 1.8 kB | 0 violations | 17/18, 17/17, 17/18 | 0/1 (0.26), 1/1 (0.78), 1/2 (1.22) | 0 |
| Raw WebGL2 | 3.0 kB | 0 violations | 17/18, 17/17, 17/17 | 0/1 (0.26), 0/1 (0.22), 0/1 (0.30) | 0 |
| OGL | 15.9 kB | 0 violations | 17/17, 17/17, 17/18 | 1/1 (0.69), 1/1 (0.69), 1/1 (0.70) | 0 |

  - **Chromium (Pixel 7) with the GPU on:** every option held 16.7 ms frames. Mean draw time in drag was 1.6 ms for canvas, 0.2 ms for WebGL2 and 0.4 ms for OGL. Without the GPU, Chromium uses software GL, and WebGL fell to about 117 ms a frame while canvas stayed fine.
  - **Other libraries:** three.js was size-checked only. Its renderer plus Line2 and LineMaterial is 138 kB gzip, so it was not built. regl is disqualified, because it builds code with `Function` (`regl/dist/regl.js:6015`). That is a static finding; regl was not run. OGL and three contain no `eval` or `new Function`.
  - **Look:** canvas strokes add light once per path, which reads soft and even. WebGL's extruded quads add light twice at every joint and overlap, which gives white hotspots and heavier halos unless joints are handled specially. WebGL's 0.5 px hairlines are smooth.
  - **Caveats:**
    - rAF is locked at 60 Hz, so draw time ranks the options better than frame intervals do;
    - WebKit's `performance.now()` is quantised to 1 ms;
    - CPU draw time leaves out GPU time;
    - Playwright WebKit runs on the Mac's CPU and GPU, so these numbers rank the options; they don't predict the iPhone.
- **Decision:** canvas 2D, with no library.
  - **Look:** it matches the reference, which is itself drawn with canvas 2D, and it avoids WebGL's joint hotspots.
  - **Speed:** the worst drag frame used under 2 ms of the 16.7 ms budget on WebKit.
  - **Size:** it adds almost nothing to the lazy chunk.
  - **Robustness:** it never depends on GPU WebGL support (it degrades gracefully in software rendering, including CI's).
  - **Budgets:** the lazy Brain space chunk (renderer, geometry and plate UI) has a 30 kB gzip budget, checked by `scripts/check-bundle-size.mjs`. The frame-time guard's threshold is set in M2 Task 2 from the first CI run, with 2× headroom.
- **Consequences:**
  - **Draw code:** static layers are cached offscreen and redrawn only when the camera or the data changes, and signals draw over the cache.
  - **Fallback:** raw WebGL2 (3 kB, already prototyped) is the fallback if the owner's iPhone check in M2 Task 2 shows stutter while turning. Its joints would then need handling to avoid hotspots, and that switch gets its own ADR.
  - **Spike files:** the throwaway spike stays out of the repo. Its results are recorded here.


## ADR-030: Brain space sits on Home above the card, with a strip on Started

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:**
  - The stuck flow must stay at most 3 taps, with no typing and no scrolling at 375×667 (spec §2).
  - Home shows at most one card above **I'm stuck** (spec §8.1).
  - The brief wants the line drawn during the two-minute timer. Its lean is Home, above **I'm stuck**.
  - The review measured the M1 build at 375×667:
    - about 372 px between Home's heading and **I'm stuck**;
    - 80 to 94 px free on Started between the chips and **Done for now**.
- **Options:**
  - **Home**, above the card and **I'm stuck**;
  - **its own route**, which adds a tap to see it, though not to the stuck flow;
  - **behind I'm stuck** as a backdrop, which puts text over additive light and makes contrast unpredictable.

  **For Started:**
  - a strip plate;
  - a full plate, which doesn't fit;
  - no plate, with the reveal on Home, where the user isn't during the timer, so it breaks the brief's rule 2.
- **Decision:**
  - **Home**, top to bottom: the plate, the card, then **I'm stuck**.
    - The visible heading becomes visually hidden.
    - The summary line, the controls and the parts row sit on the plate, so they cost no height.
    - The plate takes the rest, and at least 200 px with the tallest card (budget 180 px) and the Demo ribbon (40 px).
    - The renderer loads after **I'm stuck** paints.
  - **Started:** a strip plate of at most 80 px between "What is it?" and the timer's actions. It holds the burst, the reveal and **Still**. "What is it?" becomes one sideways-scrolling row of chips. Whether the strip fits is decided in M2 Task 8 by measurement: it may shrink to 64 px, and anything smaller goes back to the owner.
- **Consequences:**
  - the existing no-scroll E2E test guards both screens, now run with the tallest card and the Demo ribbon;
  - the owner judges both layouts at the Home review, and the parts row overlaying the plate is part of that review.

## ADR-031: Design skills are installed project-scoped, pinned, and never override the spec

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:** The brief asks for frontend-design, unslop and impeccable, installed project-scoped once a subagent has read each one's SKILL.md and scripts, confirmed its licence, and pinned its commit. The vetting ran on 2026-11-12, read-only through `gh api`.
- **Findings:**

| Skill | Licence | Pin | Scripts | Conflicts with this project |
|---|---|---|---|---|
| frontend-design (Anthropic) | Apache-2.0, ships its licence | marketplace `claude-plugins-official` at `e0ab6e5`, plugin 1.1.1; local copy matches upstream | none (markdown only) | asks for distinctive typefaces and "aesthetic risk" |
| unslop (heydamir/unslop) | CC-BY-4.0: credit, link and note changes; keep `LICENSE` with the copy | `97daa3eb365670ea3f87ed85356cbfcee18105a5` (2026-11-08) | `scripts/` runs Playwright and ffmpeg and fetches URLs, run by hand only | recommends font families, generated hero images, canvas effects, and its own copy rules |
| impeccable (pbakaus/impeccable) | Apache-2.0; the skill folder has no `LICENSE`, so the licence and `NOTICE` must be added | `b4bff1626c344067788c2679f048a20057c7cc5a` (2026-11-11), v0.1.22 | `scripts/impeccable` downloads a platform binary from GitHub releases into `~/.impeccable` and SKILL.md runs it every session; it can write hooks into `.claude/settings.local.json`; live mode injects a localhost script and tells the agent to loosen `script-src` and `connect-src` | "own-world" display faces; writes `PRODUCT.md`, `DESIGN.md` and `.impeccable/` state |

  The owner's personal impeccable copy is version 0.1.18, behind upstream's 0.1.22. Its launcher already ran on 2026-11-08: binary 0.1.18 is cached in `~/.impeccable/bin` next to a `seed-salt` file. The `skills` CLI (vercel-labs/skills 1.8.1, MIT) sends anonymous telemetry unless `DISABLE_TELEMETRY=1` is set.

- **Decision:**
  - **frontend-design:** the owner runs `claude plugin install frontend-design@claude-plugins-official --scope project`.
  - **unslop:** copy `skills/unslop` at `97daa3e` into `.claude/skills/unslop`, without `scripts/`, adding `LICENSE` and an `ATTRIBUTION.md` (author, link, changes: scripts removed). The end-of-milestone audit runs against the running preview with the project's own Playwright screenshots.
  - **impeccable:** not installed project-scoped. Its written guidance may be used from the owner's personal copy. Its launcher, hooks and live mode are never run on this project. The owner can choose otherwise at review: the alternative is a pinned project install of the markdown only, with `scripts/` removed and the licence and `NOTICE` added.
  - **All three** are advisory. They never override the spec's tokens, ADR-018's typefaces, the accessibility rules, the CSP, the copy rules or the approved Brain space look.
- **Consequences:**
  - no unvetted binary runs in this project's sessions;
  - unslop's attribution travels with it;
  - each UI milestone ends with an unslop audit (plan, M2 onward).

## ADR-032: Project subagents

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12; the agents are created in M2 Task 1)
- **Context:** The brief makes the lead the only agent that talks to the owner, owning decisions, the ledger, branches, commits and merges. Subagents do exploration, research, implementation, review and test runs, and a reviewer never sees the work being written.
- **Decision:** define these in `.claude/agents/`, each with a narrow brief, the files it may touch, and a return of under 200 words plus paths and command output:

| Agent | Does | May touch | Model |
|---|---|---|---|
| `researcher` | sources, versions, licences; read-only | nothing | sonnet |
| `domain` | pure domain, geometry and storage, test first, plus the purity tooling | `src/domain/**`, `src/geometry/**`, `src/storage/**`, `tests/purity/**`, `eslint.config.js`, `tsconfig*.json`, `vitest.config.ts` | sonnet |
| `renderer` | the lazy Brain space renderer and its build budget | `src/app/brain/**`, `vite.config.ts`, `scripts/check-bundle-size.mjs` | sonnet |
| `ui` | screens, components, copy, tokens, docs for users | `src/app/**` except `brain/`, `src/copy/**`, `src/design/**`, `README.md` | sonnet |
| `design-critic` | judges built screens against ADR-018, ADR-021 and the reference stills; read-only | nothing | opus |
| `accessibility` | axe, keyboard, the text equivalent, 2.2.2, 2.5.7 and contrast | `tests/e2e/**` | sonnet |
| `qa-webkit` | runs Playwright on the WebKit iPhone preset, including frame-time guards | `tests/**`, `playwright.config.ts` | sonnet |
| `code-reviewer` | reviews a diff it did not write against the spec and plan | nothing | opus |

- **Consequences:**
  - two writers that work in parallel use separate worktrees;
  - CI workflow changes stay with the lead;
  - approval gates are never delegated;
  - model choices keep usage within the owner's Max plan.

## ADR-033: Every Brain space action works without the canvas

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:** The brief requires every action to work without the canvas, a text equivalent listing parts and counts, and 48 px touch targets. The review found that turning worked only by dragging (WCAG 2.5.7), that the two-minute reveal on Started had no pause (2.2.2), and that `touch-action: none` could trap scrolling at 200% zoom.
- **Decision** (spec §16.10):
  - **The canvas is never needed.** It is `aria-hidden` and never focusable. Every action is a DOM control: part chips, **Still**, **Zoom in** and **Zoom out**, **Turn left** and **Turn right**, and the part card sheet with a focus trap.
  - **Keyboard:** while a plate control has focus, ← and → turn, and + and − zoom.
  - **Text equivalent:** each part with its starts, its plan lines with labels and counts, its start lines, then "No part", then the motion sentence.
  - **Still on every plate.**
  - **Touch:** `touch-action` falls back to `pan-y` whenever the page scrolls.
- **Consequences:** E2E checks the controls without a pointer drag and with the renderer chunk blocked, and axe runs on Home and Started with the plate in both themes.

## ADR-034: The demo fills the brain without faking data

- Date: 2026-11-12 · Status: **Accepted** (owner approval, 2026-11-12)
- **Context:** The brief asks for the 10-week demo to fill the brain. Spec §7.4 fixes the demo's shape: starts rising from about 6 to about 15 a week, 3 plans, and about 85% of occurrences started. The review found the first draft's 5 plans would break those bands.
- **Options:**
  - more plans and starts, which breaks §7.4's realism;
  - keep §7.4's bands, with parts and staggered plans so every strength appears.
- **Decision:** the second (spec §16.11).
  - **Parts:** 5 named parts, with about 80% of starts tagged.
  - **Plans:** the 3 plans, started in weeks 1, 3 and 6, reach Well-worn, Steady and Repeated.
  - **Moving:** the generator places a start on `endDate`.
- **Consequences:** every part has light and every strength appears, so a visitor sees the full range on the same projection as real data.
