# Arohexis implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **The checkboxes in this file are the progress ledger:** tick them as you go and commit the ticks with the work.

**Goal:** Ship Arohexis v1, a local-first PWA that trains the moment of starting, in six milestones that each end in something the owner can use on their iPhone. (Five until the Brain space amendment, approved on 2026-11-12: spec §16, ADR-021 to ADR-034.)

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
  - Milestones 2–6 list their scope, tasks and acceptance checks.
  - Each one is expanded to M1's level of detail at its start, in this file, and the owner gets a short summary and can redirect before its tasks begin.
- **One branch per milestone:** `m1-stuck-flow`, `m2-brain-space`, `m3-plans`, …
  - Small commits, each with its tests.
  - The branch gets a PR to `main` at the end of the milestone. CI and a preview URL must pass, the owner merges, and the merge deploys.
- **Session hygiene:**
  - At every task boundary, check context with `mcp__ccd_session_mgmt__get_usage`. At **40% or more**, hand off to a fresh session (`start_session`, context `fresh`, initiation `user_asked`).
  - The brief points at this file, the spec, the decision log and the current branch, and **repeats this 40% rule**.
  - Never hand off mid-task.
- **Commits and PRs:** no `Co-Authored-By` trailer or any other Claude attribution line in any commit or PR.
- **Working rules** (owner brief, 2026-11-12):
  - **The lead talks to the owner.** The lead session is the only agent that does. It owns decisions, this ledger, branches, commits and merges, and never delegates an approval gate.
  - **Subagents do the work.** They handle exploration, research, implementation, review and test runs. Each gets a self-contained brief: the goal, the files it may touch, the constraints that apply (quoted), the acceptance checks, and what to return. Returns are under 200 words, plus paths and command output, never file dumps.
  - **Building and reviewing are separate.** A different subagent builds and reviews, and the reviewer hasn't seen the work being written. Two subagents writing in parallel use separate worktrees.
  - **State is written to `docs/` at every task boundary:** ticks in this file, decisions in `decisions.md`. A fresh session resumes from these files alone. The SDD scratch files in `.superpowers/` are git-ignored, and they are not the record.
  - **Design skills are advisory.** Use frontend-design and impeccable's guidance when designing screens (ADR-031). End each UI milestone (M2 to M6) with an unslop audit against the running preview. None of them overrides the spec's tokens, the accessibility rules, the CSP, the copy rules or the approved Brain space look.

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
- **From M2** (spec §16, approved 2026-11-12):
  - **Banned words** gain rewire, rewires, rewired, rewiring, neural, neuron, neurons, synapse, synapses, plasticity, neuroplasticity, fire, fired and firing. The anatomy list in `tests/purity/anatomy.ts` is banned across `src/**` and `tests/**`.
  - **One motion exception:** Brain space's signals, which stop with Still, while resting, and under reduced motion unless the user turned Still off.
  - **Purity:** `src/geometry/**` follows the domain's purity rules and may import `src/domain` only.
  - **Budget:** the lazy Brain space chunk is at most **30 kB gzip**. The CSP is unchanged.

## Review Focus

| # | Input or condition | Expected behavior | Test owned by |
|---|---|---|---|
| 1 | The phone locks or the app is backgrounded during the 2-minute timer, then reopened minutes later | The timer shows "Two minutes done." straight away, with no negative or frozen countdown and no double `timer.closed` | Task 8 (`timerState`), Task 14 (E2E) |
| 2 | Double-tap or rapid repeated taps on **Start** | Exactly one `start.made`; the week count goes up by 1 | Task 10 (`appendForAttempt`), Task 13, Task 14 (E2E) |
| 3 | Reloading on the Started screen, or browser Back from Started | Same attempt and same single start after reload; Back goes Home, not to the Response | Task 14 (E2E) |
| 4 | A start near midnight at a week boundary, or made in a different time zone from the current one | It counts in the week of its own local time | Task 6 |
| 5 | IndexedDB unavailable or failing to open (blocked, quota, private mode) | A calm "Can't save on this device" screen, not a blank page or silently dropped starts | Task 10 (`openStorage`), Task 12 (E2E) |
| 6 | Undo or re-tag during the reveal on Started | Undo removes only that start's light. A re-tag moves only that light, and the reveal carries on to the new place. No other light moves | M2 Task 4 (properties), Task 10 (E2E) |
| 7 | The phone locks or the page reloads mid-reveal | The reveal resumes at the right progress, and Home shows the light whole | M2 Task 8, Task 10 |
| 8 | The renderer chunk fails to load (blocked, or offline on a first visit) | The plate shows the text equivalent, and **I'm stuck** and every Brain space action still work | M2 Task 10 |
| 9 | 375×667 with the tallest card and the Demo ribbon | Home doesn't scroll and the plate is at least 200 px. Started doesn't scroll with six parts | M2 Task 7B, Task 8, Task 10 |
| 10 | An M1 database opens in M2, with starts tagged Writing, Other and nothing, and one undone | Every counted start still counts. Writing starts light the Writing part, Other and untagged become core sparks, and nothing is lost | M2 Task 3 (`migrate.test.ts`) |
| 11 | The phone rotates or the window resizes while Brain space is on screen | The canvas fits its box at a pixel ratio of at most 2, keeps the camera and the selection, and never stretches | M2 Task 7A |
| 12 | Rapid repeated taps on Zoom in or Turn | Zoom stays within `ZOOM_MIN`–`ZOOM_MAX` and each tap is one step | M2 Task 7A (`camera.test.ts`) |
| 13 | A 24-character part name at 320 px wide | Chips, the card and the text equivalent wrap or truncate with no sideways page scroll | M2 Task 9 |
| 14 | A part is disabled while it has light | Its light, its Home chip and its card stay. It leaves "What is it?" | M2 Task 9, Task 7B |

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
- [x] **Step 3: Owner acceptance on iPhone** (preview URL):
  - add to Home Screen;
  - airplane mode, then stuck flow, timing it at under 30 s;
  - Undo, then tag;
  - export the backup to Files;
  - VoiceOver: the stuck flow is operable.

  Record the results in the PR description.
- [x] **Step 4: Owner step.** Merge the PR. Confirm the `deploy` job succeeds and the production URL serves the app with the CSP header.
- [x] **Step 5:** Tick M1 in the ledger below and commit: `docs: mark milestone 1 done`.

---

## Milestone 2: Brain space

> **Approved** by the owner on 2026-11-12, with spec §16 and ADR-021 to ADR-034. **Expanded** and approved on 2026-11-12. The choices this expansion makes where §16 is open are in ADR-035.

**You can:**
- see your starts as light in Brain space on Home: every start since M1, in the part you tagged it with;
- tap Start and watch the burst, then your new line drawn during the timer;
- name your parts and pick their colours;
- turn and zoom the brain, tap a part to open its card, and stop all motion with **Still**.

Everything works without the canvas, and offline.

**Branch:** `m2-brain-space`, PR shreyandhawa/arohexis#2, rebased onto `main` once M1 merged. **Spec:** §16. **Decisions:** ADR-021 to ADR-035.

**How M2 runs** (in addition to "How this plan is used"):
- **Agents:** builders and reviewers are the project subagents from Task 1 (ADR-032). Each task names its builder. The reviewer is always `code-reviewer`, and screens also go to `design-critic`. A builder leaves its work uncommitted; the lead commits after review.
- **Tests stay with the builder:** each builder writes the tests its task names, test first, even when they sit outside its ADR-032 scope (ADR-035).
- **Order:** 1 → 3 → (4 ∥ 5 ∥ 6) → (7A ∥ 7B) → 7C (owner gate) → 8 → 9 → 10 → 11. Task 2 runs any time before 7A. Parallel tasks use separate worktrees, merged by the lead. Tasks 3, 4 and 6 don't need the reference; Tasks 5 and 7 do.
- **The gate**, which every task passes before its commit: `npm run lint && npm run format:check && npm run typecheck && npm test -- --coverage && npm run build && node scripts/check-bundle-size.mjs` exit 0, plus the E2E specs the task names, on all three projects unless a test says otherwise.
- **Push** after each reviewed task.

**Files** (new unless marked):

```
src/domain/config.ts        (mod) Part, ColourId, RegionId; Config.parts; Settings.brainStill; Plan.partId
src/domain/parts.ts         migrateTaskTypes, addPart, editPart, validateParts
src/domain/attempts.ts      (mod) Attempt.part and Attempt.tags
src/domain/brainSpace.ts    the projection (§16.4)
src/domain/focus.ts         focusFor, recentLapses (§16.9)
src/domain/random.ts        mulberry32, hash32
src/geometry/               field.ts, assign.ts, shade.ts, tsconfig.json: pure, seeded
src/storage/db.ts           (mod) Dexie version 2
src/design/partColours.ts   PART_COLOURS and PLATE, mirrored by tokens.css
src/design/colour.ts        hslToHex, ciede2000, simulateCvd
src/app/brain/              the lazy renderer chunk: brain.ts (entry), camera.ts, draw.ts, constants.ts
src/app/plate/              plate chrome in the initial bundle: Plate, Strip, PlateControls, PartsRow, TextEquivalent, PartCard, Sheet, useRenderer
src/app/hooks/              useBrainSpace.ts, useStill.ts
src/app/actions/            parts.ts, preferences.ts
src/app/screens/            SettingsParts.tsx; Home, Started, Settings, About (mod)
src/copy/                   brain.ts, parts.ts
tests/purity/               anatomy.ts, anatomy.test.ts, geometry fixture
tests/e2e/                  brain-home, brain-started, parts, brain-guards, brain-perf specs; fixtures/brain.ts
```

