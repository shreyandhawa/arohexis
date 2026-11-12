# Arohexis: design spec

Status: **approved** by the owner on 2026-11-11. Decision log: [decisions.md](decisions.md).

## 1. Summary

Arohexis is a local-first, installable web app for chronic procrastination. It trains **the moment of starting**, not task management. When you are stuck you tap one button and name the feeling. Arohexis shows a short response matched to that feeling, and you take a two-minute first step. Each start is rewarded right away. If-then plans tie a cue (a fixed time and place) to a first action. When a plan doesn't happen, you get a short forgive-and-replan script. The insights show which feelings, hours, task types, and responses lead to starts, plus a weekly check-in on how automatic starting feels.

"Training" here means ordinary learning: the same cue, a new response, an immediate reward, repeated until it is automatic. Arohexis makes no claims about brain change and does not diagnose or treat any condition.

## 2. Goals, non-goals, success criteria

### Goals

- Make starting easier in the moment, in under 30 seconds and one-handed, on an iPhone.
- Keep honest data on starts so the owner can see what helps.
- Ship as production-quality portfolio work: tested, accessible, deployed, documented, and explorable through a demo without exposing anyone's data.
- Make everything configurable per user. Nothing is hardcoded to the owner; the defaults come from the evidence in §3.

### Non-goals (v1)

Accounts, cloud sync, AI chat, social features, native apps, site or app blocking, task lists, due dates, and tracking completions.

### Success criteria

| Criterion | How it is checked |
|---|---|
| From the Stuck button to a running timer takes at most 3 taps, no typing, and no scrolling at 375×667 | Playwright E2E on the WebKit iPhone preset |
| The stuck flow takes under 30 s from tap to timer | Responses are capped at 40 words (unit test); one timed manual check on the owner's iPhone per release |
| Works offline after the first load | Playwright offline scenario |
| Installable on the iOS Home Screen; data survives restarts | Manual check on an iPhone; persistence E2E |
| WCAG 2.2 AA on every screen, light and dark | axe in E2E plus a manual keyboard and VoiceOver pass |
| The domain is pure and covered | Domain `tsconfig` has no DOM lib; at least 95% line coverage on `src/domain` |
| CI on every push; `main` deploys to a public URL | GitHub Actions to Cloudflare |
| Demo mode shows 10 realistic weeks without touching real data | E2E demo-isolation test |
| The owner uses it daily for 10–12 weeks | Starts per week and the check-in trend in Insights |

## 3. Evidence base and claims policy

Arohexis states only what these sources support, with the caveats shown. The README's "Why it works" section and the in-app About screen use this table.

| Claim (as worded in the product) | Source | Caveat we state |
|---|---|---|
| Procrastination is mostly about avoiding the bad feeling a task brings: a short-term mood repair | Sirois, F. & Pychyl, T. (2013). Procrastination and the priority of short-term mood regulation. *Social and Personality Psychology Compass*, 7(2), 115–127. doi:10.1111/spc3.12011. Also: APA *Speaking of Psychology*, "Why we procrastinate and what to do about it," with Fuschia Sirois (2022), https://www.apa.org/news/podcasts/speaking-of-psychology/procrastinate | Theoretical review. The podcast is an interview, not a study |
| People discount future effort more steeply than future reward | Le Bouc, R. & Pessiglione, M. (2022). A neuro-computational account of procrastination behavior. *Nature Communications*, 13, 5639. https://doi.org/10.1038/s41467-022-33119-w | Small lab study (N=51) |
| Psychological treatments show small benefits for procrastination; CBT looks promising in a few trials | Rozental, A. et al. (2018). Targeting procrastination using psychological treatments: a systematic review and meta-analysis. *Frontiers in Psychology*, 9, 1588. https://www.frontiersin.org/article/10.3389/fpsyg.2018.01588/full | Overall g=0.34; the CBT estimate (g=0.55) rests on 3 studies; the authors call CBT's superiority "unclear" |
| If-then plans help people act on their goals | Gollwitzer, P. M. & Sheeran, P. (2006). Implementation intentions and goal achievement: a meta-analysis of effects and processes. *Advances in Experimental Social Psychology*, 38, 69–119. doi:10.1016/S0065-2601(06)38002-1 | d=.65 across 94 tests, on goal attainment in general rather than procrastination |
| Forgiving yourself for procrastinating is associated with less procrastination later | Wohl, M. J. A., Pychyl, T. A. & Bennett, S. H. (2010). I forgive myself, now I can study. *Personality and Individual Differences*, 48(7), 803–808. https://doi.org/10.1016/j.paid.2010.01.029 | Correlational; one student sample |
| In one review, habits took a median of about two months (59–66 days) to form, with a range of 4–335 days | Singh, Murphy, Maher & Smith (2024). Time to form a habit: a systematic review and meta-analysis of health behaviour habit formation and its determinants. *Healthcare*, 12(23), 2488. https://doi.org/10.3390/healthcare12232488 | Only 4 studies reported timing; a stable cue is thought to help but was not tested |
| Naming your feelings and breaking a task into a first step made people feel more likely to start | Garg, Shelat & Schooler (2025). "Now I feel like I'm going to get to it soon…" *BMC Psychology*, 13, 1158 (RCT, N=1,035) | Measured self-reported likelihood, not actual completion |
| The weekly check-in uses a published habit measure | Gardner, B., Abraham, C., Lally, P. & de Bruijn, G.-J. (2012). Towards parsimony in habit measurement: the Self-Report Behavioural Automaticity Index. *IJBNPA*, 9, 102. doi:10.1186/1479-5868-9-102 (CC BY) | Self-report |
| The two-minute start | none | Presented as a practical technique. **No trial has tested it.** |

**Correction to the original brief.** The brief said "CBT-based treatment and if-then plans have the best trial support" and cited Rozental et al. (2018). That paper doesn't support the claim: it found small effects overall and did not pool implementation intentions. We use the softer wording above and cite Gollwitzer & Sheeran (2006) for if-then plans. See ADR-010.

**Wording rules**
- Say "is associated with", "in one study", "may help". Never say "proven", "rewires", "clinically", or "treats".
- No claims about ADHD, depression, anxiety disorders, or any other condition.
- Every evidence claim in the UI links to the About screen, which lists the citations.

**Not-medical-advice note** (in the README, on the About screen, and in onboarding step 1):
> Arohexis is a self-help tool, not medical advice. It doesn't diagnose or treat ADHD, depression, anxiety or any other condition. If procrastination is seriously affecting your life, consider talking to a qualified professional.

## 4. Users and context of use

- **In the moment:** the user is stressed and stuck, holding a phone in one hand, often seconds away from switching to something easier. Every extra decision costs them. So each screen has one primary action, nothing needs to be typed, the action sits in the thumb zone, and the copy is calm.
- **Planning:** the user is calm and has time. Creating and editing plans and settings can take more taps and can involve typing.
- **Reviewing:** a weekly glance at Insights and the check-in.
- **Portfolio visitor:** opens the public URL on desktop or phone and explores demo mode.

Primary device: the owner's **iPhone**, using Arohexis as a Home Screen web app. Fully usable on desktop with a keyboard.

## 5. Architecture

### 5.1 Stack

Versions were checked against npm and the official docs on 2026-11-11 (see ADR-008).

