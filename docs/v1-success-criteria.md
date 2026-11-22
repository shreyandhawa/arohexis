# v1.0 success criteria

One row per criterion in spec §2. Status is Met (automated), Met (manual) or Owner to confirm. Nothing is marked Met without evidence in the repository.

| Criterion | Evidence | Status |
| --- | --- | --- |
| Stuck button to running timer in at most 3 taps, no typing, no scrolling at 375×667 | `tests/e2e/stuck-flow.spec.ts`, "reaches the timer in three taps without scrolling" (iphone project runs in CI) | Met (automated) |
| Stuck flow under 30 s from tap to timer | Responses capped at 40 words: `src/copy/copy.test.ts` (the response-body word-count test). Timed on 2026-11-22 in the iOS Simulator (iPhone 18 Pro, iOS 27.2), installed from the live site: 3 taps from Light a line to the running timer in 11.3 s of wall clock, the tester's tool latency included | Met (manual) |
| Works offline after the first load | `tests/e2e/offline.spec.ts`, "works offline after first load" and "offline, the chunk is precached and Brain space draws" | Met (automated) |
| Installable on the iOS Home Screen; data survives restarts | Persistence: `tests/e2e/offline.spec.ts`, "data survives reload and a new page"; manifest: `tests/e2e/manifest.spec.ts`. On 2026-11-22 in the iOS Simulator (iPhone 18 Pro, iOS 27.2): Share, then Add to Home Screen, from the live site; it opens standalone, and a start made there was still on Home after a full shutdown and boot of the device | Met (manual) |
| WCAG 2.2 AA on every screen, light and dark | axe in E2E in both schemes: `stuck-flow.spec.ts` "stuck screens are accessible in ...", `export.spec.ts`, `demo-restore.spec.ts`, `brain-guards.spec.ts`. Keyboard, 320 px reflow and 200% zoom: `tests/e2e/a11y-pass.spec.ts`. The VoiceOver pass on iPhone is an owner check (the iOS Simulator has no VoiceOver) | Owner to confirm |
| Domain is pure and covered (no DOM lib; at least 95% line coverage on `src/domain`) | `src/domain/tsconfig.json` has no DOM lib (`npm run typecheck`). Coverage thresholds in `vitest.config.ts` (lines 95, branches 90), enforced by `npm test -- --coverage` in CI. Purity: `tests/purity/purity.test.ts` | Met (automated) |
| CI on every push; `main` deploys to a public URL | `.github/workflows/ci.yml` runs checks and E2E on every push, and deploys `main` with `wrangler deploy`. Live at https://arohexis.arohexis.workers.dev (HTTP 200 on 2026-11-13 and 2026-11-22, CSP header byte-identical to `public/_headers`) | Met (automated) |
| Demo mode shows 10 realistic weeks without touching real data | `tests/e2e/demo-restore.spec.ts`, "the demo shows ten weeks, and exiting leaves the main database unchanged" | Met (automated) |
| The owner uses it daily for 10 to 12 weeks | Starts per week and the check-in trend in Insights. This takes 10 to 12 weeks of use after release | Owner to confirm |
| Brain space turns without visible stutter on the owner's iPhone | Frame-time guard: `tests/e2e/brain-perf.spec.ts` (Apple WebKit budget 2 ms mean; CI-only budget 250 ms, ADR-029). Simulator check recorded in ADR-029. The device check is an owner check | Owner to confirm |
| Every Brain space action works with the renderer blocked | `tests/e2e/brain-guards.spec.ts`, "with the renderer chunk blocked, every Brain space action works" | Met (automated) |

## Summary

- Met (automated): 6 of 11.
- Met (manual): 2 of 11, in the iOS Simulator (the timed flow, the Home Screen install).
- Owner to confirm: 3 of 11. Two need the owner's iPhone (VoiceOver, Brain space turning). One needs 10 to 12 weeks of use.