### Task 1: Setup

**Builder:** the lead, plus owner steps.

**Files:**
- Create:
  - `.claude/agents/{researcher,domain,renderer,ui,design-critic,accessibility,qa-webkit,code-reviewer}.md`
  - `.claude/skills/unslop/**`, from `heydamir/unslop` at `97daa3eb365670ea3f87ed85356cbfcee18105a5`, path `skills/unslop`, without `scripts/`
  - `.claude/skills/unslop/LICENSE` and `.claude/skills/unslop/ATTRIBUTION.md`
  - `docs/reference/brain-space/` (owner)
- Modify:
  - `.gitignore` (add `.claude/settings.local.json`), `.prettierignore` (add `.claude/skills`), `eslint.config.js` ignores (add `docs/reference`)
  - `README.md:9,17,19`, `src/copy/home.ts:9`, `src/domain/config.ts:58` (milestone numbers)

- [ ] **Step 1: Owner step.** Ask the owner to:
  - run `claude plugin install frontend-design@claude-plugins-official --scope project`;
  - put the reference stills and the canvas prototype in `docs/reference/brain-space/`, ideally with a line per still saying what it shows.
  Wait for both.
- [ ] **Step 2:** Read every file the owner added. The repository is public, so check the prototype carries no secrets and no third-party code whose licence forbids publishing. Ask the owner if anything does. The prototype's anatomy-named identifiers are fine there, because the anatomy scan covers `src/**` and `tests/**` only.
- [x] **Step 3:** Write the eight agent files.
  - **Frontmatter:** `name`, `description`, `tools` and `model`, per ADR-032's table. The read-only agents get `tools: Read, Grep, Glob`. `researcher` adds `WebSearch, WebFetch`. `code-reviewer` adds `Bash`, and its body limits it to `git` reads and test commands.
  - **Body:**
    - the job;
    - the files it may touch, plus the test files its task names;
    - the Global Constraints it must quote;
    - it never talks to the owner, never commits or pushes, and never edits `.github/`;
    - it returns under 200 words, plus paths and command output.
  - **If the new agent types don't load in the running session**, brief a `general-purpose` agent with the agent file's body and its model.
- [x] **Step 4:** Copy unslop.
  - Clone `heydamir/unslop` into the session scratchpad, check out `97daa3e`, and copy `skills/unslop` without `scripts/` to `.claude/skills/unslop/`. Copy the repository's `LICENSE` (CC BY 4.0) beside it. Read every copied file before committing.
  - `ATTRIBUTION.md`: "unslop by heydamir, https://github.com/heydamir/unslop, commit 97daa3eb365670ea3f87ed85356cbfcee18105a5, licensed CC BY 4.0. Changes: `scripts/` removed." List any `SKILL.md` steps that call `scripts/` as unavailable here.
- [x] **Step 5:** Update the milestone mentions:
  - `README.md:19` becomes "Demo: coming in M5.";
  - `README.md:9` becomes "Later milestones add Brain space, if-then plans, insights and a weekly check-in.";
  - the `home.ts:9` comment names M3 for Plans and M4 for Insights;
  - the `config.ts:58` comment becomes `/** Extended by later milestones: parts (M2), plans (M3), import (M5). */`.
- [x] **Step 6:** Update the ignore files, then run the gate. Expected: exit 0.
- [x] **Step 7:** Commit and push.

```bash
git add .claude .gitignore .prettierignore eslint.config.js README.md src/copy/home.ts src/domain/config.ts docs/reference
git commit -m "chore: add the project subagents, unslop, the Brain space reference and new milestone numbers"
```

### Task 2: Renderer check on the iPhone

**Builder:** `renderer`, outside the repo. **Files:** none in the repo; `docs/decisions.md` (ADR-029).

- [x] **Step 1:** In the session scratchpad, rebuild ADR-029's canvas 2D test page.
  - **Counts:** 670 fibres of 8 strands, each strand 8 to 22 points, with a point at each strand end.
  - **Drawing:** the dim field with normal blending into an offscreen cache, additive light (`lighter`) on top, and signals on 30 lines.
  - **Interaction:** drag turns (yaw and pitch), and pinch or the wheel zooms.
  - **Canvas:** 358×340 CSS px, device pixel ratio capped at 2.
  - **Readout:** mean and p95 draw time over the last 120 frames, on screen.
  - **Server:** a small static server on the local network that sends the exact CSP from Global Constraints. Print the `http://<lan-ip>:<port>/` URL.

  Return the URL, plus Playwright WebKit (`devices['iPhone 15']`) idle and drag draw times, the median of 3 runs.
- [ ] **Step 2: Owner step.** On the iPhone, on the same Wi-Fi, open the URL, drag for a few seconds and pinch. Report any stutter, and the readout's mean and p95 while dragging.
- [ ] **Step 3:** Decide.
  - **No visible stutter:** add a line to ADR-029's consequences: "Confirmed on the owner's iPhone on <date>: drag mean <x> ms, p95 <y> ms."
  - **Stutter:** write a new ADR that switches to raw WebGL2, then re-plan Task 7A before it starts.

  The frame-time guard's threshold is set in Task 10, from the first CI run of the real renderer (ADR-035). Stop the server and commit: `docs: confirm the canvas 2D renderer on the iPhone`.

### Task 3: Parts

**Builder:** `domain` for Steps 1–7, `ui` for Steps 8–10.

**Files:**
- Create: `src/domain/parts.ts`, `src/domain/parts.test.ts`, `src/storage/migrate.test.ts`, `tests/purity/anatomy.ts`, `tests/purity/anatomy.test.ts`
- Modify:
  - domain: `config.ts`, `attempts.ts`, `commands.ts`, `defaults.ts` (remove `DEFAULT_TASK_TYPES`), `exportFormat.ts`, `testing/arbitraries.ts`, and their tests
  - storage: `db.ts`, `seed.ts`, `configStore.ts`, `exportData.ts`, `storage.test.ts`
  - app and copy: `src/app/actions/stuck.ts` (+ test), `src/app/screens/Started.tsx` and `.module.css`, `src/copy/rules.ts`, `src/copy/copy.test.ts`
  - E2E: `tests/e2e/stuck-flow.spec.ts` (`Writing` becomes `Work`)

**Interfaces:**
- Produces:

```ts
// config.ts
export type ColourId = 1 | 2 | 3 | 4 | 5 | 6;
export type RegionId = 1 | 2 | 3 | 4 | 5 | 6;
export type Part = { id: string; label: string; order: number; enabled: boolean; colour: ColourId; region: RegionId };
export type Plan = { /* M1 fields */ partId?: string };                  // set from M3
export type Settings = { /* M1 fields */ brainStill?: 'still' | 'moving' }; // unset = follow the system
export type Config = { feelings: Feeling[]; responses: FeelingResponse[]; parts: Part[]; obstacles: ListItem[]; plans: Plan[]; settings: Settings };
export type ConfigPatch = { settings?: Partial<Settings>; parts?: readonly Part[] }; // parts are upserted by id
// parts.ts
export const MAX_PARTS = 6;
export const PART_LABEL_MAX = 24;
export type PartError = 'limit' | 'label';
export function migrateTaskTypes(taskTypes: readonly ListItem[]): Part[];   // spec §16.3
export function addPart(parts: readonly Part[], input: { id: string; label: string }): Part[] | PartError;  // the records to upsert
export function editPart(parts: readonly Part[], id: string, change: { label?: string; colour?: ColourId; enabled?: boolean }): Part[] | PartError;
export function validateParts(parts: readonly Part[]): string[];            // [] when valid
// attempts.ts: taskType is replaced by
//   part?: { id: string; label: string };                        // latest tag
//   tags: { id: string; label: string; at: number }[];           // every start.tagged, in order
// commands.ts
export function tagStart(deps: EventDeps, attemptEvents: readonly AppEvent[], attemptId: string, part: Pick<Part, 'id' | 'label'>): AppEvent[];
// defaults.ts
export const DEFAULT_PARTS: readonly Part[];   // work Work, study Study, health Health, home Home, money Money: order, colour and region 1–5, enabled
// exportFormat.ts
export const EXPORT_VERSION = 2;               // parseExport accepts 1 and 2 and returns a version 2 file
// src/app/actions/stuck.ts
export function tag(d: AppDeps, attemptId: string, partId: string): Promise<void>; // throws `Unknown part: ${partId}`
```

