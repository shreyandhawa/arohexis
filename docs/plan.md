# Arohexis implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **The checkboxes in this file are the progress ledger:** tick them as you go and commit the ticks with the work.

**Goal:** Ship Arohexis v1, a local-first PWA that trains the moment of starting, in five milestones that each end in something the owner can use on their iPhone.

**Architecture:**
- **Domain:** pure TypeScript in `src/domain` (events, projections, rules), with no DOM, React or Dexie.
- **Storage:** Dexie in `src/storage`, implementing ports that the domain defines.
- **UI:** a thin React layer in `src/app` that reads projections and dispatches domain commands.
- **Data:** behavior is an append-only event log; configuration is editable records.

**Tech Stack:**
- React 19.3, Vite 8.3, TypeScript 6.0 (strict), React Router 8 (declarative)
- vite-plugin-pwa 2.0, Dexie 4.4 + dexie-react-hooks 4.4, Valibot 1.5, date-fns 4.4 + @date-fns/tz 1.5
- Tests: Vitest 5.1, fast-check 4.10, fake-indexeddb 6.2, Playwright 1.65, @axe-core/playwright 4.14
- Hosting: Wrangler 4 (Cloudflare Workers Static Assets)

**Spec:** [docs/spec.md](spec.md). Decisions: [docs/decisions.md](decisions.md).

## How this plan is used

- **Milestone 1 is fully specified below.**
  - Milestones 2–5 list their scope, tasks and acceptance checks.
  - Each one is expanded to M1's level of detail at its start, in this file, and the owner gets a short summary and can redirect before its tasks begin.
- **One branch per milestone:** `m1-stuck-flow`, `m2-plans`, …
  - Small commits, each with its tests.
  - The branch gets a PR to `main` at the end of the milestone. CI and a preview URL must pass, the owner merges, and the merge deploys.
- **Session hygiene:**
  - At every task boundary, check context with `mcp__ccd_session_mgmt__get_usage`. At **40% or more**, hand off to a fresh session (`start_session`, context `fresh`, initiation `user_asked`).
  - The brief points at this file, the spec, the decision log and the current branch, and **repeats this 40% rule**.
  - Never hand off mid-task.
- **Commits and PRs:** no `Co-Authored-By` trailer or any other Claude attribution line in any commit or PR.

## Global Constraints

- Node 26 LTS (`.nvmrc`); npm; dependencies installed with `--save-exact`.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- `src/domain/**` compiles with `lib: ["ES2024"]`, `types: []`. ESLint bans `react*`, `dexie*` and relative imports that leave `src/domain/`. Allowed external imports: `valibot`, `date-fns`, `@date-fns/tz`.
- The domain never reads `Date.now()`, `crypto` or `Intl` time zones directly; it receives `Clock` and `IdGen`.
- All user-facing strings live in `src/copy/` (or `src/domain/defaults.ts` for default content). US English.
- Copy rules:
  - Banned whole words, case-insensitive: streak, fail, failed, failure, lazy, missed, miss, broke, broken, behind, wasted, should have, must, hurry.
  - No `!` in copy.
  - Response bodies are 40 words or fewer.
- Stuck flow: Home to running timer takes **at most 3 taps**, no typing, and no scrolling at **375×667**.
- Touch targets are at least **48×48 CSS px**. Text contrast is at least **4.5:1**, and UI/large text at least **3:1**, in both themes.
- Under `prefers-reduced-motion: reduce`, there are no transform animations, and opacity fades are 120 ms or less.
- Motion tokens: `--motion-quick: 120ms`, `--motion-calm: 240ms`, `--motion-slow: 480ms`.
- `TIMER_SECONDS = 120`, `UNDO_PROMINENT_MS = 10_000`, default `weekStartsOn = 1` (Monday), default `checkinDay = 0` (Sunday), default `graceMin = 90`.
- No network requests after load: no analytics and no third-party fonts or scripts.
- CSP (exact): `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`.
- The service-worker registration is a file (`injectRegister: 'script'`), never inline.
- Never compute or display completions, streaks, or comparisons between weeks.
- Coverage gate on `src/domain/**` (excluding `src/domain/testing/**`): lines ≥ 95%, branches ≥ 90%.
- Initial JS is at most **150 kB gzip**.

## Review Focus

| # | Input or condition | Expected behavior | Test owned by |
|---|---|---|---|
| 1 | The phone locks or the app is backgrounded during the 2-minute timer, then reopened minutes later | The timer shows "Two minutes done." straight away, with no negative or frozen countdown and no double `timer.closed` | Task 8 (`timerState`), Task 14 (E2E) |
| 2 | Double-tap or rapid repeated taps on **Start** | Exactly one `start.made`; the week count goes up by 1 | Task 10 (`appendForAttempt`), Task 13, Task 14 (E2E) |
| 3 | Reloading on the Started screen, or browser Back from Started | Same attempt and same single start after reload; Back goes Home, not to the Response | Task 14 (E2E) |
| 4 | A start near midnight at a week boundary, or made in a different time zone from the current one | It counts in the week of its own local time | Task 6 |
| 5 | IndexedDB unavailable or failing to open (blocked, quota, private mode) | A calm "Can't save on this device" screen, not a blank page or silently dropped starts | Task 10 (`openStorage`), Task 12 (E2E) |

---

## Milestone 1: The stuck button, on the iPhone

**You can:**
- install Arohexis from its public URL to your Home Screen;
- tap **I'm stuck**, name the feeling, read a matched response, tap **Start**, and get the reward, timer, Undo and task tag;
- do all of this offline;
- export a backup to Files.

CI runs on every push, `main` deploys to Cloudflare, and the README carries the evidence and the not-medical-advice note.

**Branch:** `m1-stuck-flow`. Before Task 1, run `git switch -c m1-stuck-flow` from `main`.

### Task 1: Visual directions gate (owner choice before any UI)

**Files:**
- Create: two private Artifacts (HTML), named `Arohexis direction A` and `Arohexis direction B`
- Modify: `docs/decisions.md` (append **ADR-018: Visual direction**)

**Interfaces:**
- Produces: ADR-018 recording the chosen typefaces (Fontsource package names and exact versions), palette primitives as hex for both themes, accent, focus color, type scale ratio, and motion character. Task 11 consumes it.

- [x] **Step 1:** Call `Artifact` with `action: "quickstart"` and `intent: "other"`, then load the `artifact-design` skill.
- [x] **Step 2:** Build Direction A and Direction B as static HTML. Each shows:
  - **Screens:** Home, Feeling, Response and Started (with the timer and task chips), at 375×667 and in a desktop frame, in both light and dark;
  - **Copy:** the real copy from spec §8–9 (`anxious.name` as the sample response);
  - **Motion:** a toggle that plays the "Started." moment with and without reduced motion.

  The two must differ in typeface pairing, palette temperature and layout rhythm, and both must stay calm and typography-led:
  - **Direction A:** working name "Paper", light-first, with an editorial serif for display.
  - **Direction B:** working name "Dusk", dark-first, with a grotesk and large tabular numerals.
- [x] **Step 3:** Publish both as private Artifacts and send the owner both links.
- [x] **Step 4:** **Owner step.** The owner picks one, or asks for a blend. Iterate until the owner says yes.
- [x] **Step 5:** Verify each chosen font's Fontsource package and version with `npm view @fontsource-variable/<family> version`. Write ADR-018 with exact hex values and confirm every semantic text/background pair is ≥ 4.5:1.
- [x] **Step 6:** Commit.

```bash
git add docs/decisions.md && git commit -m "docs: record the chosen visual direction (ADR-018)"
```

### Task 2: Scaffold and tooling

