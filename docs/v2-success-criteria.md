# v2.0 success criteria

One row per v2 "Night sky" check in the approved plan (`docs/plan.md`, v2 section), ADR-036 and ADR-037. Status is Met (automated), Met (manual) or Owner to confirm. Nothing is marked Met without evidence in the repository.

| Criterion | Evidence | Status |
| --- | --- | --- |
| Dark first: a first visit, a new record and the demo are dark; Light and System stay in Settings | `tests/e2e/demo-restore.spec.ts`, "a first visit is dark on any device until a theme is chosen"; `tests/e2e/config.spec.ts`, "the theme switch sets data-theme". Start fresh writes Dark in `src/app/screens/Welcome.tsx`, and the demo record is Dark in `src/domain/demo.ts` | Met (automated) |
| Contrast holds in both themes, the dark surfaces included | `src/design/tokens.test.ts`, "text pairs meet 4.5:1" and "UI pairs meet 3:1"; axe in E2E in both schemes, including `replay.spec.ts` "Replay is accessible in ..." and `demo-restore.spec.ts` "/welcome is accessible in ..." | Met (automated) |
| WCAG 2.2 AA on every screen, light and dark | The axe and contrast rows above, and `tests/e2e/a11y-pass.spec.ts` (keyboard, 320 px reflow, 200% zoom). The VoiceOver pass on iPhone is an owner check | Owner to confirm |
| The stuck flow still reaches the timer in 3 taps, with no typing or scrolling at 375×667 | `tests/e2e/stuck-flow.spec.ts`, "reaches the timer in three taps without scrolling" (the iphone project runs in CI) | Met (automated) |
| At 64rem and wider, Home is a stage and a rail | `tests/e2e/home.spec.ts`, "desktop home is a stage and a rail with no scroll"; `docs/media/home-desktop.png` | Met (automated) |
| The plate glows and turns without visible stutter on the owner's iPhone | The glow pass in `src/app/brain/brain.ts` is skipped on drag and ease frames. Frame-time guard: `tests/e2e/brain-perf.spec.ts` (ADR-029). The device check is the owner's | Owner to confirm |
| Insights in light: charts in the plate's language, part bars in part colours | `src/app/charts/` and `src/app/screens/Insights.tsx`; `tests/e2e/insights.spec.ts`, "a start tagged with a part appears under Parts in Insights" and the axe tests in both schemes. The look was judged at the M11 design gate from `docs/media/insights-*.png` | Met (manual) |
| Replay is cumulative: it scrubs by keyboard, Play runs once and stops, and there is no Play under Still or reduced motion | `tests/e2e/replay.spec.ts`: "the keyboard scrubs back to the first start and forward again", "Play runs once to the end and stops", "under reduced motion there is no Play, and scrubbing still works" | Met (automated) |
| A Replay frame keeps every line on the fibre it has today | `src/geometry/replay.test.ts`, "every line at t sits where it sits today" and "lines and plan strength never shrink as t grows"; `src/domain/brainSpace.test.ts`, "projectAt at the last moment matches the whole picture" | Met (automated) |
| The Welcome hero plays the demo once, then rests; under reduced motion it shows the final frame; it writes no database | `tests/e2e/demo-restore.spec.ts`, "the Welcome hero plays without touching any database" and "with reduced motion › the hero rests at once and stays at rest" | Met (automated) |
| Replay and the Welcome hero work with the renderer chunk blocked | `tests/e2e/replay.spec.ts`, "with the renderer chunk blocked › Replay still scrubs"; `tests/e2e/demo-restore.spec.ts`, "with the renderer chunk blocked › the hero keeps its label, Next and the demo still work" | Met (automated) |
| Budgets hold: initial JS at most 150 kB gzip, the Brain space chunk at most 30 kB | `node scripts/check-bundle-size.mjs` in CI: 149.3 kB and 11.0 kB at v2.0.0. Replay and the hero load on demand | Met (automated) |
| The CSP is unchanged, with no inline scripts or styles | `tests/config/headers.test.ts`; `tests/e2e/csp.spec.ts` | Met (automated) |
| No streaks, completions or comparisons between weeks; the copy rules hold | `src/copy/copy.test.ts`, which also scans the README. Replay's copy is cumulative only (`src/copy/brain.ts`) | Met (automated) |
| A shared link shows the demo brain | Open Graph tags in `index.html`; `public/og.png` at 1200×630. The absolute image URL serves only after a merge deploys `main`; check it then with a link-preview tool | Owner to confirm |

## Summary

- Met (automated): 11 of 15.
- Met (manual): 1 of 15.
- Owner to confirm: 3 of 15. Two need the owner's iPhone (VoiceOver, the plate turning). One needs the production deploy (the link preview).
