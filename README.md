# Arohexis

Arohexis is a local-first, installable web app for chronic procrastination. It trains the moment of starting.

When you are stuck, you tap one button and name the feeling. Arohexis shows a short response matched to that feeling, and you take a two-minute first step. Each start is rewarded right away.

## Install on iPhone

1. Open the app's address in Safari.
2. Tap Share, then Add to Home Screen.
3. Open Arohexis from the Home Screen. It works offline after the first load.

Android and desktop browsers can install it too, from the browser's install option.

## What it is and isn't

Arohexis is a stuck button with a timer, a reward and a record of what helped. It also has Brain space, if-then plans, Insights and a weekly check-in. Feelings, responses, obstacles and parts are all editable.

It is not a task manager. It has no task lists, due dates or completion tracking. It has no accounts, no cloud sync, no AI chat, no social features and no app or site blocking.

"Training" here means ordinary learning: the same cue, a new response, an immediate reward, repeated until it is automatic. Arohexis makes no claims about brain change and does not diagnose or treat any condition.

## Local-first and privacy

All data stays on your device, in the browser's IndexedDB. There are no accounts, no analytics, no error reporting service, and no third-party fonts or scripts. The app makes no requests to any other site, and a Content Security Policy enforces that. Back up or move your data with the export and import in Settings. The repository never contains real user data.

## Brain space

Brain space draws your starts as lines of light in the shape of a brain. It's a picture of your starts, not a scan, and the shape is the same for everyone. Arohexis makes no claim that your brain changes. Still turns the motion off.

## Demo

Explore the demo from the Welcome screen to see ten weeks of made-up data. It uses a separate database and never touches your own.

## Why it works

Arohexis states only what these sources support, with the caveats shown.

**Procrastination is mostly about avoiding the bad feeling a task brings: a short-term mood repair.**

- Sirois, F. & Pychyl, T. (2013). Procrastination and the priority of short-term mood regulation. _Social and Personality Psychology Compass_, 7(2), 115-127. doi:10.1111/spc3.12011
- APA _Speaking of Psychology_, "Why we procrastinate and what to do about it," with Fuschia Sirois (2022): https://www.apa.org/news/podcasts/speaking-of-psychology/procrastinate

Caveat: theoretical review. The podcast is an interview, not a study.

**People discount future effort more steeply than future reward.**

- Le Bouc, R. & Pessiglione, M. (2022). A neuro-computational account of procrastination behavior. _Nature Communications_, 13, 5639. https://doi.org/10.1038/s41467-022-33119-w

Caveat: small lab study (N=51).

**Psychological treatments show small benefits for procrastination; CBT looks promising in a few trials.**

- Rozental, A. et al. (2018). Targeting procrastination using psychological treatments: a systematic review and meta-analysis. _Frontiers in Psychology_, 9, 1588. https://www.frontiersin.org/article/10.3389/fpsyg.2018.01588/full

Caveat: overall g=0.34. The CBT estimate (g=0.55) rests on 3 studies, and the authors call CBT's superiority "unclear".

**If-then plans help people act on their goals.**

- Gollwitzer, P. M. & Sheeran, P. (2006). Implementation intentions and goal achievement: a meta-analysis of effects and processes. _Advances in Experimental Social Psychology_, 38, 69-119. doi:10.1016/S0065-2601(06)38002-1

Caveat: d=.65 across 94 tests, on goal attainment in general rather than procrastination.

**Forgiving yourself for procrastinating is associated with less procrastination later.**

- Wohl, M. J. A., Pychyl, T. A. & Bennett, S. H. (2010). I forgive myself, now I can study. _Personality and Individual Differences_, 48(7), 803-808. https://doi.org/10.1016/j.paid.2010.01.029

Caveat: correlational; one student sample.

**In one review, habits took a median of about two months (59-66 days) to form, with a range of 4-335 days.**

- Singh, Murphy, Maher & Smith (2024). Time to form a habit: a systematic review and meta-analysis of health behaviour habit formation and its determinants. _Healthcare_, 12(23), 2488. https://doi.org/10.3390/healthcare12232488