- **Rules:**
  - labels are trimmed, 1 to 24 characters;
  - `addPart` takes the lowest free region and colour, with `order` one past the highest;
  - `editPart` never changes `region`, and a colour that another part holds is swapped with it (ADR-035);
  - `validateParts` checks at most six parts, unique regions, unique colours and label length.

- [x] **Step 1:** Write the failing domain tests.
  - **`parts.test.ts`:**
    - `migrateTaskTypes maps M1's defaults`: the six M1 task types (writing, study, admin "Admin & email", chores, creative, other-task, orders 1–6) give five parts with the same ids and labels, regions and colours 1–5 in order, all enabled, with no `other-task`;
    - `migrateTaskTypes skips disabled types and keeps the first six by order`;
    - `addPart takes the lowest free region and colour`: adding "Portfolio" to `DEFAULT_PARTS` gives region 6, colour 6, order 6;
    - `addPart refuses a seventh part`, which returns `'limit'`, and `refuses an empty or 25-character label`, which returns `'label'`;
    - `editPart swaps a colour held by another part`: giving `work` colour 2 returns `work` with 2 and `study` with 1;
    - `editPart never changes a region`;
    - `validateParts` returns `[]` for `DEFAULT_PARTS`, and flags a duplicate colour, a duplicate region and a seventh part;
    - **Property** `edits keep parts valid`: any sequence of `addPart` and `editPart` calls from `[]` keeps `validateParts` at `[]` and never changes an existing part's region.
  - **Attempts and commands:** `latest tag wins` also asserts `tags` holds both tags with their `at`. `tagStart snapshots the part's label`.
  - **`exportFormat.test.ts`:**
    - `parseExport migrates a version 1 backup`: a version 1 file with M1's six task types and no `brainStill` is ok, `version` is 2, `parts` equals `migrateTaskTypes(taskTypes)`, and the events are unchanged;
    - `rejects version 3`, with the newer-version message;
    - **Property** round-trip over version 2 data, with a new `arbParts()` (valid sets only), `brainStill` sometimes set, and plans sometimes carrying `partId`.