**Files:**
- Create: `package.json`, `.nvmrc` (`26`), `index.html`, `vite.config.ts`, `tsconfig.base.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/domain/tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `vitest.config.ts`, `src/main.tsx` (renders "Arohexis" placeholder), `src/domain/index.ts`, `tests/purity/purity.test.ts`, `tests/purity/fixture/uses-window.ts`, `tests/purity/fixture/tsconfig.json`
- Modify: `docs/decisions.md` (append **ADR-019: TypeScript version**)

**Interfaces:**
- Produces these npm scripts:
  - `dev`, `build` (`tsc -b && vite build`), `preview`
  - `lint` (`eslint .`), `format:check` (`prettier --check .`)
  - `typecheck` (`tsc -b --noEmit && tsc -p src/domain/tsconfig.json --noEmit`)
  - `test` (`vitest run`), `test:watch`, `e2e` (`playwright test`)

- [x] **Step 1:** Scaffold with `npm create vite@latest . -- --template react-ts`. Pin exact versions of `react@19.3.x`, `vite@8.3.x`, `@vitejs/plugin-react@6.3.x` and `typescript@6.0.x`. Install `vitest@5.1.x`, `fast-check@4.10.x`, `eslint@10.x`, `typescript-eslint@8.72.x` and `prettier` (latest 3.x, confirmed with `npm view prettier version`), all `--save-dev --save-exact`.
- [x] **Step 2:** Configure:
  - TypeScript compiler options per Global Constraints;
  - `vitest.config.ts`:
    - environment `node`;
    - `include: ['src/**/*.test.ts', 'tests/**/*.test.ts']`;
    - coverage on `src/domain/**`, excluding `src/domain/testing/**`, with thresholds `lines: 95, branches: 90`;
  - ESLint `no-restricted-imports` for `src/domain/**`, with one pattern group per concern:
    - `{ group: ['react', 'react/*', 'react-*', 'dexie', 'dexie-*'], message: 'The domain stays free of UI and storage libraries.' }`;
    - `{ group: ['../storage*', '../app*', '../copy*', '../design*', '../../*'], message: 'The domain may not import outside src/domain.' }`.

    `../X` from the domain root and `../../X` from `src/domain/testing` are the only ways out of the folder.
- [x] **Step 3:** Write the failing purity tests in `tests/purity/purity.test.ts`:

```ts
it('domain tsconfig rejects DOM globals', () => {
  const r = spawnSync('npx', ['tsc', '-p', 'tests/purity/fixture/tsconfig.json', '--noEmit'], { encoding: 'utf8' });
  expect(r.status).not.toBe(0);
  expect(r.stdout).toContain("Cannot find name 'window'");
});
it('eslint rejects react imports inside domain', async () => {
  const [res] = await new ESLint().lintText("import React from 'react';\nexport const x = React;\n", { filePath: 'src/domain/x.ts' });
  expect(res!.messages.map(m => m.ruleId)).toContain('no-restricted-imports');
});
it('eslint rejects storage imports inside domain', async () => {
  const [res] = await new ESLint().lintText("import { openStorage } from '../storage/open';\nexport const o = openStorage;\n", { filePath: 'src/domain/x.ts' });
  expect(res!.messages.map(m => m.ruleId)).toContain('no-restricted-imports');
});
```

  `uses-window.ts` contains `export const href = window.location.href;`. The fixture `tsconfig.json` extends `../../../src/domain/tsconfig.json` and includes only `uses-window.ts`.
- [x] **Step 4:** Run `npm test`. Expected: all three tests PASS. Then temporarily set `lib` to include `"DOM"` in the domain tsconfig, confirm the first test FAILS, and revert.
- [x] **Step 5:** Evaluate TypeScript 7.
  - Check: `npm view typescript-eslint peerDependencies` and the vite-plugin-pwa/Vite docs.
  - Rule: switch only if both support TypeScript 7.
  - Record: write the outcome as ADR-019.
- [x] **Step 6:** Run `npm run lint && npm run typecheck && npm run format:check && npm run build`. Expected: all exit 0.
- [x] **Step 7:** Commit.

```bash
git add -A && git commit -m "chore: scaffold Vite React TypeScript app with a pure domain boundary"
```

### Task 3: GitHub repo and CI check job

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/dependabot.yml`, `scripts/check-bundle-size.mjs`

**Interfaces:**
- Produces: a CI job `check` that later tasks extend. Task 12 adds the `e2e` job, and Task 17 adds `deploy`.

- [x] **Step 1: Owner step.** Ask: "Create a public GitHub repo `shreyandhawa/arohexis` and push `main` and `m1-stuck-flow`?" Proceed only on a yes. Then run:

```bash
gh repo create shreyandhawa/arohexis --public --source . --remote origin
git push -u origin main m1-stuck-flow
```

- [x] **Step 2:** Write `scripts/check-bundle-size.mjs`:
  - read `dist/index.html` and collect `<script type="module" src>` and `<link rel="modulepreload">` files;
  - gzip each and sum the sizes;
  - print the total;
  - exit 1 if the total is over `150 * 1024`.
- [x] **Step 3:** Write the `check` job in `ci.yml`.
  - **Triggers:** `push` and `pull_request`.
  - **Steps:** `actions/setup-node` with `node-version-file: .nvmrc` and npm cache, then `npm ci`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test -- --coverage`, `npm run build`, `node scripts/check-bundle-size.mjs`.

  `dependabot.yml`: weekly updates for `npm` and `github-actions`.
- [x] **Step 4:** Push the branch. Run `gh run watch` (or `gh run list --branch m1-stuck-flow`). Expected: `check` succeeds.
- [x] **Step 5:** Commit and push.

```bash
git add .github scripts && git commit -m "ci: run lint, typecheck, tests, build and bundle budget on every push"
```

### Task 4: Domain events, config types, ports, test fixtures

**Files:**
- Create: `src/domain/events.ts`, `src/domain/config.ts`, `src/domain/ports.ts`, `src/domain/testing/fixtures.ts`, `src/domain/events.test.ts`

**Interfaces:**
- Produces:

```ts
// events.ts
export const EVENT_SCHEMA_VERSION = 1;
export type Basis = 'name-the-feeling' | 'shrink-the-step' | 'self-kindness' | 'reframe' | 'pair-a-reward';
// One exported type per event in spec §6.2, each = { id: string; type: '<name>'; at: number; tz: string; v: 1 } & payload:
// AttemptOpened, FeelingNamed, ResponseShown, StartMade, StartUndone, StartTagged,
// TimerClosed, AttemptDismissed, OccurrenceResolved, LapseRepaired, CheckinSubmitted
export type AppEvent = AttemptOpened | FeelingNamed | /* … all 11 */ CheckinSubmitted;
export type EventType = AppEvent['type'];
export type EventOf<T extends EventType> = Extract<AppEvent, { type: T }>;
export type PayloadOf<T extends EventType> = Omit<EventOf<T>, 'id' | 'type' | 'at' | 'tz' | 'v'>;
export type EventDeps = { clock: Clock; ids: IdGen };
export function createEvent<T extends EventType>(deps: EventDeps, type: T, payload: PayloadOf<T>): EventOf<T>;

// config.ts
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Feeling = { id: string; label: string; order: number; enabled: boolean; builtIn: boolean };
export type FeelingResponse = { id: string; feelingId: string; body: string; basis: Basis; enabled: boolean; order: number; builtIn: boolean };
export type ListItem = { id: string; label: string; order: number; enabled: boolean };   // task types and obstacles
export type Plan = { id: string; place: string; cueDetail?: string; firstAction: string; time: string; days: WeekDay[]; graceMin: number; active: boolean; createdAt: number; editCount: number };
export type Settings = { theme: 'system' | 'light' | 'dark'; weekStartsOn: WeekDay; checkinDay: WeekDay; checkinDismissedWeek?: string; lastExportAt?: number; persistRequested: boolean; onboarded: boolean };
export const DEFAULT_SETTINGS: Settings; // { theme: 'system', weekStartsOn: 1, checkinDay: 0, persistRequested: false, onboarded: false }
export type Config = { feelings: Feeling[]; responses: FeelingResponse[]; taskTypes: ListItem[]; obstacles: ListItem[]; plans: Plan[]; settings: Settings };
export type ConfigPatch = { settings?: Partial<Settings> }; // extended in M2 and M5