| Concern | Choice | Why |
|---|---|---|
| UI framework | React 19.3 | The owner's daily stack, so effort goes into the product rather than the tooling. Largest ecosystem for accessibility and testing |
| Build | Vite 8.3, `@vitejs/plugin-react` 6.3 | Fast; first-class PWA plugin. React Compiler is off in v1 (ADR-013) |
| Language | TypeScript 6.0, `strict` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` | Matches the owner's other projects; TypeScript 7 gets evaluated when the project is scaffolded (ADR-012) |
| PWA | vite-plugin-pwa 2.0 (`generateSW`, `registerType: 'prompt'`), Workbox 7.4 | Precaches the whole app for offline use. The update prompt never reloads in the middle of a flow |
| Storage | Dexie 4.4, `dexie-react-hooks` 4.4 (`useLiveQuery`) | Versioned schema migrations and reactive queries. Apache-2.0 |
| Routing | React Router 8, declarative mode | No plugin, no file conventions; a handful of routes |
| Styling | CSS custom properties (design tokens) + CSS Modules | Tokens come first and are readable; a bespoke, typography-led look with nothing to override (ADR-015) |
| Validation | Valibot 1.5 | Validates imports; modular, small, and has no DOM dependency, so it can live in the domain layer (ADR-014) |
| Dates | date-fns 4.4 + `@date-fns/tz` 1.5 | Plan times stay correct across daylight-saving changes. Temporal isn't used (unconfirmed on Safari) |
| IDs | `crypto.randomUUID()`, passed in | Deterministic in tests |
| Charts | Hand-built SVG, each with a table alternative | Few charts, full control over type and accessibility |
| Fonts | Self-hosted with Fontsource | Works offline; no third-party requests |
| Unit tests | Vitest 5.1, fast-check 4.10, fake-indexeddb 6.2 | |
| E2E | Playwright 1.65, `@axe-core/playwright` 4.14 | WebKit iPhone preset is the closest match to the owner's device |
| Lint | ESLint 10, typescript-eslint 8.72 | |
| Hosting | Cloudflare Workers Static Assets, Wrangler 4 | Custom headers, SPA fallback, branch previews, free tier (ADR-007) |
| Runtime | Node 26 LTS (`.nvmrc`) | React Router 8 needs Node 22.22 or later |

### 5.2 Layers

```
src/
  domain/          Pure TypeScript. No React, Dexie, DOM, or network.
    events.ts        Event union, event constructors, EVENT_SCHEMA_VERSION
    attempts.ts      foldAttempts(events) → Attempt[]
    matcher.ts       pickResponse(...)
    plans.ts         occurrences and occurrence status (timezone-aware)
    lapse.ts         findLapseToRepair(...), applyRepair(...)
    metrics.ts       starts per week, by feeling/hour/task type, response stats
    checkin.ts       SRBAI items, scoring, isCheckinDue(...)
    ics.ts           planToIcs(plan, tz) → string (RFC 5545)
    defaults.ts      default feelings, responses, task types, obstacles
    demo.ts          generateDemoData(seed, endDate, tz)
    exportFormat.ts  Valibot schema, parseExport, migrateExport, buildExport
    ports.ts         Clock, IdGen, EventStore, ConfigStore interfaces
    week.ts          week bucketing helpers
  storage/         Dexie database, schema versions, repositories implementing the ports
  app/             React: routes, screens, components, hooks, actions
  copy/            Every user-facing string, grouped by screen
  design/          tokens.css, themes, global styles, fonts
tests/e2e/         Playwright specs
```

**Dependency rule:** `app` → `domain` + `storage` + `copy` + `design`. `storage` → `domain`. `domain` imports nothing outside itself except `valibot`, `date-fns`, and `@date-fns/tz`.

**Enforcement:**
- `src/domain/tsconfig.json` sets `lib: ["ES2024"]` and `types: []`, so any `window`, `document`, `indexedDB`, or `navigator` fails type-checking.
- ESLint `no-restricted-imports` in `src/domain/**` bans `react*`, `dexie*`, and relative imports out of `domain/`.
- Both checks run in CI.

**Thin UI:** screens read projections through hooks (`useAttempts`, `useWeekCount`, …) and call **actions** in `src/app/actions/`. An action:
1. reads what it needs;
2. calls pure domain functions that return new events or config changes;
3. writes them through the storage port.

All logic lives in the domain function; the action only wires it up.

### 5.3 Runtime data flow

```
tap ─▶ action ─▶ domain fn (pure) ─▶ events[] ─▶ EventStore.append (Dexie tx)
                                                      │
screen ◀─ useLiveQuery ◀─ domain projection (pure) ◀──┘
```

## 6. Domain model

### 6.1 Concepts

| Term | Meaning |
|---|---|
| **Attempt** | One pass through the stuck flow, from tapping Stuck (or Start now on a plan) until a start is made or the attempt is dismissed or abandoned |
| **Start** | The moment the user taps Start and begins a physical action. A start counts unless it is undone |
| **Feeling** | A user-configurable label for what the user feels when stuck |
| **Response** | A short, rule-based intervention tied to one feeling, tagged with a **basis** (the technique it uses) |
| **Basis** | One of `name-the-feeling`, `shrink-the-step`, `self-kindness`, `reframe`, `pair-a-reward`. Each maps to a source in §3 |
| **Task type** | An optional tag added after a start (writing, study, …) |
| **Plan** | An if-then plan: "If it's [time] on [days] at [place], then I will [first action]" |
| **Occurrence** | One scheduled instance of a plan on a local date |
| **Lapse** | An occurrence that closed without a linked start ("slipped") |
| **Repair** | The forgive-and-replan script for a lapse |
| **Check-in** | The weekly 4-item SRBAI questionnaire |

### 6.2 Events

Every event shares the envelope `{ id: string, type, at: number /* epoch ms */, tz: string /* IANA */, v: 1 }`. Events are append-only and are never edited. Payloads snapshot labels so that later config edits don't rewrite history.

| Type | Payload |
|---|---|
| `attempt.opened` | `attemptId`, `source: 'stuck' \| 'plan'`, `planId?`, `occurrence?` |
| `feeling.named` | `attemptId`, `feelingId`, `label` |
| `response.shown` | `attemptId`, `feelingId`, `responseId`, `basis` |
| `start.made` | `attemptId`, `planId?`, `occurrence?`, `backfilled: boolean` |
| `start.undone` | `attemptId` |
| `start.tagged` | `attemptId`, `taskTypeId`, `label` |
| `timer.closed` | `attemptId`, `elapsedSec`, `outcome: 'kept-going' \| 'stopped'` |
| `attempt.dismissed` | `attemptId` |
| `occurrence.resolved` | `planId`, `occurrence: 'YYYY-MM-DD'`, `outcome: 'slipped' \| 'expired'` |
| `lapse.repaired` | `planId`, `occurrence`, `startedAnyway: boolean`, `obstacleId?`, `obstacleLabel?`, `choice: 'keep' \| 'smaller' \| 'move' \| 'pause'` |
| `checkin.submitted` | `weekOf: 'YYYY-MM-DD'`, `answers: [n, n, n, n]` (each 1–7) |

A plan's occurrence counts as started when a `start.made` has the same `planId` and `occurrence`, so no separate "started" resolution event is needed.

### 6.3 Projections (pure)

```ts
type Attempt = {
  id: string; openedAt: number; tz: string;
  source: 'stuck' | 'plan'; planId?: string; occurrence?: string;
  feeling?: { id: string; label: string };
  response?: { id: string; basis: Basis };
  start?: { at: number; backfilled: boolean };
  undone: boolean;
  taskType?: { id: string; label: string };
  timer?: { elapsedSec: number; outcome: 'kept-going' | 'stopped' };
  dismissed: boolean;
};