Caveat: only 4 studies reported timing; a stable cue is thought to help but was not tested.

**Naming your feelings and breaking a task into a first step made people feel more likely to start.**

- Garg, Shelat & Schooler (2025). "Now I feel like I'm going to get to it soon…" _BMC Psychology_, 13, 1158 (RCT, N=1,035).

Caveat: measured self-reported likelihood, not actual completion.

**The weekly check-in uses a published habit measure.**

- Gardner, B., Abraham, C., Lally, P. & de Bruijn, G.-J. (2012). Towards parsimony in habit measurement: the Self-Report Behavioural Automaticity Index. _IJBNPA_, 9, 102. doi:10.1186/1479-5868-9-102 (CC BY)

Caveat: self-report.

**The two-minute start.** No source. It is presented as a practical technique. No trial has tested it.

**Correction to the original brief.** The brief said "CBT-based treatment and if-then plans have the best trial support" and cited Rozental et al. (2018). That paper doesn't support the claim: it found small effects overall and did not pool implementation intentions. We use the softer wording above and cite Gollwitzer & Sheeran (2006) for if-then plans. See ADR-010 in [docs/decisions.md](docs/decisions.md).

## Not medical advice

> Arohexis is a self-help tool, not medical advice. It doesn't diagnose or treat ADHD, depression, anxiety or any other condition. If procrastination is seriously affecting your life, consider talking to a qualified professional.

## The stack

- React 19, Vite 8 and strict TypeScript 6, built as an offline-first PWA.
- Dexie for IndexedDB, Valibot for import validation, and hand-written CSS tokens with CSS Modules.
- Brain space draws with canvas 2D and no library.
- `src/domain` is pure TypeScript with no React, Dexie, DOM or network. Its own `tsconfig` has no DOM lib, and ESLint bans UI and storage imports there.
- `src/storage` holds the Dexie database and the repositories. `src/app` holds routes, screens and actions. `src/copy` holds every user-facing string, and a test enforces the copy rules.

The full design is in [docs/spec.md](docs/spec.md).

## Develop and test

Use the Node version in `.nvmrc` (26).

```sh
npm install
npm run dev
```

| Script                               | What it does                                   |
| ------------------------------------ | ---------------------------------------------- |
| `npm run dev`                        | Start the Vite dev server                      |
| `npm run build`                      | Type-check and build for production            |
| `npm run preview`                    | Serve the production build locally             |
| `npm run lint`                       | Run ESLint                                     |
| `npm run format:check`               | Check formatting with Prettier                 |
| `npm run typecheck`                  | Type-check the app and the pure domain layer   |
| `npm test`                           | Run the Vitest unit tests                      |
| `npm run test:watch`                 | Run Vitest in watch mode                       |
| `npm run e2e`                        | Run the Playwright end-to-end tests            |
| `node scripts/check-bundle-size.mjs` | Check the built bundle against its size budget |

Locally, run the end-to-end tests on Android and desktop:

```sh
npx playwright test --project=android --project=desktop
```

The iPhone project (WebKit) runs in CI. CI's Linux WebKit is not an iPhone, so timings there say nothing about the device. See ADR-029 in [docs/decisions.md](docs/decisions.md).

## Deploy

Every push to `main` that passes CI deploys to Cloudflare Workers Static Assets with `wrangler deploy`. Pull requests get preview URLs. The deploy settings are in `wrangler.jsonc` and `.github/workflows/ci.yml`.

## Licence

No licence file is present, so all rights are reserved.

## Project docs

- [docs/spec.md](docs/spec.md): the design spec.
- [docs/decisions.md](docs/decisions.md): the decision log (ADRs).
- [docs/plan.md](docs/plan.md): the implementation plan and milestones.
- [docs/case-study.md](docs/case-study.md): the decisions and what changed.
- [docs/v1-success-criteria.md](docs/v1-success-criteria.md): the v1.0 success criteria and their evidence.