// ports.ts
export interface Clock { now(): number; timeZone(): string }
export interface IdGen { next(): string }
export interface EventStore {
  append(events: readonly AppEvent[]): Promise<void>;
  list(range?: { from?: number; to?: number }): Promise<AppEvent[]>;
  listByAttempt(attemptId: string): Promise<AppEvent[]>;
  listByType<T extends EventType>(type: T): Promise<EventOf<T>[]>;
  /** Reads the attempt's events and appends decide()'s result in one read-write transaction. decide must be synchronous. */
  appendForAttempt(attemptId: string, decide: (attemptEvents: AppEvent[]) => AppEvent[]): Promise<AppEvent[]>;
}
export interface ConfigStore { getConfig(): Promise<Config>; applyConfigPatch(patch: ConfigPatch): Promise<void> }

// testing/fixtures.ts
export type TestClock = Clock & { set(at: number): void; advance(ms: number): void; setTimeZone(tz: string): void };
export function testDeps(opts?: { at?: number; tz?: string }): { clock: TestClock; ids: IdGen };
// defaults: at = Date.UTC(2026, 10, 16, 14, 0) (Mon 09:00 New York), tz = 'America/New_York'; ids 'id-1', 'id-2', …
```

- [x] **Step 1:** Write the failing tests in `events.test.ts`:
  - `createEvent stamps id, time, zone and version`: `testDeps()` then `createEvent(d, 'start.made', { attemptId: 'a1', backfilled: false })` equals `{ id: 'id-1', type: 'start.made', at: Date.UTC(2026,10,16,14,0), tz: 'America/New_York', v: 1, attemptId: 'a1', backfilled: false }`.
  - `ids are sequential and clock is injectable`: the second event has `id: 'id-2'`, and after `clock.advance(1000)`, `at` is 1000 ms later.
- [x] **Step 2:** Run `npx vitest run src/domain/events.test.ts`. Expected: FAIL (module not found).
- [x] **Step 3:** Implement the files above.
- [x] **Step 4:** Run the same command. Expected: PASS. Then run `npm run typecheck`. Expected: exit 0.
- [x] **Step 5:** Commit.

```bash
git commit -am "feat(domain): add event types, config types, ports and test fixtures"
```

### Task 5: Attempts projection

**Files:**
- Create: `src/domain/attempts.ts`, `src/domain/attempts.test.ts`, `src/domain/testing/arbitraries.ts`

**Interfaces:**
- Consumes: `AppEvent`, `Basis` (Task 4).
- Produces:

```ts
export type Attempt = { id: string; openedAt: number; tz: string; source: 'stuck' | 'plan'; planId?: string; occurrence?: string;
  feeling?: { id: string; label: string }; response?: { id: string; basis: Basis };
  start?: { at: number; tz: string; backfilled: boolean }; undone: boolean;
  taskType?: { id: string; label: string }; timer?: { elapsedSec: number; outcome: 'kept-going' | 'stopped' }; dismissed: boolean };
export function foldAttempts(events: readonly AppEvent[]): Attempt[];      // ordered by openedAt ascending
export function findAttempt(events: readonly AppEvent[], attemptId: string): Attempt | undefined;
export function isCountedStart(a: Attempt): boolean;                        // a.start !== undefined && !a.undone
// arbitraries.ts
export function arbAttemptEvents(): fc.Arbitrary<AppEvent[]>;               // valid per-attempt sequences, mixed attempts, random undo/tag/close
```

`start.tz` is the `start.made` event's `tz`; Task 6 uses it.

- [x] **Step 1:** Write the failing tests:
  - `folds a full stuck flow into one attempt`:
    - **Input events:** opened (stuck), `feeling.named(anxious, 'Anxious')`, `response.shown(anxious.name, name-the-feeling)`, `start.made`, `start.tagged(writing, 'Writing')`, `timer.closed(kept-going, 120)`.
    - **Expected attempt:** exactly those fields, with `undone: false`, `dismissed: false`, and `isCountedStart` true.
  - `undone start is not counted`.
  - `latest tag wins`: two `start.tagged` events, and the second label is kept.
  - `a second start.made keeps the first start time` (Review Focus #2).
  - `attempt with no start and no dismissal is abandoned`: `isCountedStart` is false and `dismissed` is false.
  - `orders attempts by openedAt`.
  - **Property** `counted starts equal attempts with a start.made and no start.undone`: over `arbAttemptEvents()`, `foldAttempts(evts).filter(isCountedStart).length` equals the count computed independently from raw events.
- [x] **Step 2:** Run `npx vitest run src/domain/attempts.test.ts`. Expected: FAIL.
- [x] **Step 3:** Implement `foldAttempts` (a single pass grouped by `attemptId`), `findAttempt` and `isCountedStart`.
- [x] **Step 4:** Run it again. Expected: PASS.
- [x] **Step 5:** Commit: `feat(domain): fold events into attempts`.

### Task 6: Weeks, local time, and the weekly start count

**Files:**
- Create: `src/domain/week.ts`, `src/domain/week.test.ts`, `src/domain/metrics.ts`, `src/domain/metrics.test.ts`

**Interfaces:**
- Consumes: `Attempt`, `isCountedStart` (Task 5); `WeekDay` (Task 4).
- Produces:

```ts
export function localDate(at: number, tz: string): string;                       // 'YYYY-MM-DD'
export function localHour(at: number, tz: string): number;                        // 0–23
export function weekKey(at: number, tz: string, weekStartsOn: WeekDay): string;  // local date of that week's first day
export function startsThisWeek(attempts: readonly Attempt[], now: number, tz: string, weekStartsOn: WeekDay): number;
// a start counts when weekKey(start.at, start.tz, w) === weekKey(now, tz, w)
```

- [x] **Step 1:** Write the failing tests:
  - `weekKey uses Monday by default`:
    - `weekKey(Date.UTC(2026,10,16,4,59), 'America/New_York', 1)` is `'2026-11-09'` (Sunday 23:59);
    - `weekKey(Date.UTC(2026,10,16,5,1), 'America/New_York', 1)` is `'2026-11-16'`.
  - `weekKey honors a Sunday start`: `weekKey(Date.UTC(2026,10,15,15,0), 'America/New_York', 0)` is `'2026-11-15'`.
  - `localHour is right on both sides of the DST change`: `localHour(Date.UTC(2026,10,1,5,30), 'America/New_York')` and `localHour(Date.UTC(2026,10,1,6,30), 'America/New_York')` are both `1`.
  - `localDate in a +5:45 zone`: `localDate(Date.UTC(2026,10,15,22,0), 'Asia/Kathmandu')` is `'2026-11-16'`.
  - `startsThisWeek uses each start's own zone` (Review Focus #4). Take a counted start at `Date.UTC(2026,10,15,22,0)` and `now = Date.UTC(2026,10,16,15,0)` in `'America/New_York'`:
    - if the start's `tz` is `'Asia/Kathmandu'`, the result is `1`;
    - if the start's `tz` is `'America/New_York'`, the result is `0`.
  - `startsThisWeek ignores undone and abandoned attempts`.