foldAttempts(events: AppEvent[]): Attempt[]
isCountedStart(a: Attempt): boolean            // a.start && !a.undone
```

An attempt with no start and no dismissal is treated as abandoned (for example, the app was closed mid-flow). Abandoned and dismissed attempts still count as "shown" for their response in `responseStats`.

### 6.4 Rules

**Matcher**: `pickResponse(feelingId, responses, events) → Response`
1. Candidates are the feeling's responses with `enabled: true`.
2. Pick the candidate whose most recent `response.shown` is oldest. A candidate never shown counts as oldest. Ties go to the lowest `order`.
3. With no candidates, return the generic response (`generic.any`). That response always exists, is editable, and can't be deleted.

Property: with k enabled responses, any k consecutive picks for that feeling show each response exactly once.

**Plan occurrences** (`plans.ts`):
- A plan's `time` is wall-clock time in the device's **current** time zone (`Clock.timeZone()`), so a 09:00 plan means 09:00 wherever the user is (ADR-017).
- Occurrences fall on the plan's `days` (0 = Sunday … 6 = Saturday).
- A local time that doesn't exist (a spring-forward gap) moves to the next valid minute. An ambiguous time (fall-back) uses the first instance.
- Status of an occurrence at time T for a plan with `graceMin` G is the first rule that matches, in this order:
  1. `started` if a counted start is linked to it;
  2. `resolved` if an `occurrence.resolved` or `lapse.repaired` exists for it;
  3. `upcoming` before T − 15 min;
  4. `open` from T − 15 min to T + G;
  5. `slipped` once T + G has passed.
- Inactive (paused) plans have no occurrences. Only occurrences on or after the plan's `createdAt` are considered.

**Lapse**: `findLapseToRepair(plans, events, now, tz)`:
1. Collect slipped, unresolved occurrences from the last 7 days.
2. Return only the **most recent** one for the repair sheet. The caller records `occurrence.resolved { outcome: 'expired' }` for the others, so nothing piles up and there is never a list of lapses.
3. Slipped occurrences older than 7 days are expired the same way.

`applyRepair(plan, choice, input)` returns a plan patch:
- `keep`: no change;
- `smaller`: replaces `firstAction` with the user's new text;
- `move`: new `time` and/or `days`;
- `pause`: `active: false`.

If `startedAnyway` is true, a backfilled `start.made` is also recorded. It counts as a start.

**Metrics** (`metrics.ts`). All of them take `Attempt[]`, the current time, and settings:
- `startsByWeek`: contiguous weeks from the first event to now, zeros included. Weeks start on `weekStartsOn` (default Monday), bucketed in each start's own `tz`.
- `startsThisWeek`: the headline count. It only increases within a week.
- `startsByFeeling`: grouped by `feelingId`, labeled with the newest snapshot. Plan starts made without the stuck flow are grouped as "From a plan".
- `startsByHour`: 24 counts by the local hour of `start.at` in the start event's `tz`.
- `startsByTaskType`: includes "Untagged".
- `responseStats`: per response, `shown`, `ledToStart`, and `rate`, with `earlyDays: shown < 5`.
- No metric for completions exists or will be added.

**Check-in** (`checkin.ts`):
- **Stem:** "Starting a task I've been putting off is something…"
- **Items:**
  1. "I do automatically."
  2. "I do without having to consciously remember."
  3. "I do without thinking."
  4. "I start doing before I realize I'm doing it."
- **Scale:** 1 = strongly disagree … 7 = strongly agree. Score = mean of the 4 answers.
- **Due:** each check-in period runs from one `checkinDay` (default Sunday) to the next, and `weekOf` is the date of the period's `checkinDay`. The check-in is due from the start of the period until it is submitted or skipped for that period (`kv.checkinDismissedWeek` holds the skipped `weekOf`). Periods don't depend on `weekStartsOn`.
- **Trend:** one point per submitted week.
- **Attribution:** "Adapted from the Self-Report Behavioural Automaticity Index (Gardner et al., 2012), CC BY."

**Calendar export** (`ics.ts`): one `VEVENT` per plan.
- `UID: <plan.id>@arohexis`, `SEQUENCE` = edit count.
- `DTSTART;TZID=<tz>`, 5-minute duration, plus the matching `VTIMEZONE` component that RFC 5545 requires for each `TZID`. It is generated in pure code from the zone's UTC-offset transitions over the next 3 years (`STANDARD`/`DAYLIGHT` observances with `RDATE`s), so the 09:00 alarm stays at 09:00 across daylight-saving changes.
- `RRULE:FREQ=WEEKLY;BYDAY=…`.
- `SUMMARY`: the plan's if-then sentence from `planSentence(plan)`, e.g. "If it's 9:00 at my desk, then open the essay doc". The optional cue detail is appended to the "if" part ("…at my desk, after coffee").
- `LOCATION: <place>`.
- `DESCRIPTION`: "Open Arohexis from your Home Screen."
- `VALARM` with `ACTION:DISPLAY` and `TRIGGER:PT0M`.
- No `URL` (see §10). Lines end in CRLF and are folded at 75 octets. Unit tests parse the output with Mozilla's `ical.js` (a dev dependency) and check the recurrence expands to 09:00 local time on both sides of a DST change.

### 6.5 Ports

```ts
interface Clock { now(): number; timeZone(): string }
interface IdGen { next(): string }
interface EventStore {
  append(events: AppEvent[]): Promise<void>;         // one transaction
  list(range?: { from?: number; to?: number }): Promise<AppEvent[]>;
}
interface ConfigStore {
  getConfig(): Promise<Config>;                      // feelings, responses, taskTypes, obstacles, plans, settings
  applyConfigPatch(patch: ConfigPatch): Promise<void>;
}
```

## 7. Data schema

### 7.1 IndexedDB (Dexie), database `arohexis`, version 1

| Table | Index spec | Record |
|---|---|---|
| `events` | `id, at, type, attemptId, planId, [type+at]` | event envelope + payload (attemptId/planId lifted to top level for indexing) |
| `feelings` | `id, order` | `{ id, label, order, enabled, builtIn }` |
| `responses` | `id, feelingId, order` | `{ id, feelingId, body, basis, enabled, order, builtIn }` |
| `taskTypes` | `id, order` | `{ id, label, order, enabled }` |
| `obstacles` | `id, order` | `{ id, label, order, enabled }` |
| `plans` | `id, active` | `{ id, place, cueDetail?, firstAction, time: 'HH:MM', days: number[], graceMin, active, createdAt, editCount }` |
| `kv` | `key` | `{ key, value }` |

`kv` keys: `schemaVersion`, `onboarded`, `theme: 'system' | 'light' | 'dark'`, `weekStartsOn`, `checkinDay`, `checkinDismissedWeek`, `lastExportAt`, `persistRequested`.

On first open, the defaults in §9 are seeded in one transaction with `builtIn: true`. Built-in items can be edited and disabled, but not deleted (deleting would orphan history labels and break the generic fallback).

### 7.2 Migrations

- Each Dexie version keeps an `upgrade()` function, and old versions stay in code as long as they have one.
- Every migration has a fake-indexeddb test that opens a fixture database at the previous version and checks the migrated data.
- The event schema version (`v`) is independent of the database version. Readers accept every `v` they know, and migrations turn old events into new shapes when read.

### 7.3 Export and import format

```json
{
  "format": "arohexis-export",
  "version": 1,
  "exportedAt": "2026-11-11T09:00:00.000Z",
  "app": { "name": "Arohexis", "build": "<git sha>" },
  "data": {
    "feelings": [], "responses": [], "taskTypes": [], "obstacles": [],
    "plans": [], "settings": {}, "events": []
  }
}
```

**Export:**
- File name: `arohexis-export-YYYY-MM-DD.json`.
- On iOS it goes through the Web Share API (`navigator.canShare({ files })`) so it can be saved to Files; the fallback is a normal download.
- Afterwards `kv.lastExportAt` is set.

**Import:**
1. Parse the file and validate it with Valibot.
2. A `version` newer than supported is refused with a plain message. An older one is migrated.
3. A preview shows counts ("312 events, 4 plans, 6 feelings").
4. On confirmation, everything is **replaced** in one Dexie transaction, and a failure changes nothing.
5. Before replacing, the user is offered "Export current data first".

Merging imports is out of scope for v1.

**Delete all data:** Settings → Data → "Delete everything on this device". A confirmation sheet names what will be lost and offers export first.

### 7.4 Demo database

- **Separate database:** demo mode uses its own database, `arohexis-demo`. Which database is active is stored in `localStorage['arohexis:db']` (`'main' | 'demo'`). It is a pointer only, and losing it falls back to `main`.
- **Generator:** `generateDemoData(seed = 20261111, endDate = yesterday, tz)` is pure and deterministic (mulberry32 PRNG). It produces the default config, 3 plans, and 10 weeks of events:
  - starts rise from about 6 to about 15 per week, with two dip weeks;
  - the start rate per attempt rises from about 55% to about 80%;
  - hours cluster around 08–11, 14–16 and 20–22;
  - the feeling mix shifts from anxious and overwhelmed toward bored and unsure;
  - about 60% of starts are tagged;
  - about 85% of plan occurrences start, and most slipped ones are repaired;
  - weekly check-ins rise from about 2.5 to about 4.6, with noise, clamped to 1–7.
- **Safeguards:**
  - A persistent "Demo" ribbon is shown, with Exit and Reset.
  - Every write in demo mode goes to `arohexis-demo` only.
  - Exporting from demo is allowed and labeled as demo data.

### 7.5 Storage durability on iOS

- **Separate storage:** a Home Screen web app has storage separate from Safari's. Onboarding says this plainly.
- **Persistent storage:** `navigator.storage.persist()` is requested after the first counted start. The result is shown in Settings → Data.
- **Backups:** export is the backup. Settings → Data shows "Last backup: N days ago". From 14 days, the weekly check-in card adds a quiet "Back up now" link. It never nags or blocks.

## 8. Screens and flows

Layout: a single column, at most 34rem wide on desktop. The primary action sits in the bottom thumb zone on phones. A persistent quiet Stuck button appears on every screen except the stuck flow itself.

**Routes:**

| Route | Screen |
|---|---|
| `/` | Home |
| `/stuck` | Feeling |
| `/stuck/:attemptId` | Response |
| `/started/:attemptId` | Started and timer |
| `/plans` | Plans |
| `/plans/new` | New plan |
| `/plans/:id` | Edit plan |
| `/insights` | Insights |
| `/checkin` | Weekly check-in |
| `/settings` | Settings |
| `/settings/feelings` | Feelings and responses |
| `/settings/lists` | Task types and obstacles |
| `/settings/data` | Data |
| `/about` | About |
| `/welcome` | Onboarding |

The lapse repair is a sheet over Home.

**Keyboard (desktop):** `S` opens the stuck flow from anywhere, except while typing in a field. On the Feeling screen, number keys `1`–`9` pick feelings in the order shown. `Enter` activates the primary action. `Esc` goes back or dismisses.

### 8.1 Home (`/`)
- **Primary:** a large **I'm stuck** button.
- **Above it, at most one card**, in this priority order:
  1. lapse to repair;
  2. plan open now;
  3. check-in due;
  4. "Update ready" (from the service worker, deferred while a flow is in progress).
- **Below:** quiet text links to Plans, Insights, and Settings. The line "N starts this week" appears only when N > 0.
- **Emits:** nothing until a tap.

### 8.2 Feeling (`/stuck`)
- On entry, emits `attempt.opened { source: 'stuck' }`.
- **Content:** the heading "What's in the way?", the enabled feelings as large full-width buttons in `order`, then "Something else".
- **One tap:** emits `feeling.named` and `response.shown` (from the matcher), then navigates to Response.
- **Leaving without choosing:** "Back" emits `attempt.dismissed`. Closing the app emits nothing; the attempt simply stays open with no start.

### 8.3 Response (`/stuck/:attemptId`)
- **Content:** the response body (40 words or fewer), then the line "First step: say it out loud."
- **Primary:** **Start**. It emits `start.made` and goes straight to Started.
- **Quiet:** "Not now" emits `attempt.dismissed` and returns Home with the line "That's fine. The button's here when you need it."

### 8.4 Started and timer (`/started/:attemptId`)
- **Reward on arrival:**
  - "Started." in display type;
  - "That's the hard part.";
  - "N starts this week".
  - Motion is one calm settle of 240 ms, or an opacity fade under reduced motion. There is no sound by default and no haptics (iOS has no Vibration API).
- **Timer:**
  - A 2:00 countdown, computed from `start.at`, so it stays correct after the phone locks or the app is backgrounded.
  - Screen readers hear `aria-live="polite"` announcements at 1:00 and 0:00 only.
- **Undo:** a visible **Undo** for the first 10 s. After that it becomes a quiet "Remove this start" link that stays while the Started screen is open (so there's no hard time limit; see §11.3). Either one emits `start.undone`, returns Home, and shows "Start removed."
- **Task tag:** an optional chip row titled "What is it?" with the enabled task types. One tap emits `start.tagged`, and the choice can be changed while on screen (the latest tag wins in the projection).
- **At 0:00:** "Two minutes done." with **Keep going** and **Done for now** as equal-weight buttons, plus the line "Either is good." Both emit `timer.closed`.
- **Ending early:** "Done for now" is available at any time and records `elapsedSec`.

### 8.5 Plans (`/plans`, `/plans/new`, `/plans/:id`)
- **List:** each plan reads as a sentence, "If it's 9:00 on weekdays at my desk, then I will open the essay doc.", with an Active/Paused state.
- **Editor fields:**
  - time (native time input);
  - days (seven toggles, with presets for Weekdays, Every day, and Weekends);
  - place (text);
  - cue detail (optional text);
  - first action (text, with the hint "Something your hands can do in under two minutes").
- **Live preview:** the if-then sentence updates as the user types.
- **Add to calendar:** downloads `<plan>.ics`. The help text explains:
  - it is a one-time import;
  - after editing a plan, delete the old calendar event and add it again;
  - the alarm opens your calendar, not Arohexis.

### 8.6 Plan due card (Home)
- **Appears:** while an occurrence is open.
- **Content:** "9:00 · at my desk", then "Open the essay doc".
- **Primary:** **Start now**. It emits `attempt.opened { source: 'plan', planId, occurrence }` and `start.made { planId, occurrence }`, then goes to Started. The plan *is* the first step.
- **Quiet:** "I'm stuck on this" runs the stuck flow with the plan linked to the attempt.

### 8.7 Lapse repair (sheet on Home)
Under 30 seconds. Every step can be skipped.
1. "This one didn't happen: *9:00 · open the essay doc*." Then "That's part of learning anything. It's information, not a verdict." Then "Did you start it anyway?" with the buttons **Yes, I started** and **Not this time**.
2. If not: "What got in the way?" with obstacle chips and Skip.
3. "What would help next time?" with **Keep the plan**, **Make the first step smaller**, **Move the time**, and **Pause this plan**. "Smaller" and "Move" open the matching field inline.
4. Emits `lapse.repaired`, plus a backfilled `start.made` if the user started anyway. Closing the sheet without finishing records `occurrence.resolved { outcome: 'slipped' }`, so the sheet doesn't come back for that occurrence.
5. Closes with "Plan updated." and an optional **Two minutes now?**, which starts the plan's first step right away. That is a new plan-linked start, not tied to the slipped occurrence.

### 8.8 Weekly check-in (`/checkin`)
- **Intro:** "Four quick questions about how starting feels lately. There are no right answers."
- **Questions:** each of the four items is a 7-point segmented control (radio group) with end labels.
- **Actions:** Submit emits `checkin.submitted`. "Skip this week" sets `checkinDismissedWeek`.
- **Extras:** the attribution line, and the "Back up now" link when §7.5 applies.

### 8.9 Insights (`/insights`)
The sections, in order:
1. **Starts per week:** a column chart of all weeks, with this week highlighted in the accent color and no goal line.
2. **When you start:** a 24-cell hour strip.
3. **Feelings:** starts by feeling, as horizontal bars.
4. **Task types:** including Untagged.
5. **What helps:** for each feeling, its responses with "shown N · led to a start M", plus "early days" when N < 5.
6. **How automatic starting feels:** a line chart of weekly check-in means on the 1–7 axis.

Every chart has a visually hidden data table and a one-sentence text summary. Colors are neutral, never red or green. With fewer than 3 starts, a calm empty state reads "Insights appear after a few starts."

### 8.10 Settings
- **Feelings and responses:**
  - rename, reorder, enable or disable, and add feelings;
  - edit, add, and disable responses per feeling, with a live word count capped at 40;
  - picking a basis for a new response is optional and defaults to `shrink-the-step`.
- **Task types and obstacles:** the same list editor.
- **Preferences:** theme, week start day, check-in day.
- **Data:**
  - export and import;
  - last backup;
  - storage persistence status;
  - delete everything;
  - enter or exit demo.
- **About:** what Arohexis is, the evidence table from §3 with links, the not-medical-advice note, the SRBAI attribution, the version and build.

### 8.11 Onboarding (`/welcome`, first run only, at most 3 steps)
1. "Arohexis helps you practice one thing: starting. When you're stuck, tap the button, name the feeling, and take a two-minute first step." Followed by the not-medical-advice note.
2. **Only in iOS Safari outside standalone mode:** "Add Arohexis to your Home Screen: tap Share, then Add to Home Screen. Your data stays on this device. Safari and the Home Screen app keep separate copies, so use the Home Screen app."
3. **Start fresh** (seeds defaults and goes Home) or **Explore the demo** (switches to the demo database).

**Standalone check:** if Arohexis is opened in iOS Safari outside standalone mode and the main database is empty, Home shows a one-line note pointing to the Home Screen app.

## 9. Default content

US English throughout. All copy lives in `src/copy/`.

### 9.1 Feelings
`anxious` Anxious · `bored` Bored · `overwhelmed` Overwhelmed · `unsure` Unsure where to begin · `perfectionistic` Perfectionistic · and the fixed `other` **Something else**, which is always shown last, can be renamed but not disabled, and always uses `generic.any`.

### 9.2 Responses (every response is 40 words or fewer)

| id | Feeling | Basis | Body |
|---|---|---|---|
| `anxious.name` | Anxious | name-the-feeling | That's anxiety. You can feel it and still start. You don't have to feel ready first. What would your hands do in the first ten seconds? |
| `anxious.shrink` | Anxious | shrink-the-step | Make the step so small it feels almost silly: open the file, write the date, pick up the pen. Only that. Two minutes, then you can stop. |
| `anxious.kind` | Anxious | self-kindness | Feeling anxious about this makes sense. Talk to yourself the way you'd talk to a friend who's stuck. Then give the very first step two minutes. |
| `bored.reward` | Bored | pair-a-reward | Pair it with something you like: a song, a warm drink, a better chair. Set it up, then start before the song ends. |
| `bored.sprint` | Bored | reframe | Turn it into a two-minute sprint. How far can you get before the timer runs out? It doesn't have to be good. |
| `bored.shrink` | Bored | shrink-the-step | Pick the least boring piece and do that first. The order doesn't matter yet. |
| `overwhelmed.shrink` | Overwhelmed | shrink-the-step | You only need the first step, not the whole plan. What's one thing you can physically do in two minutes? |
| `overwhelmed.unload` | Overwhelmed | shrink-the-step | Write what's in your head as three short lines. Then pick the easiest one. That's your first step. |
| `overwhelmed.kind` | Overwhelmed | self-kindness | It's a lot, and it's fine to feel that. You don't have to sort all of it now. Two minutes on one corner is enough. |
| `unsure.open` | Unsure where to begin | shrink-the-step | Open the thing: the document, the email, the book. Opening it counts as starting. |
| `unsure.obvious` | Unsure where to begin | shrink-the-step | Begin with the obvious part: a title, a date, a file name. Clarity can come later. |
| `unsure.question` | Unsure where to begin | reframe | Write down the question you're stuck on, as a note to yourself. Naming what's unclear is real work. |
| `perfectionistic.rough` | Perfectionistic | reframe | Make a deliberately rough version. It's a draft. You'll improve it later. |
| `perfectionistic.enough` | Perfectionistic | reframe | Aim for "good enough to fix": three bullet points, a sketch, a messy first line. |
| `perfectionistic.kind` | Perfectionistic | self-kindness | High standards are fine, and they can wait for the second pass. For now, two minutes of imperfect work. |
| `generic.any` | Something else | name-the-feeling | Whatever the feeling is, you can have it and still start. What's the very first physical step? Two minutes on just that. |

**Basis → source**, as shown on the About screen:

| Basis | Source |
|---|---|
| name-the-feeling | Garg et al. 2025 |
| shrink-the-step | Garg et al. 2025 |
| self-kindness | Wohl et al. 2010 |
| reframe | Rozental et al. 2018 (cognitive techniques used in CBT) |
| pair-a-reward | Garg et al. 2025 |

### 9.3 Task types
Writing · Study · Admin & email · Chores · Creative · Other.

### 9.4 Obstacles
Timing didn't fit · Low energy · First step felt too big · Something came up · Forgot.

### 9.5 Copy rules (enforced by `copy.test.ts`)
- **Banned words**, matched as whole words and case-insensitively across `src/copy/**` and default content: streak, fail, failed, failure, lazy, missed, miss, broke, broken, behind, wasted, should have, must, hurry.
- No exclamation marks.
- Response bodies are 40 words or fewer.
- The UI never shows a comparison between weeks as a judgement: no "down 3 from last week".

## 10. Reminders decision

**Decision (ADR-011): v1 uses in-app cues plus calendar export. There is no push server.**

### Options compared

| | Calendar export (.ics) | Minimal push worker | In-app cues only |
|---|---|---|---|
| Fires on time | Yes, from the OS calendar alarm, even offline | Usually (cron to the minute; push delivery isn't guaranteed) | Only if the app is already open |
| iPhone | Yes (Safari "Add All"; one-time imports keep alarms) | Home Screen app only, iOS 16.4+ | Yes |
| Needs a server | No | Yes: a Worker, D1, a cron trigger, and VAPID keys | No |
| Data leaving the device | Plan text goes into the user's calendar, by their choice | Push subscription, plan times, time zone | Nothing |
| Cost | Free | Free tier is tight (10 ms CPU per cron run), so likely the $5/month Workers plan | Free |
| Build effort | Low | Medium (VAPID, cron, Safari's ban on silent pushes) | Lowest |
| Weak spots | Edits aren't picked up by re-importing; the alarm opens Calendar, not Arohexis | Breaks the "no backend, local-first" constraint | No reminder at all |

### Why
- Chrome has ended development of Notification Triggers, and Periodic Background Sync is Chromium-only and can't fire at a set time. No newer API for scheduled local notifications was found. So without a server, the only option that fires on time on an iPhone is the OS calendar.
- A push worker would break two v1 constraints, no backend and all data on the device, and likely needs a paid plan.

### Consequences
- Plans offer **Add to calendar**. The UI explains the one-time import and that edits are manual.
- The calendar event has **no deep link**. On iOS, links open Safari, whose storage is separate from the Home Screen app, so they would land on an empty copy. The description says "Open Arohexis from your Home Screen."
- Home shows the plan-due card while an occurrence is open, and the lapse repair on the next open after it closes.
- The Badging API is skipped (ADR-016): on iOS it needs notification permission and can't update at plan time without push.

### v1.1 path (not in v1)
- **What changes:** a push worker using Declarative Web Push. The payload carries a generic title ("Plan reminder") and a navigate URL, and the service worker fills in the plan text from IndexedDB, so the wording never leaves the device.
- **What is needed:**
  - its own ADR;
  - an explicit opt-in that lists what is sent (subscription, times, time zone);
  - a switch to `injectManifest`.

## 11. Design system

### 11.1 Direction
- **Calm, low-arousal, typography-led:**
  - one primary action per screen;
  - generous space;
  - restrained color, with a single accent reserved for the primary action and the "Started." moment.
- **Avoid** the generic dashboard look (cards in grids, KPI tiles, gradient charts) and gamification (confetti, badges, streak flames, points).
- **Visual direction gate.** Before any UI is built, two distinct visual directions for the stuck flow (Home, Feeling, Response, Started) are presented as private Artifacts. The owner picks one. Typefaces, palette and motion character are decided there and recorded in an ADR.

### 11.2 Tokens (`src/design/tokens.css`)
Two layers of CSS custom properties: primitives (`--ink-900`, `--paper-50`, `--size-5`, …) and semantic tokens (`--color-bg`, `--color-text`, `--color-accent`, `--color-focus`, `--space-stack-lg`, `--motion-calm`, …). Components use semantic tokens only.

- **Color:**
  - light and dark themes;
  - `:root` follows `prefers-color-scheme` unless `data-theme` is set from Settings;
  - text contrast is at least 4.5:1 (large text and UI at least 3:1), checked by a unit test that computes contrast for every semantic pair in both themes.
- **Type:** a fluid modular scale (`clamp()`), with at most two families (display and text), self-hosted. Body text is at least 17px on mobile. Tabular numbers are used for the timer and counts.
- **Space:** a 4-px base scale.
- **Radius:** a small set (`--radius-s`, `--radius-m`, `--radius-pill`).
- **Motion:**
  - `--motion-quick: 120ms`, `--motion-calm: 240ms`, `--motion-slow: 480ms`, with a single standard easing;
  - no motion is decorative or looping;
  - under `prefers-reduced-motion: reduce`, transforms are removed and only opacity fades of 120 ms or less remain.

### 11.3 Accessibility (WCAG 2.2 AA)
- **Targets:** touch targets are at least 48×48 CSS px, well above 2.5.8's 24 px minimum. Primary buttons span the full width on phones.
- **Focus:** a visible ring of at least 3:1 using `--color-focus`, never obscured by sticky UI (2.4.11).
- **Timer:** it is informational and never a time limit (2.2.1). The prominent Undo shows for 10 s, and the start can still be removed through "Remove this start" for as long as the Started screen is open.
- **Screen readers:** the timer announces sparingly. Every chart has a text equivalent. The lapse sheet traps and restores focus.
- **Zoom:** content reflows at 320 CSS px wide and at 200% zoom.
- **Language:** `lang="en-US"`; headings in order; landmarks.

## 12. Privacy and security
- **No network requests after load:** no analytics, no fonts or scripts from third parties, no error reporting service.
- **Headers** (Cloudflare `_headers`):
  - `Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`;
  - `Referrer-Policy: no-referrer`;
  - `Permissions-Policy` denying the camera, microphone, and geolocation;
  - `X-Content-Type-Options: nosniff`.
- **Caching:** `Cache-Control: no-cache` for `/`, `/index.html`, `/sw.js`, and the manifest. `public, max-age=31536000, immutable` for hashed assets.
- **SPA routing:** `not_found_handling: "single-page-application"`.
- **CSP compatibility:** the service-worker registration is emitted as a separate script file (`injectRegister: 'script'`), never inline. React sets inline styles through the CSSOM, which `style-src 'self'` allows.
- **Untrusted imports:** imported JSON is validated and never executed or rendered as HTML.
- **No personal data in the repo:** the repository never contains real user data; `.gitignore` excludes export files.

## 13. Testing strategy

### Layers

| Layer | Tool | Scope |
|---|---|---|
| Domain unit | Vitest (node) | Every module in `src/domain`; gate of at least 95% lines and at least 90% branches |
| Property | fast-check | the invariants below |
| Storage | Vitest + fake-indexeddb | Repositories, transactions (import rollback), seeding, migrations from fixture DBs |
| Copy and tokens | Vitest | Banned words, 40-word cap, contrast of every semantic color pair in both themes |
| E2E | Playwright | the projects and scenarios below |

**Property tests:**
- weekly starts add up to total starts;
- undone starts are never counted;
- the matcher covers all k responses in k picks;
- occurrences are correct across DST in `America/New_York`, `Europe/London`, `Australia/Lord_Howe`, and `Asia/Kathmandu`;
- export → import → export is identical;
- the demo generator is deterministic for a given seed;
- ICS output always parses and folds lines at 75 octets.

**E2E projects:** `iphone` (WebKit, iPhone preset), `android` (Chromium, Pixel preset), `desktop` (Chromium).

**E2E scenarios:**
1. Stuck flow: at most 3 taps from Home to the timer; no scroll at 375×667; reward visible; count increments.
2. Undo within 10 s removes the start from the count.
3. Task tag after the start appears in Insights.
4. Offline: load, `context.setOffline(true)`, reload, complete the stuck flow. The result is recorded and visible after going back online.
5. Persistence: data survives a reload and a new page in the same context.
6. Plans: create a plan, then use `page.clock` to move into the open window (due card, Start now, linked start) and past the grace period (lapse sheet, repair, plan updated).
7. Only one lapse prompt after several slipped occurrences.
8. Check-in due on the configured day; submitting it shows in the trend.
9. Export, delete everything, import, and the same Insights reappear.
10. Demo: enter, see 10 weeks, exit, and the main database is unchanged.
11. axe-core scan of every route in light and dark, with zero violations at AA.
12. Reduced-motion emulation: no transform animations.
13. Keyboard-only stuck flow on desktop (`S`, a number key, `Enter`).

### CI (GitHub Actions, every push and PR)
1. **`check`:** install, lint, typecheck (app and domain projects), unit, property, storage, and copy tests with the coverage gate, then build. It also checks the bundle against a budget of 150 kB gzip of initial JS.
2. **`e2e`:** Playwright on all three projects against `vite preview`. The report is uploaded as an artifact.
3. **`deploy`:**
   - on `main`, only after `check` and `e2e` pass: `wrangler deploy` (secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`);
   - on other branches: a preview version with a preview URL. The exact Wrangler command is verified while scaffolding and recorded in an ADR.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| iOS clears or separates data (Safari vs Home Screen) | Onboarding warning, `persist()`, a standalone check, "Last backup" plus a gentle check-in link, and a tested export/import |
| Calendar alarms don't match an edited plan | The UI explains the manual re-add; v1.1 push path |
| Starts are self-reported and could be inflated | Starts are meant for the user's own learning, not a score. Undo exists, and nothing is compared or shared |
| Small n makes "what helps" misleading | "Early days" note when n < 5; counts always shown next to rates |
| Shame creeps into copy over time | Banned-word test in CI; copy review in every UI PR |
| A lot of setup before anything is usable | Milestones each end in something usable, with the stuck flow first (in `docs/plan.md`, written after this spec is approved) |
| Library churn (React Router 8, vite-plugin-pwa 2, a pre-1.0 PWA core in the ecosystem) | Exact versions pinned; Dependabot weekly; E2E guards upgrades |

## 15. Out of scope for v1, by design

Push notifications (v1.1 candidate, §10), merging imports, multiple devices and sync, an accounts backend, AI features, localization (all copy is already in `src/copy/`, so it could be added later), task lists, completions, and blocking.

## 16. Brain space (proposed amendment)

Status: **proposed** on 2026-11-12, waiting for owner review. Decisions: ADR-021 to ADR-032 in [decisions.md](decisions.md). On approval, the changes in §16.12 are folded into the sections they name, and this status line goes.

Reference material: `docs/reference/brain-space/` (stills and a canvas prototype). Brain space matches the reference's look and behaviour. None of its code is reused.

### 16.1 What it is

Brain space is the main visual: a picture of your starts, drawn as a brain made of light on black. Every start leaves light in it. A plan you start on cue draws a line that gets brighter and thicker each step of the way.

- **It is a picture, not a scan.** The shape is a fixed drawing, the same for everyone, and nothing in it is measured from a body. Arohexis still makes no claim about brain change (§1, §3). About says so (§16.9).
- **It is cumulative only.** It never shows weeks, comparisons between weeks, streaks, goals or completions.
- **Dark by default.** A new user sees a field of dim points and faint traces with no outline. The shape comes only from where the points sit.

### 16.2 Concepts

| Term | Meaning |
|---|---|
| **Part** | A part of life the user names, such as "Portfolio". It has a colour from a fixed set and a fixed region of the drawing. Part replaces Task type (ADR-023) |
| **Region** | One of six fixed areas of the drawing. A seventh area, the **core**, holds light that has no part |
| **On-cue start** | A counted start linked to one of a plan's occurrences: **Start now** while the occurrence is open (§8.6), or **Yes, I started** in the lapse repair (§8.7) |
| **Plan line** | One line per plan, in the plan's part. Dashed while the plan has no on-cue start, then solid, growing in steps with on-cue starts |
| **Start line** | A faint line left in its part by any other counted start. It never grows |
| **Core spark** | A faint point near the core, left by a counted start that has no part |
| **Strength** | The step a plan line has reached, from its count of on-cue starts |
| **Moving / resting** | Moving while the newest counted start is at most 48 hours old; resting otherwise |

### 16.3 Parts

- **Limits:** at most 6 parts, one per region. Each part has a name (1 to 24 characters), a colour from the fixed set in §16.7, and `enabled`. Each colour belongs to at most one part.
- **Regions are fixed.** A part gets the lowest free region when it is created and keeps it for life. Renaming, recolouring or reordering never moves light.
- **Nothing is deleted.** Parts can be renamed, recoloured and disabled, never deleted. A disabled part leaves the "What is it?" row and the plan editor, and its light stays.
- **Defaults for a new user:** Work, Study, Health, Home, Money. Region 6 stays free for the user.
- **Existing data (Dexie version 1 to 2):** each existing task type becomes a part with the same id and label, taking regions and colours in `order`. Past `start.tagged` events keep their label snapshots and now name parts.
- **Tagging:** "What is it?" on Started (§8.4) lists the enabled parts. One optional tap tags the start, and the latest tag wins, as today (ADR-005). An untagged start still counts and leaves a core spark.
- **Plans (M3):** a plan has an optional part. An on-cue start lights its plan's line in the plan's current part, whatever the start is tagged.

### 16.4 Lines, strength and state

A pure projection in `src/domain/brainSpace.ts` decides which lines exist, and each one's part, strength and state. It reads only `Attempt[]` (§6.3), the plans, the parts and `now`.

**Rules:**
1. Every counted start (`isCountedStart`) leaves light. An undone start leaves none.
2. An on-cue start re-fires its plan's line and adds one to its `onCueStarts`.
3. Any other counted start leaves one start line in its part, or a core spark if it has no part. Its part is its tag, or else its plan's part (for a plan-linked start with no occurrence, such as **Two minutes now?** in §8.7).
4. Plan line strength comes from `onCueStarts`:

| On-cue starts | Strength | Label | Drawn as |
|---|---|---|---|
| 0 | waiting | Waiting | dashed pale line with a ring at its end |
| 1 to 4 | 1 | New | hairline |
| 5 to 14 | 2 | Repeated | thicker; signals travel it while moving |
| 15 to 39 | 3 | Steady | thicker, with a faint halo |
| 40 or more | 4 | Well-worn | thickest, with a halo and a white core |

   Start lines and core sparks are drawn fainter than strength 1 and never change.
5. **Nothing is ever removed.** Adding events never removes a line, lowers a strength, or moves a line to another fibre. A paused plan keeps its line. A paused plan with no on-cue start shows nothing.
6. **Moving and resting.** Brain space is moving when the newest counted start is at most 48 hours before `now`. Otherwise it is resting: signals stop and lit light dims by one fixed step, to 85% brightness. It never dims further, however long the rest lasts. One counted start makes it moving again. No copy describes resting as a loss.
7. **Waiting:** a plan line is waiting while the plan is active and has no on-cue start.

```ts
export const RESTING_AFTER_MS = 48 * 60 * 60 * 1000;
export const STRENGTH_STEPS = [1, 5, 15, 40] as const;   // on-cue starts needed for strengths 1–4
export type Strength = 'waiting' | 1 | 2 | 3 | 4;
export type BrainLine =
  | { kind: 'plan'; id: string /* planId */; partId: string | null; onCueStarts: number; strength: Strength; order: number }
  | { kind: 'start'; id: string /* attemptId */; partId: string | null /* null = core spark */; at: number; order: number };
