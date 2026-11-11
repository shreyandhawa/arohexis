# Arohexis: design spec

Status: **draft for review**. Date: 2026-11-11. Decision log: [decisions.md](decisions.md).

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