- [x] **Step 2:** Run `npx vitest run src/domain/week.test.ts src/domain/metrics.test.ts`. Expected: FAIL.
- [x] **Step 3:** Implement using `TZDate` from `@date-fns/tz` with `format` and `startOfWeek` from `date-fns`. Install both with `--save-exact`.
- [x] **Step 4:** Run it again. Expected: PASS.
- [x] **Step 5:** Commit: `feat(domain): add timezone-aware weeks and the weekly start count`.

### Task 7: Default content, matcher, copy rules

**Files:**
- Create: `src/domain/defaults.ts`, `src/domain/matcher.ts`, `src/domain/matcher.test.ts`, `src/copy/rules.ts`, `src/copy/copy.test.ts`

**Interfaces:**
- Consumes: `Feeling`, `FeelingResponse`, `ListItem`, `Basis`, `ResponseShown`.
- Produces:

```ts
// defaults.ts: content exactly as spec §9 (ids, labels, bodies, bases)
export const OTHER_FEELING_ID = 'other';            // label 'Something else', order 99, always last, cannot be disabled
export const GENERIC_RESPONSE_ID = 'generic.any';   // feelingId 'other'
export const DEFAULT_FEELINGS: readonly Feeling[];          // anxious, bored, overwhelmed, unsure, perfectionistic (order 1–5), other (99)
export const DEFAULT_RESPONSES: readonly FeelingResponse[]; // the 16 rows of spec §9.2, order 1–3 within each feeling
export const DEFAULT_TASK_TYPES: readonly ListItem[];       // writing, study, admin ('Admin & email'), chores, creative, other-task ('Other')
export const DEFAULT_OBSTACLES: readonly ListItem[];        // timing, energy ('Low energy'), too-big, came-up, forgot (labels per spec §9.4)
export const BASIS_SOURCES: Readonly<Record<Basis, string>>; // per spec §9.2 table
// matcher.ts
export function pickResponse(feelingId: string, responses: readonly FeelingResponse[], shown: readonly ResponseShown[]): FeelingResponse;
// rules.ts
export const BANNED_WORDS: readonly string[];        // Global Constraints list
export function wordCount(text: string): number;
export function checkCopy(text: string): string[];   // human-readable violations; [] when clean
```

- [x] **Step 1:** Write the failing matcher tests:
  - `shows a never-shown response first, lowest order`: anxious with no history gives `anxious.name`.
  - `shows the least recently shown`: after `name@t1` and `shrink@t2`, the pick is `anxious.kind`. After `name@t1`, `shrink@t2` and `kind@t3`, the pick is `anxious.name`.
  - `skips disabled responses`.
  - `falls back to generic.any when a feeling has none enabled`.
  - `other always gets generic.any`.
  - **Property** `k consecutive picks show each enabled response once`: for any subset of enabled anxious responses (k ≥ 1), simulating k picks, each appended to history, yields k distinct ids.
- [x] **Step 2:** Write the failing copy tests in `copy.test.ts`:
  - `checkCopy flags banned words and exclamation marks`:
    - `checkCopy('Your streak is broken!')` has length 3;
    - `checkCopy('Permission granted')` is `[]` (whole words only).
  - `default content passes copy rules`: every label and body in `defaults.ts` gives `[]`, and every response satisfies `wordCount(body) <= 40`.
  - `all copy modules pass copy rules`: load `import.meta.glob('./*.ts', { eager: true })` (excluding `rules.ts` and tests), collect every string value recursively, and expect `[]` for each.
  - `ships the spec's defaults`: 6 feelings, 16 responses, 3 per default feeling, `generic.any` present.
- [x] **Step 3:** Run `npx vitest run src/domain/matcher.test.ts src/copy`. Expected: FAIL.
- [x] **Step 4:** Implement. Copy the bodies verbatim from spec §9.2.
- [x] **Step 5:** Run it again. Expected: PASS.
- [x] **Step 6:** Commit: `feat(domain): add default content, response matcher and copy rules`.

### Task 8: Stuck-flow commands and timer rules

**Files:**
- Create: `src/domain/commands.ts`, `src/domain/commands.test.ts`, `src/domain/timer.ts`, `src/domain/timer.test.ts`

**Interfaces:**
- Consumes: `createEvent`, `EventDeps` (Task 4); `findAttempt`, `isCountedStart` (Task 5); `pickResponse` (Task 7).
- Produces. Every command is pure and returns the events to append, and returns `[]` when it would be a no-op:

```ts
export function openAttempt(deps: EventDeps, input: { source: 'stuck' } | { source: 'plan'; planId: string; occurrence: string }): AttemptOpened;
export function nameFeeling(deps: EventDeps, attemptEvents: readonly AppEvent[], attemptId: string, feeling: Feeling,
  responses: readonly FeelingResponse[], shown: readonly ResponseShown[]): AppEvent[];  // [feeling.named, response.shown]; [] if already named
export function makeStart(deps: EventDeps, attemptEvents: readonly AppEvent[], attemptId: string,
  link?: { planId: string; occurrence: string; backfilled: boolean }): AppEvent[];      // [] if a counted start exists or attempt dismissed
export function undoStart(deps: EventDeps, attemptEvents: readonly AppEvent[], attemptId: string): AppEvent[];   // [] unless counted start
export function tagStart(deps: EventDeps, attemptEvents: readonly AppEvent[], attemptId: string, taskType: ListItem): AppEvent[]; // [] unless counted start
export function closeTimer(deps: EventDeps, attemptEvents: readonly AppEvent[], attemptId: string, outcome: 'kept-going' | 'stopped'): AppEvent[];
  // elapsedSec = floor((now - start.at)/1000); [] if already closed or no counted start
export function dismissAttempt(deps: EventDeps, attemptEvents: readonly AppEvent[], attemptId: string): AppEvent[]; // [] if started or dismissed
// timer.ts
export const TIMER_SECONDS = 120;
export const UNDO_PROMINENT_MS = 10_000;
export function timerState(startAt: number, now: number): { elapsedSec: number; remainingSec: number; done: boolean };
export function isUndoProminent(startAt: number, now: number): boolean;
```