export type PartLight = { partId: string | null; starts: number; planLines: number; startLines: number };
export type BrainSpace = { lines: BrainLine[]; parts: PartLight[]; motion: 'moving' | 'resting'; totalStarts: number };
export function strengthFor(onCueStarts: number): Strength;
export function projectBrainSpace(attempts: readonly Attempt[], plans: readonly Plan[], parts: readonly Part[], now: number): BrainSpace;
```

`order` places a line in time: its first on-cue start (or the plan's `createdAt` while waiting) for a plan line, and `start.at` for a start line. It drives the stable fibre assignment in §16.5.

### 16.5 Geometry

- **Generated locally from a seed.** `src/geometry/` builds the drawing from a fixed `BRAIN_SEED` with the same mulberry32 PRNG as the demo. Every device draws the same field. There is no network request, no shipped data file, and no real tractography or scan data (ADR-028).
- **The field:** about 670 fibres across the six regions and the core. Each fibre is a bundle of about 8 strands of 8 to 22 points, with a point at every strand end, about 6,000 points in all. The counts are named constants, checked by tests.
- **Shape from placement only:** two halves, a central core and a lower rear area. No outline, hull or border is ever drawn around the brain or a part.
- **Stable assignment:** `assignFibres(lines, field)` maps each line to a fibre in its region, taken in `order`, choosing by a hash of the line id and probing over free fibres. Adding a line never moves an existing one. When a region runs out of fibres, further start lines reuse that region's start-line fibres in order and add points along them, so light keeps building and nothing is removed.
- **Shade per line:** each line's colour is a slight shade of its part's colour, set by the line id: hue within ±8° and lightness within ±6 points, inside the bounds that §16.7 tests.
- **Pulling apart:** each region has a fixed direction it moves in when zooming pulls the parts apart.
- **No anatomy names anywhere:** not in copy, code, identifiers, tests or comments. Regions are `region-1` to `region-6` and `core`. A test bans a list of anatomy terms across `src/**` and `tests/**`.
- **Purity:** `src/geometry` has its own `tsconfig.json` (`lib: ["ES2024"]`, `types: []`) and the domain's ESLint bans. It may import types from `src/domain` and nothing else. Its coverage gate is lines ≥ 90%.

### 16.6 Rendering

- **UI only, loaded late.** The renderer lives in `src/app/brain/` and is a lazy chunk, imported after Home's first paint. The initial bundle stays at most 150 kB gzip. The chunk's own budget is set in ADR-029.
- **Draw order:** the dim field (points and faint traces) with normal blending, then light with additive blending so crossing lines add up, then waiting lines and rings.
- **Hairlines:** strength 1 is 0.6 CSS px, rising per §16.4. No outlines around strokes, no gradients on UI, no pastel.
- **Device pixel ratio** is capped at 2.
- **Render on demand:** the loop runs only while something moves: signals (moving and not Still), a burst, a reveal, a camera ease or a drag. Otherwise it draws once and stops. It pauses while the page is hidden.
- **Fallback:** if the renderer can't start (the chunk fails to load, or the graphics API is missing), the plate shows the text equivalent (§16.10) and every action still works.

### 16.7 Look and colour

**Plate tokens.** They are the same in both themes (ADR-026).

| Token | Value | Use |
|---|---|---|
| `--plate-bg` | `#05060A` | plate background |
| `--plate-dim-point` | `#8E98AC` | unlit points, alpha 0.05 to 0.5 by depth |
| `--plate-dim-trace` | `#7C8598` | unlit traces, alpha 0.04 to 0.2 by depth |
| `--plate-waiting` | `#EEF1F6` | waiting lines and their rings |
| `--plate-core` | `#9AA3B5` | core sparks |

**Part colours.** Six saturated hues, with no red and no pastel. They start from the reference: cyan `hsl(190 92% 62%)`, magenta `hsl(322 92% 66%)`, green `hsl(140 82% 58%)`, amber `hsl(38 95% 60%)` and violet `hsl(262 92% 72%)`. The sixth is chosen in the token task so that it passes the checks below.

**Checks** (unit tests on the token values):
- every part colour, at both ends of its shade range, is at least 4.5:1 against `--plate-bg`, so its labels pass as text and its lines pass 3:1;
- `--plate-waiting` is at least 3:1 against `--plate-bg`;
- every pair of part colours stays distinguishable under simulated protanopia, deuteranopia and tritanopia (CIEDE2000 ΔE of at least 15);
- colour is never the only cue: each part is named on its label, its chip, its card and in the text equivalent (WCAG 1.4.1).

**Part colours are data, not accents.** Chrome keeps ADR-018's single mono accent. Part colours appear only on the plate, as the swatch on a part's chip, and on its card heading. Insights stays neutral (§8.9).

**Labels** on the plate use Atkinson Hyperlegible Next at weight 600, at least type step −1, over a `--plate-bg` backing at 80% opacity.

### 16.8 Motion

§11.2 says no motion is decorative or looping. Brain space adds only motion that carries state or marks an event (ADR-027).

- **State motion:** while Brain space is moving, small signals travel along plan lines of strength 2 or more. They mean "you started in the last 48 hours". Resting stops them.
- **Event motion:**
  - **Burst:** when a start is counted, one short burst of light from the core, at most 1.8 s, once per start, with no flashing (WCAG 2.3.1);
  - **Reveal:** during the two-minute timer, the new light is drawn from the core out to its end. Progress comes from `timerState(start.at, now)`, so it stays right after the phone locks or the page reloads;
  - **Settle:** a small ring settles at the line's end when the reveal finishes.
- **Interaction motion:** the camera eases to a tapped part or a zoom step over `--motion-slow`.
- **Never:** auto-rotation, idle drift, looping decoration, or motion on chrome.
- **The light exists from the tap** (ADR-004). The reveal only animates it. Leaving Started early or tapping **Done for now** never leaves a partial line: Home always shows it whole.
- **Still:** a visible toggle on the plate, labelled **Still**, with `aria-pressed`, at least 48×48 px.
  - It stops state and event motion: signals stop, the burst becomes a fade, and new light appears whole.
  - Drag and zoom still work, and camera moves snap instead of easing.
  - The choice is stored in `kv.brainStill` and also appears in Settings → Preferences.
  - This meets WCAG 2.2.2 (Pause, Stop, Hide).
- **Reduced motion:** under `prefers-reduced-motion: reduce`, Brain space starts Still. Fades are opacity only and at most 120 ms. If the user turns Still off, their choice is kept.

### 16.9 Copy

All new copy lives in `src/copy/brain.ts` and passes `copy.test.ts`.

- **Summary line** under the plate: `"1 start · 1 line"` or `` `${starts} starts · ${lines} lines` ``. With no starts: `"Your starts will light up here."`
- **Strength labels:** Waiting, New, Repeated, Steady, Well-worn. Each is shown with its count, as in `"Steady · 18 starts on cue"`. The reference's "Automatic" is not used, because the weekly check-in is the measure of how automatic starting feels.
- **Motion sentence** in the text equivalent: `"Signals are moving."` or `"Signals are resting. One start sets them moving again."`
- **Controls:** `"Still"`, `"Zoom in"`, `"Zoom out"`, `"All"`.
- **Part card:**
  - the part name as its heading;
  - `` `${n} starts` ``;
  - its lines by strength, then `` `${n} start lines` ``;
  - from M3, each of its plans as a sentence, with **Start now** while an occurrence is open, and otherwise `"Next: 9:00 tomorrow"`;
  - one "What to focus on" line, linked to About.
- **About, new paragraph:** "Brain space draws your starts as lines of light in the shape of a brain. It's a picture of your starts, not a scan, and the shape is the same for everyone. Arohexis makes no claim that your brain changes. How automatic starting feels is what the weekly check-in measures."
- **Banned words** gain: rewire, rewires, rewired, neural, neuron, neurons, synapse. No copy uses "fire" or "firing" about the brain.

**What to focus on.** `focusFor(partState, now)` in `src/domain/focus.ts` is pure, and the first rule that matches wins. Each line ties to a row of §3.

| # | When | Line | §3 source |
|---|---|---|---|
| 1 | a plan in this part slipped in the last 7 days | "Go easy on the one that didn't happen. In one study, forgiving yourself was associated with less procrastination later." | Wohl et al. 2010 |
| 2 | a plan in this part is waiting | "Make the plan's first step small enough to do in two minutes." | Garg et al. 2025 |
| 3 | a plan in this part is at strength 2 or more | "Keep the same time and place. A stable cue may help; in one review, habits took about two months to form." | Singh et al. 2024 |
| 4 | this part has no plan (from M3) | "An if-then plan, with a set time, place and first step, may help these starts happen." | Gollwitzer & Sheeran 2006 |
| 5 | otherwise | "When you're stuck here, name the feeling, then pick a first step your hands can do." | Garg et al. 2025 |

Parts are named by the user, so no line gives advice about one kind of part. The reference's lines about studying and money are not used.

### 16.10 Placement and accessibility

**Home (§8.1)**, top to bottom: the plate, the parts row, the one card (if any), **I'm stuck** in the thumb zone, then the quiet links.
- The plate's height flexes to the space left: at least 200 px at 375×667 with a card showing. Home never scrolls at 375×667, **I'm stuck** stays where it is, and Stuck to timer stays at 3 taps.
- The renderer loads after **I'm stuck** is on screen. Until then the plate shows the summary line.
- **Parts row:** an **All** chip and one chip per part with its swatch, 48 px tall, scrolling sideways when they don't fit. A chip does what tapping its part on the plate does.
- **Tapping a part**, on the plate or its chip: the rest fades to about 15%, the camera eases to it, and its card opens as a sheet. The sheet traps focus, Esc closes it, and focus returns, like the lapse sheet.
- **Navigation:** drag turns. Pinch, the wheel, or the **+** and **−** buttons zoom from 0.8× to 3.2×. Zooming past about 1.1× pulls the regions apart and labels them. `touch-action: none` applies to the canvas only.

**Started (§8.4):**
- A compact plate, about 140 to 180 px tall, sits above "Started.". It shows the burst on arrival and the reveal during the timer.
- The reward keeps its single 240 ms settle. The burst stays on the plate.
- The screen still doesn't scroll at 375×667 with six parts in "What is it?". If the device can't fit it, the fallback is no plate on Started, with the burst and reveal playing on Home's plate instead (ADR-030).

**Accessibility:**
- **The canvas is never needed.** It is `aria-hidden="true"` and never focusable. Every action is a DOM control: part chips, zoom buttons, **Still** and the part card.
- **Text equivalent:** a list inside the plate's region (`role="region"`, `aria-label="Brain space"`), visually hidden except the summary line. It reads, for each part, "Portfolio: 23 starts. 2 plan lines: Steady, New. 9 start lines.", then "No part: 4 starts.", then the motion sentence. It follows the projection and is not announced live.
- **Targets and focus:** touch targets are at least 48×48 px. Controls on the plate use the dark theme's tokens, including its focus ring (ADR-026).
- **Keyboard:** Tab reaches the chips, zoom buttons and **Still**. Enter or Space activates, and Esc closes the card. `S` still opens the stuck flow.
- **WCAG:** 2.2.2 is met by **Still**. 2.3.1 is met by one burst and no flashing. 1.4.1 is met because colour is never alone.

### 16.11 Demo

The 10-week demo fills the brain:
- 5 named parts (Portfolio, Studies, Fitness, Money, Home) and 5 plans, one per part;
- about 80% of starts tagged with a part;
- on-cue starts follow §7.4's rate of about 85% of occurrences, so weekday plans reach Well-worn by week 10 and every region has light;
- the newest demo start is within 48 hours of `endDate`, so a fresh demo is moving.

Nothing is faked for the picture: it is the same projection over the generated events.

### 16.12 Changes to existing sections (folded in on approval)

| Section | Change |
|---|---|
| §1 | Add: "Brain space, the main visual, draws your starts as light in the shape of a brain. It's a picture, not a scan." |
| §2 | Add success criteria: Brain space turns without visible stutter on the owner's iPhone (manual check at each UI milestone, plus the WebKit frame-time guard); every Brain space action works with the renderer blocked (E2E) |
| §5.1 | Add a Renderer row (ADR-029) |
| §5.2 | Add `src/domain/brainSpace.ts`, `src/domain/focus.ts`, `src/geometry/` and `src/app/brain/`. Dependency rule: `app` may import `geometry`; `geometry` may import types from `domain` only |
| §6.1 | Task type becomes Part. Add the terms in §16.2 |
| §6.2 | `start.tagged.taskTypeId` now holds a part id. The field name is kept so old events and backups need no rewrite |
| §6.3 | `Attempt.taskType` becomes `Attempt.part` |
| §6.4 | `startsByTaskType` becomes `startsByPart`, with "No part" in place of "Untagged" |
| §7.1 | Version 2: a `parts` table (`id, order`; `{ id, label, order, enabled, colour, region }`) replaces `taskTypes`. `plans` gains `partId?` (M3). `kv` gains `brainStill` |
| §7.3 | Export `version: 2`, with `parts` in place of `taskTypes`. Version 1 files migrate on import |
| §7.4 | Demo per §16.11 |
| §8.1 | Home per §16.10 |
| §8.4 | Started per §16.10. "What is it?" lists parts |
| §8.5 | The plan editor gains an optional part (M3) |
| §8.9 | Section 4 becomes "Parts", including "No part". Charts stay neutral, with no part colours |
| §8.10 | Settings → Parts replaces task types in the list editor: rename, colour, enable, add up to six. Preferences gains Still. About gains the paragraph in §16.9 |
| §9.3 | Default parts (§16.3) replace the default task types |
| §9.5 | Add the banned words in §16.9 |
| §11.1 | The direction gate is complete (ADR-018). Brain space's gate is the owner's review of the built Home screen (ADR-021). Part colours are data, not accents |
| §11.2 | Motion per §16.8. Add the plate tokens |
| §11.3 | Add the text equivalent and Still |
| §12 | No change. The CSP stays exactly as written |
| §13 | Add the tests in §16.13 |
| §14 | Add the risks: frame rate on the iPhone; resting read as a loss; the picture read as a brain claim; Started too tight for the plate |

### 16.13 Tests

- **Domain properties:**
  - light adds up: on-cue starts plus start lines plus core sparks equal counted starts;
  - undone starts never leave light;
  - appending any event never removes a line, lowers a strength or changes an assigned fibre;
  - only on-cue starts change a plan line's strength;
  - moving exactly when the newest counted start is at most 48 hours before `now`.
- **Geometry:** the same seed gives the same field (checked by hash); counts stay within bounds; every region has fibres; assignment is stable when lines are appended; overflow reuses fibres and removes nothing.
- **Tokens:** the checks in §16.7.
- **Copy:** new copy passes; the anatomy-term ban across `src/**` and `tests/**`; the new banned words.
- **E2E**, WebKit iPhone first:
  - the stuck flow is still 3 taps with no scroll at 375×667, with the plate and a card showing;
  - Started doesn't scroll with six parts;
  - **Still** toggles, survives a reload, and stops the render loop (the plate's `data-motion` reads `still`);
  - reduced motion starts Still;
  - the text equivalent's counts match a known set of events;
  - a part chip opens the card with focus trapped, and Esc returns focus;
  - offline, the renderer chunk is precached and Brain space draws;
  - with the chunk blocked, every action still works;
  - zero CSP violations with the renderer running;
  - axe on Home and Started with the plate, in light and dark.
- **Performance guard:** on the WebKit iPhone preset, a Playwright check drags the plate for 5 s and fails if the p95 frame interval exceeds the budget in ADR-029. The owner checks the real iPhone at each UI milestone's acceptance.
- **Bundle:** initial JS stays at most 150 kB gzip; the Brain space chunk stays within its ADR-029 budget.