- [x] **Step 2:** Write the failing storage tests in `migrate.test.ts`, using fake-indexeddb.
  - `upgrades an M1 database` (Review Focus #10):
    - **Setup:** open a raw `Dexie('test-…')` that declares only M1's `version(1)` schema. Add M1's six task types, kv `seeded`, and events for four counted starts tagged `writing`, `other-task` and none, and one undone. Close it.
    - **Then:** `openStorage(name)`.
    - **Expected:**
      - `parts` equals `migrateTaskTypes` of the six;
      - the `taskTypes` table is gone;
      - events, feelings and responses are unchanged;
      - no default parts were added.
  - `a new database seeds the default parts`.
  - `applyConfigPatch upserts parts and rejects an invalid set`: a patch that makes seven parts rejects and writes nothing.
  - `brainStill round-trips`: after `applyConfigPatch({ settings: { brainStill: 'still' } })`, both `getConfig()` and `readExportData()` carry it.
- [x] **Step 3:** Run `npx vitest run src/domain src/storage`. Expected: FAIL.
- [x] **Step 4:** Implement the domain and storage changes.
  - **Dexie:** `this.version(2).stores({ parts: 'id, order', taskTypes: null }).upgrade(…)` writes `migrateTaskTypes` of the old rows. If the upgrade can't read a table its own version deletes, keep `taskTypes` in version 2 and drop it in a version 3 with no upgrade. The fixture test decides.
  - **Settings:** `brainStill` joins `configStore`'s optional keys, the export settings schema and `arbSettings`.
  - **`applyConfigPatch`:** writes `kv` and `parts` in one transaction, and throws when `validateParts` of the merged set isn't `[]`.
- [x] **Step 5:** Run it again. Expected: PASS, with the domain coverage gate held.
- [x] **Step 6:** Write the copy guards, test first.
  - **`rules.ts`:** `BANNED_WORDS` gains the 14 words of spec §16.9. The test asserts `checkCopy('Rewired by firing')` has length 2.
  - **`anatomy.ts`:** exports `ANATOMY_WORDS`, the 32 words of spec §16.5.
  - **`anatomy.test.ts`:**
    - walks every file under `src/` and `tests/`, skipping `tests/purity/anatomy.ts`, `tests/purity/anatomy.test.ts` and `src/copy/rules.ts` (whose banned list shares four words), and expects no whole-word, case-insensitive match;
    - a sanity case builds a sample from `ANATOMY_WORDS[0]` and expects the matcher to find it.
  - Reword the "fire" comment at `tests/e2e/stuck-flow.spec.ts:156`.
- [x] **Step 7:** Run `npx vitest run src/copy tests/purity`. Expected: PASS.
- [x] **Step 8:** In `stuck.test.ts`, write `tag records the part's label` and `tag rejects an unknown part` (the error names the id), then switch `tag` to `config.parts`. In `Started.tsx`, list `config.parts` that are enabled, by `order`, with `pressed={attempt.part?.id === p.id}`. `.chips` becomes one row: `flex-wrap: nowrap; overflow-x: auto`, with chips `flex: none`. `copy.test.ts` pins the five default part labels.
- [x] **Step 9:** Update `stuck-flow.spec.ts` (`Writing` becomes `Work`) and add `the parts row is one line`: every chip shares one `offsetTop`. Run `npx playwright test tests/e2e/stuck-flow.spec.ts`. Expected: PASS.
- [x] **Step 10:** Run the gate. Then commit:

```bash
git commit -am "feat(parts): replace task types with parts (Dexie v2, export v2, copy guards)"
```

### Task 4: The projection and focus rules

**Builder:** `domain`.

**Files:**
- Create: `src/domain/brainSpace.ts`, `src/domain/brainSpace.test.ts`, `src/domain/focus.ts`, `src/domain/focus.test.ts`
- Modify: `src/domain/testing/arbitraries.ts` (add `arbFlow`)

**Interfaces:**
- Consumes: `Attempt` with `part` and `tags`, `Part`, `Plan.partId` (Task 3).
- Produces: spec §16.4's code block exactly, plus:

```ts
// brainSpace.ts
// BrainLine's plan kind gains two fields (ADR-035):
//   everStarted: boolean   // some on-cue attempt has a start.made, undone or not
//   hidden: boolean        // kept for its fibre, drawn as nothing
export function lightPartOf(a: Attempt, settledAt: number | undefined): string | null;
  // the latest tag with at <= settledAt; the latest tag when unsettled
export function summaryLines(space: BrainSpace): number;
  // plan lines that aren't waiting, plus start lines with a part that aren't undone
// focus.ts
export type FocusRule = 'lapse' | 'waiting' | 'stable-cue' | 'add-plan' | 'name-feeling'; // spec §16.9 rows 1–5
export function recentLapses(events: readonly AppEvent[], now: number): ReadonlySet<string>; // plan ids, last 7 days
export function focusFor(input: { partId: string; plans: readonly Plan[]; lines: readonly BrainLine[];
  lapsedPlanIds: ReadonlySet<string>; plansAvailable: boolean }): FocusRule;
```

- **Projection rules this plan fixes** (ADR-035):
  - **Settling:** an attempt settles at the `openedAt` of the next attempt in `foldAttempts` order. The last attempt is unsettled.
  - **Part ids:** a part id that isn't a configured part is `null`. That covers M1's `other-task` and hand-edited imports. It applies to both `PartLight` and lines.
  - **On-cue:** only the first counted start for a `(planId, occurrence)` is on cue. A later counted start for the same occurrence falls to rule 3, so light still adds up.
  - **Plan line part:** the `lightPartOf` its on-cue attempts give. A waiting line takes `plan.partId`, and `id` is `` `${planId}:${partId ?? 'core'}` ``.
  - **Plan line order:**
    - with `everStarted`, the `start.at` of its earliest on-cue attempt with a `start.made`, undone or not;
    - a line whose on-cue starts were all undone stays in `lines` with that order: `strength: 'waiting'` while its plan is active, and `hidden: true` while it is paused;
    - a line with no `start.made` (`everStarted: false`) is a waiting line with `plan.createdAt` as its order. It exists only while the plan is active.
  - **`parts`:** one `PartLight` per configured part, in `order`, then `{ partId: null }` last when it has starts.
  - **`plansAvailable`:** `false` until M3, so rule 4 doesn't suggest a plan the app can't make yet.

- [x] **Step 1:** Write the failing unit tests in `brainSpace.test.ts`:
  - `an M1 history becomes start lines and sparks`:
    - **Input:** three counted starts tagged `work`, one untagged, one tagged `other-task`, and one undone and untagged.
    - **Expected:**
      - 3 start lines in `work`;
      - 2 core sparks (start lines with `partId: null`);
      - 1 line with `undone: true` and `partId: null`;
      - `work` starts 3, `null` starts 2, `totalStarts` 5, and `summaryLines` 3.
  - `strengthFor steps`: 0 gives `'waiting'`, 1 and 4 give 1, 5 and 14 give 2, 15 and 39 give 3, and 40 gives 4.
  - `each occurrence counts once`.
  - `an active plan with no on-cue start waits`, `a paused plan with no on-cue start shows nothing`, and `a paused plan keeps its line`.
  - `changing a plan's part starts a new line`: on-cue starts tagged X and then Y give lines `p:X` and `p:Y`.
  - `moving at exactly 48 hours, resting 1 ms later`, with a backfilled start counting.
  - `two tabs: a tag on a settled attempt changes counts and not light` (spec §16.13).
  - `undone on-cue starts keep the line, its order and everStarted`, and pausing that plan sets `hidden`.
- [x] **Step 2:** Write the failing properties over `arbFlow()`. It builds realistic flows: attempts in time order, each opened, sometimes started, and then only its own Started actions (tags, undo, timer), sometimes linked to a plan occurrence, with plans to match.
  - **Light adds up:** the plan lines' `onCueStarts`, plus start lines not undone, equal `totalStarts`, which equals the count of `isCountedStart`.
  - **Undone draws nothing and keeps its place:** every attempt with a `start.made` appears exactly once, as its own start line or inside a plan line's order.
  - **Appending is stable:** for a flow F and F plus one more realistic step, every line of `project(F)` whose attempt is settled keeps its `id`, `partId` and `order`, and no plan line's `onCueStarts` falls, except when the step was an undo.
  - **Only on-cue starts grow:** appending a start that isn't on cue leaves every plan line's `onCueStarts` unchanged.
  - **Moving:** it is moving exactly when the newest counted start is at most `RESTING_AFTER_MS` before `now`.
  - **Counts:** `PartLight.starts` equals an independent count by `partOfStart`, with unknown ids counted as `null`.
- [x] **Step 3:** Write the failing `focus.test.ts`:
  - one test per rule that checks precedence;
  - rule 4 is skipped when `plansAvailable` is false;
  - `recentLapses` keeps a slip at exactly 7 days and drops one older by 1 ms.
- [x] **Step 4:** Run `npx vitest run src/domain/brainSpace.test.ts src/domain/focus.test.ts`. Expected: FAIL.
- [x] **Step 5:** Implement `brainSpace.ts` with the constants and signatures of spec §16.4, and `focus.ts`.
- [x] **Step 6:** Run it again. Expected: PASS. Then run the gate.
- [x] **Step 7:** Commit: `feat(domain): project Brain space lines, strength and focus`.

### Task 5: Geometry

**Builder:** `domain`. Needs the reference (Task 1). Runs in parallel with Tasks 4 and 6.

**Files:**
- Create:
  - `src/domain/random.ts`, `src/domain/random.test.ts`
  - `src/geometry/tsconfig.json`, `src/geometry/field.ts`, `src/geometry/assign.ts`, `src/geometry/shade.ts`, `src/geometry/geometry.test.ts`
  - `tests/purity/geometry-fixture/uses-window.ts`, `tests/purity/geometry-fixture/tsconfig.json`
- Modify: `eslint.config.js`, `vitest.config.ts`, `package.json` (the `typecheck` line only; this brief extends `domain`'s scope to it), `tests/purity/purity.test.ts`, `tsconfig.node.json` (exclude the new fixture)

**Interfaces:**
- Produces:

```ts
// src/domain/random.ts
export function mulberry32(seed: number): () => number;  // floats in [0, 1)
export function hash32(text: string): number;             // FNV-1a, unsigned 32-bit
// src/geometry/field.ts
export const BRAIN_SEED = 20261112;
export const FIBRE_COUNT = 670;
export const STRANDS_PER_FIBRE = 8;
export const STRAND_POINTS_MIN = 8;
export const STRAND_POINTS_MAX = 22;
export const PLAN_FIBRES_PER_REGION = 12;
export const FIELD_HASH: number;                          // pinned on first green run
export type RegionKey = 'region-1' | 'region-2' | 'region-3' | 'region-4' | 'region-5' | 'region-6' | 'core';
export type Fibre = { index: number; region: RegionKey; forPlans: boolean; strands: readonly Float32Array[] }; // x,y,z interleaved, within [-1, 1]
export type Field = { fibres: readonly Fibre[]; byRegion: Readonly<Record<RegionKey, readonly number[]>>; vertexCount: number; endCount: number };
export function buildField(seed?: number): Field;
export function fieldHash(field: Field): number;
export const PULL_DIRECTIONS: Readonly<Record<RegionKey, readonly [number, number, number]>>;
export function regionKey(region: RegionId | null): RegionKey; // null → 'core'
// src/geometry/assign.ts
export type LineRef = { id: string; kind: 'plan' | 'start'; partId: string | null; order: number; waiting: boolean };
  // waiting = a plan line with everStarted false. Hidden and undone lines are passed too, so they keep their fibres.
export type Placement = { kind: 'fibre'; fibre: number } | { kind: 'end'; fibre: number; strand: number } | { kind: 'none' };
export function assignFibres(lines: readonly LineRef[], field: Field, regionOfPart: (partId: string | null) => RegionKey): ReadonlyMap<string, Placement>;
// src/geometry/shade.ts
export type Hsl = { h: number; s: number; l: number };
export function lineShade(lineId: string, base: Hsl): Hsl; // hue within ±8°, lightness within ±6 points
```

- **Assignment** (spec §16.5, with ADR-035's order):
  - non-waiting lines are placed first, by `order` and then `id`, and waiting lines after them;
  - plan lines take their region's plan fibres, and start lines take the rest;
  - each line starts at the fibre `hash32(id)` picks and probes forward over free fibres;
  - a start-line fibre lights strand 0's end;
  - **Overflow:** once a region's start fibres are all used, each further start line lights the next unlit strand end (strand 1, 2, …) of the earliest-ordered start-line fibre that has one. When every end is lit, it gets `'none'`;
  - **Core sparks** (start lines with `partId: null`) take core strand ends the same way.

- [ ] **Step 1:** Write the failing purity tests in `purity.test.ts`:
  - the geometry tsconfig rejects `window` (via the new fixture);
  - ESLint rejects a `react` import in `src/geometry/x.ts`;
  - ESLint rejects `../app/x` from `src/geometry/x.ts`, and allows `../domain/random`;
  - ESLint rejects `../geometry/field` from `src/domain/x.ts`.
- [ ] **Step 2:** Run `npx vitest run tests/purity`. Expected: FAIL. Then add the tooling:
  - **`src/geometry/tsconfig.json`:** the same as the domain's;
  - **ESLint:** a `src/geometry/**/*.ts` block with the domain's first group and `['../storage*', '../app*', '../copy*', '../design*', '../../*']`. The domain's second group gains `'../geometry*'`;
  - **`typecheck`:** appends `&& tsc -p src/geometry/tsconfig.json`;
  - **Coverage:** include `src/geometry/**/*.ts`, with thresholds `{ 'src/domain/**': { lines: 95, branches: 90 }, 'src/geometry/**': { lines: 90 } }`.

  Run it again. Expected: PASS.
- [ ] **Step 3:** Write the failing `random.test.ts`:
  - the first three values of `mulberry32(1)` are pinned, taken from the reference algorithm;
  - every value is in [0, 1);
  - `hash32('')` is `2166136261` and `hash32('a')` is `0xe40c292c`.
- [ ] **Step 4:** Write the failing `geometry.test.ts`:
  - `same seed, same field`: `fieldHash(buildField())` is the same twice and equals `FIELD_HASH`. Changing that constant later moves every user's light, so it needs an ADR;
  - `counts`:
    - `FIBRE_COUNT` fibres;
    - every strand has 8 to 22 points;
    - `vertexCount` is within 75,000–90,000;
    - `endCount` is `FIBRE_COUNT × STRANDS_PER_FIBRE`;
  - `regions`: all seven keys have fibres, each with exactly `PLAN_FIBRES_PER_REGION` plan fibres, and every coordinate is within [-1, 1];
  - `shape`:
    - the core's centroid is within 0.2 of the origin;
    - each region's fibres sit on its half;
    - the six region centroids are pairwise apart by at least 0.3;
  - **Property** `assignment is stable when lines are appended`: the placements of a prefix's non-waiting lines are unchanged by any suffix whose lines all have a greater `order` than every prefix line;
  - `waiting lines never displace non-waiting lines`;
  - `plan lines use plan fibres and start lines never do`;
  - `overflow lights ends in order and removes nothing`;
  - `core sparks take core ends`;
  - `lineShade stays within range and is stable per id`;
  - `PULL_DIRECTIONS are unit vectors, and the core's is zero`.
- [ ] **Step 5:** Run `npx vitest run src/domain/random.test.ts src/geometry`. Expected: FAIL.
- [ ] **Step 6:** Implement.
  - **Layout:** lay the six regions and the core out like the reference: two halves, a central core and a lower rear area. Write the table of regions to areas as a comment in `field.ts`, with neutral names only.
  - **Shape from placement only**, with no outline data.
- [ ] **Step 7:** Run it again. Expected: PASS. Pin `FIELD_HASH`, then run the gate.
- [ ] **Step 8:** Commit: `feat(geometry): seeded Brain space field and stable fibre assignment`.

### Task 6: Plate tokens and part colours

**Builder:** `ui`. Runs in parallel with Tasks 4 and 5.

**Files:**
- Create: `src/design/partColours.ts`, `src/design/colour.ts`, `src/design/colour.test.ts`
- Modify: `src/design/tokens.css`, `src/design/tokens.test.ts`, `src/design/global.css` (add `.visually-hidden`)

**Interfaces:**
- Produces:

```ts
export type Hsl = { h: number; s: number; l: number };
export type Lab = { L: number; a: number; b: number };   // CIELAB, D65
export const PART_COLOURS: Readonly<Record<ColourId, Hsl>>; // spec §16.7; id 6 decided here
export const PLATE: { bg: '#05060A'; dimPoint: '#8E98AC'; dimTrace: '#7C8598'; waiting: '#EEF1F6'; core: '#9AA3B5' };
export function hslToHex(c: Hsl): string;
export function ciede2000(a: string, b: string): number;   // hex in
export function ciede2000Lab(a: Lab, b: Lab): number;
export function simulateCvd(hex: string, kind: 'protanopia' | 'deuteranopia' | 'tritanopia'): string;
  // Machado et al. (2009) matrices at severity 1.0, applied in linear RGB
```

- **CSS:**
  - `--plate-bg`, `--plate-dim-point`, `--plate-dim-trace`, `--plate-waiting`, `--plate-core` and `--part-1`…`--part-6` are declared once, outside the theme blocks, so they are the same in both themes;
  - a `.plate-scope` block redeclares every semantic colour token with the dark theme's values (ADR-026).

- [x] **Step 1:** Write the failing tests:
  - `ciede2000 matches Sharma, Wu and Dalal (2005)`: pair 1, (50, 2.6772, −79.7751) against (50, 0, −82.7485), gives 2.0425 to four decimals, plus two more rows from that table;
  - `simulateCvd leaves greys unchanged`, and pure red under protanopia matches the matrix applied by hand;
  - `part colours meet spec §16.7`:
    - every base colour is at least 4.5:1 against `PLATE.bg`;
    - the four shade corners (h ± 8, l ± 6) are at least 3:1;
    - `PLATE.waiting` is at least 3:1;
    - every pair is at least ΔE00 12 in normal vision and at least 6 under each simulation;
    - no hue lies within 15° of red;
  - `tokens.css mirrors partColours.ts`, and `.plate-scope equals the dark block`;
  - `global.css has a .visually-hidden class`.
- [x] **Step 2:** Run `npx vitest run src/design`. Expected: FAIL.
- [x] **Step 3:** Implement. For id 6, try blue `hsl(225 90% 70%)` first, then lime `hsl(85 80% 55%)`. Lightness may move in steps of 2 points to pass (the review's estimate: blue fails deuteranopia at 70% and passes near 76%). If neither candidate passes within ±10 points, stop and report the closest pairs to the lead. The lead writes the chosen value into spec §16.7.
- [x] **Step 4:** Run it again. Expected: PASS. Then run the gate.
- [x] **Step 5:** Commit: `feat(design): plate tokens and part colours with contrast and colour-vision checks`.

### Task 7: Renderer and Home

7A and 7B run in parallel worktrees after Tasks 3–6. Before they start, the lead commits a stub `src/app/brain/brain.ts` that exports 7A's types and a `createRenderer` that throws `new Error('renderer not built')`, so 7B's typecheck and build pass. 7C is the owner gate (ADR-021).

#### 7A: The renderer

**Builder:** `renderer`.

**Files:**
- Create: `src/app/brain/brain.ts` (the lazy entry), `camera.ts`, `camera.test.ts`, `draw.ts`, `constants.ts`
- Modify: `vite.config.ts` (`build.manifest: true`), `scripts/check-bundle-size.mjs`

**Interfaces:**
- Consumes: `BrainSpace`, `BrainLine` (Task 4); `buildField`, `assignFibres`, `lineShade`, `regionKey`, `PULL_DIRECTIONS` (Task 5); `PART_COLOURS`, `PLATE` (Task 6); `Part` (Task 3).
- Produces:

```ts
// constants.ts: spec §16.8
export const EXPLODE_FROM_ZOOM = 1.1, UNSELECTED_ALPHA = 0.15, ZOOM_MIN = 0.8, ZOOM_MAX = 3.2, BURST_MS = 1800, TURN_STEP_RAD = Math.PI / 8;
// camera.ts
export type Camera = { yaw: number; pitch: number; zoom: number };
export function turnBy(c: Camera, step: -1 | 1): Camera;
export function zoomBy(c: Camera, step: -1 | 1): Camera;      // ×1.25 per step, clamped
export function explodeAmount(zoom: number): number;          // 0 at or below EXPLODE_FROM_ZOOM, 1 at ZOOM_MAX
// brain.ts: the only module the app imports dynamically
export type RenderState = {
  space: BrainSpace; parts: readonly Part[]; selected: string | null; still: boolean;
  reveal?: { lineId: string; startAt: number }; burstAt?: number;    // used from Task 8
};
export interface BrainRenderer { update(state: RenderState): void; turn(step: -1 | 1): void; zoom(step: -1 | 1): void; destroy(): void }
export function createRenderer(canvas: HTMLCanvasElement,
  opts: { variant: 'plate' | 'strip'; now: () => number; onPartTap: (partId: string | null) => void }): BrainRenderer;
```

- **The canvas reports its state for tests:**
  - `data-loop` is `running` or `idle`;
  - `data-yaw` and `data-zoom` are given to 2 decimal places;
  - `data-draw-mean` is the mean draw time in ms over the last 120 frames, updated once a second while the loop runs.

- [ ] **Step 1:** Write the failing `camera.test.ts`:
  - `turn steps by TURN_STEP_RAD`;
  - `zoom stays within ZOOM_MIN and ZOOM_MAX after 20 taps either way` (Review Focus #12);
  - `explodeAmount is 0 at EXPLODE_FROM_ZOOM and 1 at ZOOM_MAX`.
- [ ] **Step 2:** Change `check-bundle-size.mjs`.
  - It reads `dist/.vite/manifest.json`, finds the dynamic entry whose `src` is `src/app/brain/brain.ts`, and gzips it with the static imports that aren't in the initial set.
  - It prints both totals, and exits 1 if the chunk is over `30 * 1024`.
  - Confirm it fails with the budget set to 1 kB, then restore it.
- [ ] **Step 3:** Implement to spec §16.6–16.8.
  - **Draw order:**
    - the dim field, with normal blending, cached offscreen;
    - lines in `lighter` mode, in their shade, using `assignFibres` over the projection's lines;
    - waiting lines, dashed in `--plate-waiting` with a ring.
  - **Widths:** strength 1 is 0.6 CSS px, 2 is 1.0, 3 is 1.6 with a faint halo, and 4 is 2.4 with a halo and a white core. Start lines are hairlines fainter than strength 1, and core sparks are points in `--plate-core`.
  - **States:**
    - resting scales lit alpha by `RESTING_BRIGHTNESS`;
    - a selection fades the rest to `UNSELECTED_ALPHA`;
    - past `EXPLODE_FROM_ZOOM`, regions pull apart along `PULL_DIRECTIONS`, labelled in Atkinson Hyperlegible Next 600 at step −1 on an opaque `--plate-bg` backing;
    - signals run on strength 2+ lines only while moving and not Still.
  - **The loop:**
    - it renders on demand and pauses while the page is hidden;
    - the device pixel ratio is `min(devicePixelRatio, 2)`;
    - a `ResizeObserver` resizes the canvas and keeps the camera and selection (Review Focus #11);
    - `touch-action` is `none` unless the page scrolls, in which case it is `pan-y`.
  - **Input:** a pointer drag sets yaw and pitch. Pinch and the wheel zoom. A tap hit-tests the nearest lit region within 24 px and calls `onPartTap`.
  - **Still:** camera moves snap instead of easing over `--motion-slow`.
- [ ] **Step 4:** Run `npx vitest run src/app/brain`, then the gate. Expected: PASS, with the chunk at most 30 kB.
- [ ] **Step 5:** Commit: `feat(brain): canvas 2D renderer as a lazy chunk`.

#### 7B: The plate on Home

**Builder:** `ui`. Until 7A is merged, the stub throws and the plate shows its fallback, which is itself a requirement.

**Files:**
- Create:
  - `src/app/plate/Plate.tsx` (+ `.module.css`), `PlateControls.tsx`, `PartsRow.tsx`, `TextEquivalent.tsx`, `useRenderer.ts`
  - `src/app/hooks/useBrainSpace.ts`, `src/app/hooks/useStill.ts`, `src/app/hooks/useStill.test.ts`
  - `src/app/actions/preferences.ts` (+ test), `src/copy/brain.ts`
  - `tests/e2e/fixtures/brain.ts`, `tests/e2e/brain-home.spec.ts`
- Modify:
  - `src/app/screens/Home.tsx`, `src/app/layout/Shell.tsx` (+ css, adding `data-slot="ribbon"`)
  - `tests/e2e/helpers.ts`: `seedEvents(page, events)`, `seedParts(page, parts)` and `seedPlans(page, plans)`. Each one opens the `arohexis` database without a version number, after the app has loaded and created it, writes the rows, then reloads
  - specs that expect a visible `h1`: `home.spec.ts:16,24,56`, `update.spec.ts:66`, `offline.spec.ts:30`
  - `tests/e2e/update.spec.ts` (the worst case above), and `src/app/components/UpdateCard.tsx` if it needs a slot prop

**Interfaces:**
- Consumes: `projectBrainSpace`, `summaryLines` (Task 4); `createRenderer` (7A, by dynamic import of `../brain/brain`).
- Produces:

```ts
export function useBrainSpace(): { space: BrainSpace; parts: readonly Part[] } | undefined;  // now from useNow(60_000)
export function effectiveStill(setting: 'still' | 'moving' | undefined, prefersReduced: boolean): boolean;
export function useStill(): { still: boolean; toggle(): void };
export function setStill(d: AppDeps, value: 'still' | 'moving'): Promise<void>;
export function Plate(props: { selected: string | null; onSelect(partId: string | null): void }): JSX.Element;
```

- **Exact copy** (`brain.ts`, spec §16.9):
  - `regionLabel: 'Brain space'` and `empty: 'Your starts will light up here.'`;
  - `summary(starts, lines)`, per §16.9;
  - `strength: { waiting: 'Waiting', 1: 'New', 2: 'Repeated', 3: 'Steady', 4: 'Well-worn' }`;
  - counts:
    - `starts(n)`: "1 start" or "n starts";
    - `onCue(n)`: "1 start on cue" or "n starts on cue";
    - `startLines(n)`: "1 start line" or "n start lines";
  - `noPart: 'No part'`;
  - `moving: 'Signals are moving.'` and `resting: 'Signals are resting. One start sets them moving again.'`;
  - `controls`: `Still`, `Zoom in`, `Zoom out`, `Turn left`, `Turn right`, `All`.
  - **Text equivalent per part:**
    - `` `${label}: ${starts(n)}.` ``;
    - then, if it has plan lines, `` ` Plan lines: ${items.join('; ')}.` ``, where each item is `` `${strength}, ${onCue(k)}` ``;
    - then, if it has start lines, `` ` ${startLines(m)}.` ``.

  `copy.test.ts` checks every function's output for sample inputs, because the glob only reads string values.
- **Which parts show:** the parts row and the text equivalent list every part that is enabled or has light (Review Focus #14).

- [ ] **Step 1:** Write the failing layout test first, in `brain-home.spec.ts` at 375×667:
  - **Setup:** inject a 180 px block into `[data-slot="card"]` and a 40 px block into `[data-slot="ribbon"]`, with the week line showing;
  - **Expected:** no scroll, the plate at least 200 px tall, and **I'm stuck** fully in view.

  **Risk:** by M1's CSS (page padding 16 and 24, main padding 16 and 16, main gap 24, a 177.5 px thumb zone), this leaves about 150 px. So on Home:
  - the plate runs from the top edge (no page or main top padding, with `env(safe-area-inset-top)` inside the plate);
  - the gaps between the plate, the card and the thumb zone are `--space-4`;
  - the page's bottom padding is `--space-4`.

  That gives about 206 px. If it still measures under 200 px, move the week line into the nav row. If that isn't enough either, stop and report the measurements to the lead, who takes it to the owner.
- **Home's one card** (spec §8.1, ADR-035): `[data-slot="card"]` shows at most one card. In M2 the update card comes first, then the iOS install note, and Shell no longer renders `UpdateCard` above `<main>` on `/`. The "Start removed." notice shows on the plate's bottom edge, in plate tokens. `update.spec.ts`'s worst case becomes the update card plus the notice, with the install note waiting.
- [ ] **Step 2:** Write the other failing E2E tests in `brain-home.spec.ts`:
  - `the text equivalent matches known events`:
    - **Seed:** 3 Work, 2 Study, 1 untagged, 1 undone;
    - **Expected:** the summary reads `6 starts · 5 lines`, and the region contains `Work: 3 starts. 3 start lines.`, `Study: 2 starts. 2 start lines.`, `No part: 1 start.` and `Signals are moving.`;
  - `a new user sees the empty line`;
  - `Still toggles, survives a reload and stops the loop`:
    - `aria-pressed` becomes true, `data-motion="still"` is set, and the canvas has `data-loop="idle"` within 1 s;
    - after a reload it is still pressed;
  - `reduced motion with nothing set starts Still`;
  - `turn and zoom buttons work without a drag`: `data-yaw` and `data-zoom` change. While a plate control has focus, ← → and + − do the same;
  - `a part chip selects its part, and All clears it`;
  - `the stuck flow is still three taps` with the placeholders;
  - `with the chunk blocked, the plate shows its text and Still works`: `test.use({ serviceWorkers: 'block' })`, because `page.route` doesn't see requests the service worker answers, then `page.route('**/assets/brain-*.js', r => r.abort())`;
  - `Home is accessible with the plate`, in light and dark.
- [ ] **Step 3:** Write the failing unit tests:
  - `effectiveStill`: unset with reduce gives true; unset alone gives false; `'moving'` with reduce gives false; `'still'` gives true;
  - `setStill writes the setting`.
- [ ] **Step 4:** Run `npx vitest run src/app && npx playwright test tests/e2e/brain-home.spec.ts`. Expected: FAIL.
- [ ] **Step 5:** Implement, with frontend-design's guidance, the reference stills and ADR-018.
  - **Home:** the plate on top (flex 1, `min-height: 200px`), then `[data-slot="card"]`, then the thumb zone as in M1. The `h1` is visually hidden.
  - **Plate:** a `section` with `role="region"`, `aria-label="Brain space"`, the classes `plate` and `plate-scope`, and `data-motion` (`still`, `moving` or `resting`). It holds:
    - the visible summary line;
    - the visually hidden text equivalent;
    - the canvas, with `aria-hidden="true"` and never focusable;
    - **Still** in a top corner, and zoom and turn as 48 px buttons;
    - the parts row along the bottom edge: **All** plus a chip with a swatch per part, 48 px tall, scrolling sideways.
  - **`useRenderer`:** after the first paint (`requestAnimationFrame`, then `setTimeout(0)`), it imports `../brain/brain`. On failure it keeps the text and doesn't retry.
- [ ] **Step 6:** Run them again, then the gate. Expected: PASS.
- [ ] **Step 7:** Commit: `feat(home): the Brain space plate on Home`.

#### 7C: The owner's Home review (gate)

- [ ] **Step 1:** Merge 7A and 7B into the branch, run the gate, and push. Wait for the PR's preview URL.
- [ ] **Step 2:** `qa-webkit` takes screenshots into the scratchpad: iPhone WebKit at 375×667 and desktop, in light and dark chrome. It seeds three fixtures from `tests/e2e/fixtures/brain.ts` with `seedEvents`, `seedParts` and `seedPlans`:
  - a new user;
  - an M1-like history;
  - the full fixture: every strength, a waiting line, six parts, zoomed past `EXPLODE_FROM_ZOOM`, and one part selected.
- [ ] **Step 3:** `design-critic` judges them against `docs/reference/brain-space/`, ADR-018, ADR-021 and spec §16.6–16.7, and returns ranked findings. The lead accepts or rejects each one. The builders fix the accepted ones, and a reviewer checks the fixes.
- [ ] **Step 4: Owner step.** The owner reviews Home on the preview URL on the iPhone, in light and dark, plus the full-fixture screenshots.
  - The preview is its own origin, so it starts empty. A few starts there show real light.
  - Ask about: the plate's weight in the light theme (ADR-026), the parts row over the plate (ADR-030), and how resting looks (ADR-024).

  Iterate until the owner says yes. Later tasks wait for that yes.
- [ ] **Step 5:** Add a line to ADR-021's consequences: "Home review passed on <date>", plus any changes. Commit and push.

### Task 8: Part card and Started

**Builders:** `renderer` (strip framing, burst, reveal, settle ring) and `ui` (the sheet, the card, the strip chrome and the Started layout), one after the other.

**Files:**
- Create: `src/app/plate/Sheet.tsx`, `src/app/plate/PartCard.tsx`, `src/app/plate/Strip.tsx` (+ css), `tests/e2e/brain-started.spec.ts`
- Modify: `src/app/brain/*`, `src/app/screens/Started.tsx` and `.module.css`, `src/app/plate/Plate.tsx` (opens the card), `src/copy/brain.ts`

**Interfaces:**
- Consumes: `RenderState.reveal` and `burstAt` (7A); `focusFor`, `recentLapses` (Task 4); `timerState`, `TIMER_SECONDS` (M1).
- Produces:

```ts
export function Sheet(props: { open: boolean; onClose(): void; labelledBy: string; opener: HTMLElement | null; children: ReactNode }): JSX.Element;
  // a native <dialog> opened with showModal(). Esc and a 48 px Close button close it, and focus returns to `opener`
  // (Safari doesn't focus a tapped button, so the opener is passed). M3's lapse sheet reuses it.
export function PartCard(props: { partId: string; onClose(): void }): JSX.Element;
export function Strip(props: { attempt: Attempt }): JSX.Element;
```

- **Burst:** its phase is `(now − start.at) / BURST_MS`, like the reveal, so a reload continues the one burst and never starts a second flash. After `BURST_MS` it is over (ADR-035). Under Still, it is a fade of 120 ms or less.
- **Reveal:**
  - progress is `min(1, (now − start.at) / (TIMER_SECONDS × 1000))`;
  - for an on-cue start, it is a bright pass along the plan's line, and the new strength shows at progress 1;
  - under Still, the light is whole;
  - the canvas reports `data-reveal` (0–1, 2 decimal places) and `data-reveal-part`.
- **Card copy:**
  - the heading is the part's label in `--color-text`, with a swatch;
  - `starts(n)`;
  - each plan line as `` `${strength} · ${onCue(k)}` ``;
  - `startLines(m)`;
  - the title "What to focus on", the focus line for `focusFor(…)` (the five lines of §16.9, verbatim), and a link to About (`/about#brain-space`);
  - `close: 'Close'`.

- [ ] **Step 1:** Measure.
  - **Setup:** at 375×667 with six parts (seed a sixth).
  - **Measure:** the free height on Started between the parts row and **Done for now**.
  - **Decide:** the strip is `min(80, free)` px. Under 64 px, stop and report to the lead, who takes it to the owner. It never falls back to playing the reveal on Home.
- [ ] **Step 2:** Write the failing tests in `brain-started.spec.ts`:
  - `Started doesn't scroll with six parts and the strip`;
  - `the strip reveals the new light over two minutes`: with `page.clock`, `data-reveal` is 0.5 ± 0.02 at 60 s and 1 at 120 s;
  - `a reload mid-reveal resumes at the right progress` (Review Focus #7);
  - `a re-tag mid-reveal moves only that light` (Review Focus #6): tag Work, then Study. `data-reveal-part` is `study`, Home shows Study one higher, and Work is unchanged;
  - `undo removes only that start's light` (Review Focus #6);
  - `Still on the strip shows the light whole and idles the loop`;
  - `leaving Started early shows the light whole on Home`: the text equivalent counts it, and Home's canvas has no `data-reveal`;
  - `a part chip opens its card with focus trapped; Esc and Close each return focus to the chip`;
  - `the card shows counts and the focus line`: in M2, rule 5's line;
  - `Started and the card are accessible`, in light and dark.
- [ ] **Step 3:** Run `npx playwright test tests/e2e/brain-started.spec.ts`. Expected: FAIL.
- [ ] **Step 4:** Implement: the renderer work first, then the UI. The strip sits between "What is it?" and the timer's actions, with **Still** in its corner. Under a blocked chunk it shows the summary line at the same height.
- [ ] **Step 5:** Run it again, then the gate. Expected: PASS.
- [ ] **Step 6:** Commit each builder's part after its review: `feat(brain): burst and reveal on the Started strip` and `feat(app): part card and the Started strip`.

### Task 9: Settings and About

**Builder:** `ui`.

**Files:**
- Create: `src/app/screens/SettingsParts.tsx` (+ css), `src/app/actions/parts.ts`, `src/app/actions/parts.test.ts`, `src/copy/parts.ts`, `tests/e2e/parts.spec.ts`
- Modify: `src/app/routes.tsx` (`/settings/parts`), `src/app/screens/Settings.tsx`, `src/app/screens/About.tsx`, `src/copy/about.ts`, `src/copy/settings.ts` (or the module that holds Settings copy), `README.md`

**Interfaces:**
- Consumes: `addPart`, `editPart` (Task 3); `setStill`, `useStill` (7B).
- Produces:

```ts
export function addPart(d: AppDeps, label: string): Promise<PartError | undefined>;
export function renamePart(d: AppDeps, id: string, label: string): Promise<PartError | undefined>;
export function recolorPart(d: AppDeps, id: string, colour: ColourId): Promise<PartError | undefined>;
export function setPartEnabled(d: AppDeps, id: string, enabled: boolean): Promise<void>;
```

- **Exact copy** (`parts.ts`, US English):
  - `title: 'Parts'`, `intro: 'Up to six. Renaming or recoloring a part never moves its light.'`;
  - `add: 'Add a part'`, `name: 'Name'`, `color: 'Color'`, `save: 'Save'`;
  - `enabled: 'Show after a start'`, `limit: 'You have six parts, the most there can be.'`, `labelHint: '1 to 24 characters'`.
- **Preferences** is a section on `/settings` (ADR-035), headed `Preferences`, with a **Still** switch whose hint is `'Stops all motion in Brain space.'`.
- **About** gains the §16.9 paragraph verbatim, under a heading with `id="brain-space"`. The README gains the same paragraph under "Brain space".

- [ ] **Step 1:** Write the failing unit tests in `parts.test.ts`, with fake-indexeddb:
  - adding a sixth part gives region 6;
  - a seventh returns `'limit'` and writes nothing;
  - recoloring to a colour another part holds swaps the two;
  - disabling a part keeps its starts in `projectBrainSpace`.
- [ ] **Step 2:** Write the failing E2E tests in `parts.spec.ts`:
  - `a new part appears in What is it? and on Home`;
  - `renaming changes the chip and card, and the light count stays`;
  - `a disabled part leaves What is it?, and its chip and light stay on Home` (Review Focus #14);
  - `a 24-character name causes no sideways scroll at 320 px` on Home, Started, the card and Settings → Parts (Review Focus #13);
  - `Still in Preferences matches the plate`;
  - `About shows the Brain space paragraph`;
  - `Settings and Parts are accessible`, in light and dark.
- [ ] **Step 3:** Run `npx vitest run src/app/actions && npx playwright test tests/e2e/parts.spec.ts`. Expected: FAIL.
- [ ] **Step 4:** Implement. Lazy-load `/settings/parts` with `React.lazy` if the initial bundle passes 145 kB.
- [ ] **Step 5:** Run it again, then the gate. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(app): Settings → Parts, Still in Preferences, and the About paragraph`.

### Task 10: E2E and guards

**Builders:** `qa-webkit` (performance, offline, CSP) and `accessibility` (axe and keyboard).

**Files:**
- Create: `tests/e2e/brain-guards.spec.ts`, `tests/e2e/brain-perf.spec.ts`
- Modify: `tests/e2e/offline.spec.ts`, `tests/e2e/csp.spec.ts`, `docs/decisions.md` (ADR-029)

- [ ] **Step 1:** Write `brain-guards.spec.ts`:
  - `with the renderer chunk blocked, every Brain space action works` (Review Focus #8), with `serviceWorkers: 'block'` as in 7B:
    - **Actions:** Still, zoom and turn, a part chip opening its card, Settings → Parts edits, and the stuck flow to Started with the strip's text;
    - **Expected:** no console errors except the blocked request;
  - `keyboard only` (desktop project):
    - Tab reaches every chip and plate control;
    - ← → turn and + − zoom;
    - Enter opens a card and Esc closes it;
    - `S` still opens the stuck flow;
  - an axe sweep of Home, Started, the card and Settings → Parts, in light and dark.
- [ ] **Step 2:** Extend the existing specs:
  - **`offline.spec.ts`** (Chromium projects): `offline, the chunk is precached and Brain space draws`. Load the app, wait for the service worker to be ready, go offline and reload. The canvas has `data-loop`;
  - **`csp.spec.ts`:** the walk adds Home with the canvas running, zoom, a part card and the Started strip, with zero `securitypolicyviolation` events.
- [ ] **Step 3:** Write `brain-perf.spec.ts` (`iphone` project only).
  - **Setup:** seed the full fixture.
  - **Action:** drag across the plate for 5 s with moves every 16 ms.
  - **Read:** `data-draw-mean`, then assert it is at most `DRAW_MEAN_BUDGET_MS`.
- [ ] **Step 4:** Push. On the first CI run, the lead reads the logged mean and sets `DRAW_MEAN_BUDGET_MS` to twice it, rounded up to 0.5 ms. Record it in ADR-029's consequences, then push again.
- [ ] **Step 5:** Confirm CI is green on every job, and `check-bundle-size.mjs` prints the initial JS at most 150 kB and the chunk at most 30 kB. Commit: `test(e2e): Brain space guards for blocked chunk, offline, CSP and frame time`.

### Task 11: Review and acceptance

**Builder:** the lead, with `code-reviewer` and the unslop audit.

- [ ] **Step 1:** Retitle PR #2 "Milestone 2: Brain space" and write its body with the `pr` skill:
  - the summary;
  - the evidence: the gates, the bundle and chunk sizes, the draw mean, and the Review Focus rows 6–14;
  - the owner checklist below.
- [ ] **Step 2:** Run a whole-branch review with `code-reviewer`, against spec §16, ADR-021 to ADR-035 and this milestone.
  - Triage the findings with superpowers:receiving-code-review.
  - The builders fix the accepted ones, and the reviewer re-checks the fixes.
- [ ] **Step 3:** Run the unslop audit against the preview URL, from Playwright screenshots of every M2 screen. `ui` fixes the accepted findings. None may override the tokens, ADR-018, the spec's copy or the approved look.
- [ ] **Step 4: Owner acceptance on iPhone,** recorded in the PR body.
  - **On the preview URL:**
    - a start fires the burst and draws its line during the timer;
    - turning doesn't stutter;
    - **Still** stops all motion;
    - VoiceOver reads each part's counts;
    - it all works in airplane mode.
  - **After the merge, in the installed app** (once Reload is tapped on the update card): the M1 starts show as light in their parts. The preview is a separate origin, so it can't show them.
- [ ] **Step 5: Owner step.** The owner merges. Confirm the `deploy` job succeeds, and run `curl -sI https://arohexis.arohexis.workers.dev | grep -i content-security-policy` to confirm the exact CSP. Then the owner confirms the last acceptance item.
- [ ] **Step 6:** Tick M2 in the ledger on `m3-plans`, the next branch, and commit: `docs: mark milestone 2 done`.

**Acceptance (owner):**
- your M1 starts show as light in their parts;
- a start on the iPhone fires the burst and draws its line during the timer;
- turning the brain doesn't stutter;
- **Still** stops all motion;
- VoiceOver reads each part's counts;
- it all works in airplane mode.

## Milestone 3: If-then plans and reminders

**You can:** create plans ("If it's 9:00 on weekdays at my desk, then I will open the essay doc"), add each to Apple Calendar with an alarm, tap **Start now** when a plan is due, and get a short forgive-and-replan sheet when a plan slips. Each plan draws its own line in Brain space, which grows every time you start on cue.

**Branch:** `m3-plans`. **Spec:** §6.4 (plan occurrences, lapse), §8.5–8.7, §10, §16.3–16.4.

**Tasks** (expanded at milestone start):
1. `plans.ts`: `occurrencesBetween`, `occurrenceStatus` (ordered rules), `planSentence`. DST property tests in America/New_York, Europe/London, Australia/Lord_Howe and Asia/Kathmandu; nonexistent times move forward and ambiguous times take the first instance.
2. `ics.ts`: `planToIcs` with VTIMEZONE generated from offset transitions over 3 years, RRULE, VALARM, UID and SEQUENCE, CRLF, and folding at 75 octets. Tests parse the output with `ical.js` and check the alarm stays at 09:00 local across a DST change.
3. `lapse.ts`: `findLapseToRepair` (one prompt, older ones expired, 7-day window) and `applyRepair`, plus the plan commands (`startFromPlan`, `resolveOccurrence`, `repairLapse`). `openAttempt` also accepts a plan with no occurrence, for **Two minutes now?**.
4. Storage: plan CRUD through `ConfigPatch` (add, update with `editCount++`, pause), and `plans.partId`.
5. Plans list and editor screens, with the live sentence preview, an optional part, and Add to calendar (one-time import help text).
6. Home plan-due card (Start now, "I'm stuck on this") and the lapse repair sheet (focus trap, every step skippable, closing records `slipped`).
7. **Brain space with plans** (spec §16.4, §16.9):
   - plans feed `projectBrainSpace`: waiting lines are dashed with a ring, and growth comes from on-cue starts only (distinct occurrences), with strengths and labels;
   - a start made from a plan is tagged with the plan's part in the same transaction;
   - the part card lists the part's plans, with Start now while an occurrence is open and "Next: …" otherwise;
   - focus rules 1 to 4.
8. E2E: spec §13 scenarios 6 and 7, an on-cue start brightening its line, an off-cue start leaving a start line, plus axe on the new screens. Then the unslop audit.

**Acceptance (owner):**
- a weekday plan imported on the iPhone fires its alarm;
- Start now counts as a linked start and brightens its plan's line;
- a deliberately skipped plan shows one repair sheet on the next open.

## Milestone 4: Insights and the weekly check-in

**You can:** see starts per week, when you start, which feelings and parts lead to starts, which responses help, and your weekly "how automatic does starting feel" trend.

**Branch:** `m4-insights`. **Spec:** §6.4 (metrics, check-in), §8.8–8.9.

**Tasks:**
1. Metrics: `startsByWeek` (contiguous, zero weeks included), `startsByFeeling` (with "From a plan"), `startsByHour`, `startsByPart` (with "No part") and `responseStats` (`earlyDays` when n < 5). Property tests: the weekly sum equals total starts, and undone starts are never counted.
2. `checkin.ts`: SRBAI items, the period and `weekOf` rules, `isCheckinDue`, scoring and trend.
3. SVG chart components (columns, hour strip, bars, line), each with a visually hidden table and a one-sentence summary.
4. Insights screen with an empty state for fewer than 3 starts and neutral colors. Parts are shown in neutral colors, not part colours.
5. Check-in screen and Home card (7-point radio groups, Skip this week, attribution). About gains the sentence naming the check-in (spec §16.9).
6. E2E: spec §13 scenarios 3 and 8, plus axe. Then the unslop audit.

**Acceptance (owner):** the first Sunday check-in shows in the trend. Insights match a hand count of a week's starts.

## Milestone 5: Demo mode, restore and onboarding

**You can:** let anyone explore Arohexis with 10 realistic weeks of demo data that fill Brain space, restore your own data from a backup, and onboard new users, including the iPhone install guidance.

**Branch:** `m5-demo-data`. **Spec:** §7.3–7.5, §8.10 (Data), §8.11, §16.11.

**Tasks:**
1. `demo.ts`: `generateDemoData(seed, endDate, tz)` using mulberry32, with 5 named parts, §7.4's 3 plans started in weeks 1, 3 and 6, and about 80% of starts tagged (spec §16.11). Tests:
   - deterministic for a seed, 10 weeks, and the shape bands from spec §7.4;
   - every part has light, every strength from New to Well-worn appears, and a demo entered today is moving.
2. Demo database switching (`localStorage['arohexis:db']`), the Demo ribbon with Exit and Reset, and isolation from the main database.
3. Import:
   - parse and migrate (export versions 1 and 2);
   - a preview of counts;
   - an offer to export first;
   - a replace inside one transaction that rolls back on failure.
4. Delete everything, the storage persistence status, and a "Back up now" link on the check-in card after 14 days.
5. Onboarding at `/welcome`: 3 steps, with the iOS step shown only in Safari outside standalone mode, then Start fresh or Explore the demo.
6. E2E: spec §13 scenarios 9 and 10, plus axe. Then the unslop audit.

**Acceptance (owner):**
- export, delete, import on the iPhone brings back the same Insights and the same Brain space;
- a friend opening the public URL can explore a full demo brain without being able to touch real data.

## Milestone 6: Your configuration, About, v1.0

**You can:** edit feelings, responses and obstacles; set the theme, week start, check-in day and Still; and read the evidence inside the app. v1.0 meets every success criterion in spec §2.

**Branch:** `m6-config-v1`. **Spec:** §2, §8.10, §11, §16.

**Tasks:**
1. Feelings and responses editor:
   - rename, reorder, enable, add;
   - a live word count capped at 40;
   - a basis picker;
   - built-in items can't be deleted, and `other` can't be disabled.
2. Obstacles list editor. Parts have had their own editor since M2.
3. Preferences: theme (`data-theme`), `weekStartsOn`, `checkinDay`. Still has been there since M2.
4. About: the full evidence table, basis sources and SRBAI attribution, the Brain space paragraph, the version, and the build SHA.
5. Accessibility pass:
   - VoiceOver on iPhone;
   - keyboard-only on desktop;
   - 320 px reflow;
   - 200% zoom;
   - fix the findings.
6. Release:
   - README final;
   - case-study notes drawn from `decisions.md`;
   - the final unslop audit;
   - tag `v1.0.0`.

**Acceptance (owner):** every row of the spec §2 success-criteria table is checked and recorded in the v1.0 PR.

---

## Ledger

- [x] M1: The stuck button, on the iPhone
- [ ] M2: Brain space
- [ ] M3: If-then plans and reminders
- [ ] M4: Insights and the weekly check-in
- [ ] M5: Demo mode, restore and onboarding
- [ ] M6: Your configuration, About, v1.0