- [x] **Step 1:** Write the failing tests:
  - `nameFeeling snapshots the label and the matcher's pick`.
  - `nameFeeling is a no-op the second time`.
  - `makeStart is idempotent`: applying its output, then calling it again, gives `[]` (Review Focus #2).
  - `makeStart links a plan occurrence`.
  - `undoStart only undoes a counted start`.
  - `tagStart snapshots the label and needs a counted start`.
  - `closeTimer records elapsed seconds once`.
  - `dismissAttempt refuses after a start`.
  - `timerState`:
    - 30 s after start gives `{ elapsedSec: 30, remainingSec: 90, done: false }`;
    - at 120 s, `done: true, remainingSec: 0`;
    - 10 minutes later (phone locked), `{ remainingSec: 0, done: true }`, never negative (Review Focus #1).
  - `isUndoProminent`: true at 9 999 ms, false at 10 000 ms.
- [x] **Step 2:** Run `npx vitest run src/domain/commands.test.ts src/domain/timer.test.ts`. Expected: FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Run it again. Expected: PASS. Then run `npm test -- --coverage`. Expected: the domain thresholds are met.
- [x] **Step 5:** Commit: `feat(domain): add stuck-flow commands and timer rules`.

### Task 9: Export format (backup)

**Files:**
- Create: `src/domain/exportFormat.ts`, `src/domain/exportFormat.test.ts`

**Interfaces:**
- Consumes: `Config` pieces, `AppEvent`, `localDate`.
- Produces:

```ts
export const EXPORT_FORMAT = 'arohexis-export';
export const EXPORT_VERSION = 1;
export type ExportData = Config & { events: AppEvent[] };
export type ExportFile = { format: typeof EXPORT_FORMAT; version: number; exportedAt: string; app: { name: 'Arohexis'; build: string }; data: ExportData };
export function buildExport(data: ExportData, meta: { exportedAt: string; build: string }): ExportFile;
export type ParseResult = { ok: true; file: ExportFile } | { ok: false; message: string };
export function parseExport(input: unknown): ParseResult;     // Valibot schema; never throws
export function exportFileName(at: number, tz: string): string; // 'arohexis-export-YYYY-MM-DD.json'
```

- [x] **Step 1:** Write the failing tests:
  - `parseExport accepts what buildExport produces`.
  - `rejects a newer version`: the message is `'This backup is from a newer version of Arohexis. Update the app, then try again.'`
  - `rejects a file that is not an Arohexis backup`: the message is `"This file isn't an Arohexis backup."`
  - `rejects malformed events without throwing`.
  - `exportFileName uses the local date`: `exportFileName(Date.UTC(2026,10,12,2,0), 'America/New_York')` is `'arohexis-export-2026-11-11.json'`.
  - **Property** `parse(build(data)) round-trips`: over arbitrary configs plus `arbAttemptEvents()`, the result deep-equals the input data.
- [x] **Step 2:** Run `npx vitest run src/domain/exportFormat.test.ts`. Expected: FAIL.
- [x] **Step 3:** Implement with `valibot` (installed `--save-exact`), using `v.variant('type', [...])` for events.
- [x] **Step 4:** Run it again. Expected: PASS.
- [x] **Step 5:** Commit: `feat(domain): add the backup export format with validation`.

### Task 10: Storage (Dexie)

**Files:**
- Create: `src/storage/db.ts`, `src/storage/open.ts`, `src/storage/seed.ts`, `src/storage/eventStore.ts`, `src/storage/configStore.ts`, `src/storage/exportData.ts`, `src/storage/storage.test.ts`

**Interfaces:**
- Consumes: ports, defaults, `ExportData`.
- Produces:

```ts
export class ArohexisDB extends Dexie { /* version(1).stores(...) exactly as spec §7.1 */ }
export type DbName = 'arohexis' | 'arohexis-demo' | `test-${string}`;
export class StorageUnavailableError extends Error {}
export function openStorage(name: DbName): Promise<{ ok: true; db: ArohexisDB } | { ok: false; error: StorageUnavailableError }>; // opens and seeds
export function seedDefaults(db: ArohexisDB): Promise<void>;          // idempotent via kv 'seeded'
export function createEventStore(db: ArohexisDB): EventStore;
export function createConfigStore(db: ArohexisDB): ConfigStore;      // settings = DEFAULT_SETTINGS merged with one kv row per key
export function readExportData(db: ArohexisDB): Promise<ExportData>;
```

- [x] **Step 1:** Write the failing tests with `import 'fake-indexeddb/auto'` and a fresh `test-${crypto.randomUUID()}` database per test:
  - `seeds defaults once`: calling `seedDefaults` twice leaves 6 feelings and 16 responses.
  - `append is all-or-nothing`: a batch whose second event has a duplicate id writes 0 events and rejects.
  - `listByAttempt returns events in time order`.
  - `appendForAttempt serializes concurrent starts` (Review Focus #2): `Promise.all` of two `appendForAttempt('a1', evts => makeStart(deps, evts, 'a1'))` writes exactly one `start.made`.
  - `getConfig merges stored settings over defaults`.
  - `readExportData returns every table`.
  - `openStorage reports unavailable storage` (Review Focus #5): when `indexedDB.open` is stubbed to throw, the result is `{ ok: false }` with a `StorageUnavailableError`.
- [x] **Step 2:** Run `npx vitest run src/storage`. Expected: FAIL.
- [x] **Step 3:** Implement, installing `dexie`, `dexie-react-hooks` and the dev dependency `fake-indexeddb`, all `--save-exact`. `appendForAttempt` uses `db.transaction('rw', db.events, …)` and runs `decide` synchronously inside it.
- [x] **Step 4:** Run it again. Expected: PASS.
- [x] **Step 5:** Commit: `feat(storage): add Dexie schema, seeding and repositories`.

### Task 11: Design tokens

**Files:**
- Create: `src/design/tokens.css`, `src/design/global.css`, `src/design/fonts.ts`, `src/design/contrast.ts`, `src/design/tokens.test.ts`

**Interfaces:**
- Consumes: ADR-018 (Task 1).
- Produces:
  - **Semantic custom properties**, the only ones components may use: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-on-accent`, `--color-focus`, `--color-border`, `--font-display`, `--font-text`, `--step--1`…`--step-5` (fluid type scale), `--space-1`…`--space-10` (4-px base), `--radius-s`, `--radius-m`, `--radius-pill`, `--motion-quick`, `--motion-calm`, `--motion-slow`, `--ease-standard`, `--target-min: 48px`.
  - **Theme blocks:**
    - `:root` holds light values;
    - `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` holds dark values;
    - `:root[data-theme="dark"] { … }` holds the same dark values.
  - `contrastRatio(hexA: string, hexB: string): number` in `contrast.ts`.

- [x] **Step 1:** Write the failing tests in `tokens.test.ts`, reading `tokens.css` via `?raw`:
  - `contrastRatio matches WCAG`: `contrastRatio('#000000', '#ffffff')` is 21 to two decimals.
  - `text pairs meet 4.5:1 in both themes`: `[text, bg]`, `[text, surface]`, `[text-muted, bg]`, `[on-accent, accent]`.
  - `UI pairs meet 3:1 in both themes`: `[focus, bg]`, `[accent, bg]`, `[border, bg]`.
  - `the media-query dark block equals the data-theme dark block`.
  - `reduced motion zeroes transforms`: `global.css` contains a `prefers-reduced-motion: reduce` block that sets `--motion-calm` and `--motion-slow` to `0ms` and disables transforms.
- [x] **Step 2:** Run `npx vitest run src/design`. Expected: FAIL.
- [x] **Step 3:** Implement with ADR-018's values. Install the Fontsource packages `--save-exact` and import them in `fonts.ts`. Set body text to at least 17 px on mobile and use `font-variant-numeric: tabular-nums` for `.numeric`.
- [x] **Step 4:** Run it again. Expected: PASS.
- [x] **Step 5:** Commit: `feat(design): add design tokens, themes and contrast tests`.

### Task 12: App shell, data provider, Home, About, Playwright

**Files:**
- Create:
  - `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/data/runtime.ts`, `src/app/data/DataProvider.tsx`
  - `src/app/hooks/useConfig.ts`, `src/app/hooks/useStartsThisWeek.ts`, `src/app/hooks/useNow.ts`
  - `src/app/layout/Shell.tsx` (+ `.module.css`), `src/app/layout/StuckButton.tsx`, `src/app/components/Button.tsx` (+ `.module.css`)
  - `src/app/screens/Home.tsx`, `src/app/screens/About.tsx`, `src/app/screens/Settings.tsx`, `src/app/screens/StorageError.tsx`
  - `src/copy/common.ts`, `src/copy/home.ts`, `src/copy/about.ts`
  - `playwright.config.ts`, `tests/e2e/helpers.ts`, `tests/e2e/home.spec.ts`
- Modify: `src/main.tsx`, `.github/workflows/ci.yml` (add the `e2e` job)

**Interfaces:**
- Consumes: `openStorage`, stores, `startsThisWeek`, tokens.
- Produces:

```ts
export const browserClock: Clock;   // Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone
export const browserIds: IdGen;     // crypto.randomUUID()
export type AppDeps = { events: EventStore; config: ConfigStore; clock: Clock; ids: IdGen; db: ArohexisDB; persist: () => Promise<boolean> };
export function DataProvider(props: { children: ReactNode }): JSX.Element; // opens 'arohexis'; on failure renders <StorageError/>
export function useData(): AppDeps;
export function useConfig(): Config | undefined;
export function useStartsThisWeek(): number;
export function useNow(intervalMs: number): number;
```

- **Routes in M1:** `/`, `/stuck`, `/stuck/:attemptId`, `/started/:attemptId`, `/settings`, `/settings/data`, `/about`.
- **Exact copy** (`home.ts`): `stuckButton: "I'm stuck"`, `startsThisWeek(n)` returning `"1 start this week"` or `` `${n} starts this week` ``, nav labels `Plans` (hidden until M2), `Insights` (hidden until M3), `Settings`.
- **`about.ts`:** the not-medical-advice note verbatim from spec §3, plus the evidence list from spec §3.
- **`StorageError` copy:** title `"Can't save on this device"`, body `"Arohexis keeps your data in this browser's storage, and it isn't available right now. Private browsing or low storage can cause this. Your data isn't being recorded."`

- [x] **Step 1:** Install `react-router@8.5.x` and the dev dependencies `@playwright/test@1.65.x` and `@axe-core/playwright@4.14.x`, all `--save-exact`. Then run `npx playwright install chromium webkit`.
- [x] **Step 2:** Configure Playwright:
  - **Projects:** `iphone` (`devices['iPhone 15']`), `android` (`devices['Pixel 7']`), `desktop` (`devices['Desktop Chrome']`).
  - **`webServer`:** `npm run build && npm run preview -- --port 4173 --strictPort`, with `baseURL` `http://localhost:4173`.
  - **`helpers.ts`:**
    - `expectAccessible(page)` runs an axe scan with WCAG 2.2 AA tags and asserts zero violations;
    - `setTheme(page, 'light' | 'dark')` uses `page.emulateMedia({ colorScheme })`.
- [x] **Step 3:** Write the failing E2E tests in `home.spec.ts`:
  - `home shows one large stuck button`: the button's role and name are `I'm stuck`, and its bounding box is at least 48×48.
  - `S opens the stuck flow` (desktop project only): pressing `s` lands on `/stuck`.
  - `S is ignored while typing`: an input on `/settings` (a placeholder field is fine) keeps the URL unchanged.
  - `about shows the not-medical-advice note`.
  - `home and about are accessible in light and dark`.
  - `storage failure shows a calm message` (Review Focus #5): use `page.addInitScript` to delete `window.indexedDB`, then expect the heading `Can't save on this device`.
- [x] **Step 4:** Run `npx playwright test tests/e2e/home.spec.ts`. Expected: FAIL.
- [x] **Step 5:** Implement:
  - the shell: a single column at most `34rem` wide, the primary action in the bottom thumb zone, and a persistent `StuckButton` everywhere except `/stuck*` and `/started*`;
  - the global `s` key handler, skipped when `event.target` is an input, textarea, select or contenteditable;
  - the data provider, hooks and screens;
  - `Settings`, a list with links to `Data` and `About`.
- [x] **Step 6:** Run it again. Expected: PASS on all three projects.
- [x] **Step 7:** Add the `e2e` job to `ci.yml`:
  - `needs: check`;
  - run `npx playwright install --with-deps chromium webkit` and `npx playwright test`;
  - upload `playwright-report/` when the job fails.

  Push and confirm both jobs pass with `gh run watch`.
- [x] **Step 8:** Commit: `feat(app): add app shell, data provider, home and about`.

### Task 13: Stuck-flow actions

**Files:**
- Create: `src/app/actions/stuck.ts`, `src/app/actions/stuck.test.ts`

**Interfaces:**
- Consumes: `AppDeps` (Task 12); the commands (Task 8); `EventStore.appendForAttempt`, `listByType` (Task 10).
- Produces:

```ts
export function beginStuck(d: AppDeps): Promise<string>;                                  // appends attempt.opened, returns attemptId
export function chooseFeeling(d: AppDeps, attemptId: string, feelingId: string): Promise<void>;
export function start(d: AppDeps, attemptId: string): Promise<void>;                       // after the first counted start ever, requests persistence once
export function undo(d: AppDeps, attemptId: string): Promise<void>;
export function tag(d: AppDeps, attemptId: string, taskTypeId: string): Promise<void>;
export function finishTimer(d: AppDeps, attemptId: string, outcome: 'kept-going' | 'stopped'): Promise<void>;
export function notNow(d: AppDeps, attemptId: string): Promise<void>;
```

- [x] **Step 1:** Write the failing tests against a real `openStorage('test-…')` with fake-indexeddb, `testDeps()` and a `persist` spy:
  - `full flow records one counted start`.
  - `double start counts once` (Review Focus #2): `Promise.all([start(d,id), start(d,id)])` leaves `startsThisWeek` at 1.
  - `requests persistent storage once`: two separate attempts, each started, call `persist` once and set `settings.persistRequested` to true.
  - `chooseFeeling uses rotation across attempts`: three anxious attempts get `anxious.name`, `anxious.shrink`, `anxious.kind`.
  - `notNow after start does nothing`.
- [x] **Step 2:** Run `npx vitest run src/app/actions`. Expected: FAIL.
- [x] **Step 3:** Implement. Each action is: read inputs, then `appendForAttempt(attemptId, evts => command(...))`.
- [x] **Step 4:** Run it again. Expected: PASS.
- [x] **Step 5:** Commit: `feat(app): wire stuck-flow actions to storage`.

### Task 14: Stuck-flow screens

**Files:**
- Create: `src/app/screens/Feeling.tsx`, `src/app/screens/ResponseScreen.tsx`, `src/app/screens/Started.tsx` (each with `.module.css`), `src/app/components/Chip.tsx`, `src/app/hooks/useAttempt.ts`, `src/copy/stuck.ts`, `tests/e2e/stuck-flow.spec.ts`

**Interfaces:**
- Consumes: the actions (Task 13), `timerState` and `isUndoProminent` (Task 8), `useNow`, `useStartsThisWeek`.
- Produces: `useAttempt(attemptId: string): Attempt | null | undefined`. `undefined` means loading and `null` means not found.
- **Exact copy** (`stuck.ts`, from spec §8.2–8.4):
  - Feeling heading: `"What's in the way?"`.
  - Response: `"First step: say it out loud."`, `"Start"`, `"Not now"`, and the not-now line `"That's fine. The button's here when you need it."`
  - Started: `"Started."`, `"That's the hard part."`, `"Undo"`, `"Remove this start"`, `"Start removed."`, `"What is it?"`.
  - Timer end: `"Two minutes done."`, `"Keep going"`, `"Done for now"`, `"Either is good."`.
  - Screen reader announcements: `"One minute left."` and `"Two minutes done."`.
- **Navigation rules:**
  - Moves between flow steps use `navigate(to, { replace: true })`, so Back from Started returns Home.
  - `/stuck/:id` with a counted start redirects to `/started/:id`.
  - `/started/:id` without a counted start redirects to `/`.
  - Opening `/stuck` calls `beginStuck` once per mount.

- [x] **Step 1:** Write the failing E2E tests in `stuck-flow.spec.ts`:
  - `reaches the timer in three taps without scrolling`:
    - setup: `test.use({ viewport: { width: 375, height: 667 } })`;
    - taps: `I'm stuck`, then `Anxious`, then `Start`;
    - on each screen, `scrollHeight <= innerHeight`;
    - the timer text `2:00` or `1:5x` is visible.
  - `rewards immediately and counts the start`: `Started.` and `1 start this week` are visible.
  - `undo removes the start`: tap `Undo` within 10 s, then Home shows no week count.
  - `remove this start after ten seconds`: `page.clock.install()`, then `fastForward('00:11')`, then `Remove this start` is visible and `Undo` is not.
  - `tags the task`: tapping `Writing` sets `aria-pressed=true`, and tapping `Study` moves the pressed state.
  - `timer end offers two equal choices`: `fastForward('02:00')`, then `Keep going` and `Done for now` are visible.
  - `returning after the phone locks shows two minutes done` (Review Focus #1): `fastForward('10:00')`, dispatch `visibilitychange`, then expect `Two minutes done.` and no negative time.
  - `double tap on Start counts once` (Review Focus #2): `dblclick` on Start, then `1 start this week`.
  - `reload keeps one start and Back goes Home` (Review Focus #3).
  - `keyboard-only flow` (desktop project only): `s`, then `1`, then `Enter`, ends at Started.
  - `reduced motion has no transforms`: with `emulateMedia({ reducedMotion: 'reduce' })`, no `getAnimations()` keyframe on the reward element contains `transform`.
  - `stuck screens are accessible in light and dark`.
- [x] **Step 2:** Run `npx playwright test tests/e2e/stuck-flow.spec.ts`. Expected: FAIL.
- [x] **Step 3:** Implement the screens:
  - number keys `1`–`9` pick a feeling and `Enter` triggers the primary action;
  - Start is disabled after the first tap;
  - the timer reads `timerState(start.at, useNow(250))` and announces through `aria-live="polite"` only at 60 s remaining and at 0;
  - the reward motion uses `--motion-calm`.
- [x] **Step 4:** Run it again. Expected: PASS on all projects.
- [x] **Step 5:** Commit: `feat(app): add the stuck flow screens with reward, timer, undo and tags`.

### Task 15: PWA, offline, persistence, iOS install note

**Files:**
- Create: `src/app/platform.ts`, `src/app/platform.test.ts`, `src/app/components/UpdateCard.tsx`, `pwa-assets.config.ts`, `public/icon.svg`, `tests/e2e/offline.spec.ts`, `tests/e2e/manifest.spec.ts`
- Modify: `vite.config.ts`, `src/app/screens/Home.tsx`, `src/copy/home.ts`

**Interfaces:**
- Produces:

```ts
export function isIosSafariNonStandalone(env: { userAgent: string; maxTouchPoints: number; standalone: boolean | undefined; displayModeStandalone: boolean }): boolean;
```

- **Copy:**
  - `home.ts installNote`: `"For the best experience, add Arohexis to your Home Screen: tap Share, then Add to Home Screen. Safari and the Home Screen app keep separate data."`
  - `updateReady`: `"A new version is ready."`, with the action `"Reload"`.
- **Manifest:** `name` and `short_name` `"Arohexis"`, `start_url` and `scope` `"/"`, `display: "standalone"`, `background_color` and `theme_color` from ADR-018, icons at 192, 512 and 512 maskable, plus `apple-touch-icon` 180.

- [x] **Step 1:** Write the failing tests:
  - `platform.test.ts`, three cases:
    - an iPhone Safari user agent with standalone false gives true;
    - with standalone true, it gives false;
    - an Android Chrome user agent gives false.
  - `manifest.spec.ts` (desktop project only): `page.request.get('/manifest.webmanifest')` against the preview server, then assert the fields above. It runs as an E2E test because the manifest exists only after the build.
  - `offline.spec.ts` (Chromium projects; skip `iphone`):
    - `works offline after first load`: load `/`, wait for `navigator.serviceWorker.ready`, `context.setOffline(true)`, reload, complete the stuck flow, and expect `1 start this week`.
    - `data survives reload and a new page`.
- [x] **Step 2:** Run `npx vitest run src/app/platform.test.ts && npx playwright test tests/e2e/offline.spec.ts`. Expected: FAIL.
- [x] **Step 3:** Implement:
  - install `vite-plugin-pwa@2.0.x` and `@vite-pwa/assets-generator`, `--save-exact`;
  - configure `registerType: 'prompt'`, `injectRegister: 'script'`, `strategies: 'generateSW'`, with `workbox.navigateFallback: '/index.html'`;
  - `UpdateCard` uses `useRegisterSW` from `virtual:pwa-register/react` and is hidden while the path starts with `/stuck` or `/started`;
  - the `installNote` card appears on Home only when `isIosSafariNonStandalone` is true;
  - the icon is drawn from ADR-018's palette.
- [x] **Step 4:** Run `npx vitest run src/app/platform.test.ts && npx playwright test tests/e2e/offline.spec.ts tests/e2e/manifest.spec.ts`. Expected: PASS.
- [x] **Step 5:** Commit: `feat(pwa): make Arohexis installable and offline-first`.

### Task 16: Backup export screen

**Files:**
- Create: `src/app/actions/backup.ts`, `src/app/screens/SettingsData.tsx`, `src/copy/data.ts`, `tests/e2e/export.spec.ts`

**Interfaces:**
- Consumes: `readExportData` (Task 10); `buildExport` and `exportFileName` (Task 9).
- Produces:

```ts
export function exportBackup(d: AppDeps, share: { canShareFiles: boolean; share(file: File): Promise<void>; download(file: File): void }): Promise<void>;
// sets settings.lastExportAt
```

- **Copy** (`data.ts`):
  - `"Back up your data"`;
  - `"Export backup"`;
  - `"Your data lives only on this device. Save a backup to Files now and then."`;
  - `lastBackup(days)`: `"Last backup: today"`, `"Last backup: 1 day ago"`, `` `Last backup: ${n} days ago` ``, or `"No backup yet"`.

- [x] **Step 1:** Write the failing tests in `export.spec.ts` (Chromium projects):
  - `exports a valid backup`: tap `Export backup`, catch `page.waitForEvent('download')`, check the file name matches `/^arohexis-export-\d{4}-\d{2}-\d{2}\.json$/`, and confirm `parseExport(JSON.parse(contents)).ok === true` with one counted start present after a stuck flow.
  - `shows last backup today`.
  - `data screen is accessible`.
- [x] **Step 2:** Run `npx playwright test tests/e2e/export.spec.ts`. Expected: FAIL.
- [x] **Step 3:** Implement:
  - use `navigator.canShare?.({ files: [file] })` to choose `navigator.share({ files })` (iOS → Files), otherwise download through an object URL;
  - `build` is `import.meta.env.VITE_BUILD_SHA ?? 'dev'`, and CI sets `VITE_BUILD_SHA=${{ github.sha }}`.
- [x] **Step 4:** Run it again. Expected: PASS.
- [x] **Step 5:** Commit: `feat(app): add backup export`.

### Task 17: Deploy to Cloudflare

**Files:**
- Create: `wrangler.jsonc`, `public/_headers`, `tests/config/headers.test.ts`
- Modify: `.github/workflows/ci.yml` (add `deploy` and `preview` jobs), `docs/decisions.md` (append **ADR-020: Preview deploys**)

**Interfaces:**
- `wrangler.jsonc`:

```jsonc
{ "name": "arohexis", "compatibility_date": "2026-11-01",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" } }
```

- `public/_headers`:
  - `/*`: the CSP from Global Constraints, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Content-Type-Options: nosniff`;
  - `/`, `/index.html`, `/sw.js`, `/manifest.webmanifest`: `Cache-Control: no-cache`;
  - `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`.

- [x] **Step 1:** Write the failing tests in `tests/config/headers.test.ts`:
  - parse `public/_headers` into a path-to-headers map;
  - assert the exact CSP string on `/*`;
  - assert `no-cache` on all four paths;
  - assert `immutable` on `/assets/*`.
- [x] **Step 2:** Run `npx vitest run tests/config/headers.test.ts`. Expected: FAIL. Then implement both files. Expected: PASS.
- [x] **Step 3: Owner step.**
  - create or sign in to a free Cloudflare account;
  - create an API token from the "Edit Cloudflare Workers" template;
  - add the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

  Offer the `wizard` skill to walk through this.
- [x] **Step 4:** Check the current Wrangler docs for the preview-URL command (expected: `wrangler versions upload --preview-alias <branch>`) and record it in ADR-020. Then add the CI jobs:
  - **`deploy`:** on `push` to `main`, `needs: [check, e2e]`, run `npx wrangler deploy`;
  - **`preview`:** on pull requests, run the verified preview command and post the URL in the job summary.
- [x] **Step 5:** Push, open a PR from `m1-stuck-flow`, and confirm the preview URL loads. Run `curl -sI <preview-url> | grep -i content-security-policy` and expect the exact CSP.
- [x] **Step 6:** Commit: `ci: deploy to Cloudflare Workers with branch previews`.

### Task 18: README, acceptance, review, merge

**Files:**
- Create: `README.md`

- [x] **Step 1:** Write `README.md`:
  - what Arohexis is and isn't (spec §1);
  - "Why it works", taken from spec §3: the claims, citations, caveats and the correction note;
  - the not-medical-advice note verbatim;
  - privacy (all data stays on the device, no analytics);
  - a demo note ("coming in M4");
  - architecture in 5 lines with a link to `docs/spec.md`;
  - dev setup and scripts;
  - links to `docs/decisions.md` and `docs/plan.md`.

  Then add a test `README prose passes copy rules` to `src/copy/copy.test.ts`. It reads `README.md`, drops fenced code blocks and every line containing `http` or `doi:`, and checks the rest with `checkCopy`. Run `npx vitest run src/copy`. Expected: PASS.
- [x] **Step 2:** Request a whole-branch review with `superpowers:requesting-code-review` (or the `pr-review-toolkit:code-reviewer` agent) against spec §5–8 and this milestone. Fix the findings and commit.
- [ ] **Step 3: Owner acceptance on iPhone** (preview URL):
  - add to Home Screen;
  - airplane mode, then stuck flow, timing it at under 30 s;
  - Undo, then tag;
  - export the backup to Files;
  - VoiceOver: the stuck flow is operable.

  Record the results in the PR description.
- [ ] **Step 4: Owner step.** Merge the PR. Confirm the `deploy` job succeeds and the production URL serves the app with the CSP header.
- [ ] **Step 5:** Tick M1 in the ledger below and commit: `docs: mark milestone 1 done`.

---

## Milestone 2: If-then plans and reminders

**You can:** create plans ("If it's 9:00 on weekdays at my desk, then I will open the essay doc"), add each to Apple Calendar with an alarm, tap **Start now** when a plan is due, and get a short forgive-and-replan sheet when a plan slips.

**Branch:** `m2-plans`. **Spec:** §6.4 (plan occurrences, lapse), §8.5–8.7, §10.

**Tasks** (expanded at milestone start):
1. `plans.ts`: `occurrencesBetween`, `occurrenceStatus` (ordered rules), `planSentence`. DST property tests in America/New_York, Europe/London, Australia/Lord_Howe and Asia/Kathmandu; nonexistent times move forward and ambiguous times take the first instance.
2. `ics.ts`: `planToIcs` with VTIMEZONE generated from offset transitions over 3 years, RRULE, VALARM, UID and SEQUENCE, CRLF, and folding at 75 octets. Tests parse the output with `ical.js` and check the alarm stays at 09:00 local across a DST change.
3. `lapse.ts`: `findLapseToRepair` (one prompt, older ones expired, 7-day window) and `applyRepair`, plus the plan commands (`startFromPlan`, `resolveOccurrence`, `repairLapse`).
4. Storage: plan CRUD through `ConfigPatch` (add, update with `editCount++`, pause).
5. Plans list and editor screens, with the live sentence preview and Add to calendar (one-time import help text).
6. Home plan-due card (Start now, "I'm stuck on this") and the lapse repair sheet (focus trap, every step skippable, closing records `slipped`).
7. E2E: spec §13 scenarios 6 and 7, plus axe on the new screens.

**Acceptance (owner):** a weekday plan imported on the iPhone fires its alarm. Start now counts as a linked start. A deliberately skipped plan shows one repair sheet on the next open.

## Milestone 3: Insights and the weekly check-in

**You can:** see starts per week, when you start, which feelings and task types lead to starts, which responses help, and your weekly "how automatic does starting feel" trend.

**Branch:** `m3-insights`. **Spec:** §6.4 (metrics, check-in), §8.8–8.9.

**Tasks:**
1. Metrics: `startsByWeek` (contiguous, zero weeks included), `startsByFeeling` (with "From a plan"), `startsByHour`, `startsByTaskType` (with "Untagged") and `responseStats` (`earlyDays` when n < 5). Property tests: the weekly sum equals total starts, and undone starts are never counted.
2. `checkin.ts`: SRBAI items, the period and `weekOf` rules, `isCheckinDue`, scoring and trend.
3. SVG chart components (columns, hour strip, bars, line), each with a visually hidden table and a one-sentence summary.
4. Insights screen with an empty state for fewer than 3 starts and neutral colors.
5. Check-in screen and Home card (7-point radio groups, Skip this week, attribution).
6. E2E: spec §13 scenarios 3 and 8, plus axe.

**Acceptance (owner):** the first Sunday check-in shows in the trend. Insights match a hand count of a week's starts.

## Milestone 4: Demo mode, restore and onboarding

**You can:** let anyone explore Arohexis with 10 realistic weeks of demo data, restore your own data from a backup, and onboard new users, including the iPhone install guidance.

**Branch:** `m4-demo-data`. **Spec:** §7.3–7.5, §8.10 (Data), §8.11.

**Tasks:**
1. `demo.ts`: `generateDemoData(seed, endDate, tz)` using mulberry32. Tests: deterministic for a seed, 10 weeks, and the shape bands from spec §7.4.
2. Demo database switching (`localStorage['arohexis:db']`), the Demo ribbon with Exit and Reset, and isolation from the main database.
3. Import:
   - parse and migrate;
   - a preview of counts;
   - an offer to export first;
   - a replace inside one transaction that rolls back on failure.
4. Delete everything, the storage persistence status, and a "Back up now" link on the check-in card after 14 days.
5. Onboarding at `/welcome`: 3 steps, with the iOS step shown only in Safari outside standalone mode, then Start fresh or Explore the demo.
6. E2E: spec §13 scenarios 9 and 10, plus axe.

**Acceptance (owner):** export, delete, import on the iPhone brings back the same Insights. A friend opening the public URL can explore the demo without being able to touch real data.

## Milestone 5: Your configuration, About, v1.0

**You can:** edit feelings, responses, task types and obstacles; set the theme, week start and check-in day; and read the evidence inside the app. v1.0 meets every success criterion in spec §2.

**Branch:** `m5-config-v1`. **Spec:** §2, §8.10, §11.

**Tasks:**
1. Feelings and responses editor:
   - rename, reorder, enable, add;
   - a live word count capped at 40;
   - a basis picker;
   - built-in items can't be deleted, and `other` can't be disabled.
2. Task types and obstacles list editor.
3. Preferences: theme (`data-theme`), `weekStartsOn`, `checkinDay`.
4. About: the full evidence table, basis sources and SRBAI attribution, the version, and the build SHA.
5. Accessibility pass:
   - VoiceOver on iPhone;
   - keyboard-only on desktop;
   - 320 px reflow;
   - 200% zoom;
   - fix the findings.
6. Release:
   - README final;
   - case-study notes drawn from `decisions.md`;
   - tag `v1.0.0`.

**Acceptance (owner):** every row of the spec §2 success-criteria table is checked and recorded in the v1.0 PR.

---

## Ledger

- [ ] M1: The stuck button, on the iPhone
- [ ] M2: If-then plans and reminders
- [ ] M3: Insights and the weekly check-in
- [ ] M4: Demo mode, restore and onboarding
- [ ] M5: Your configuration, About, v1.0
