# Arohexis case study notes

Notes drawn from [decisions.md](decisions.md). The ADR numbers point to the full reasoning.

## The problem and the shape of the answer

Arohexis is for chronic procrastination, and it trains one thing: the moment of starting. The first decision was the screen the owner would use most. ADR-003 designs for the iPhone Home Screen first, one-handed. The spec sets a hard bar: from the stuck button to a running timer in at most 3 taps, with no typing and no scrolling at 375×667. Every later screen had to fit around that bar.

## Key decisions and why

**A start counts when Start is tapped (ADR-004).** The reward has to come right after the behavior, so counting waits for nothing. Undo covers a mistaken tap. The cost is that a count says "I began", not "I finished", and the product says so.

**Local-first, with no accounts (ADR-008, ADR-009).** Data lives in IndexedDB through Dexie. Behavior is an append-only event log with label snapshots, and configuration is editable records. Every insight is a pure projection over events. This made export, import and demo data simple, and it kept private data off any server. The cost is no sync between devices, which is a stated non-goal.

**Hosting on Cloudflare Workers Static Assets (ADR-007).** The app needs real control of headers (a strict CSP, no-cache for the service worker), SPA routing and branch previews. GitHub Pages cannot set headers. Netlify and Vercel had pricing limits that did not fit.

**Hand-written CSS tokens (ADR-015).** The brief asked for tokens first and a distinctive look, so plain custom properties plus CSS Modules won over Tailwind. The trade-off is more CSS written by hand, in return for exact control of themes and motion.

**Honest evidence (ADR-010).** The original brief claimed that CBT and if-then plans had the best trial support, and cited a paper that does not say so. The wording was softened, the right source was cited for if-then plans, and every claim ships with its caveat. The two-minute start is labeled as an untested technique.

**Brain space (ADR-021 to ADR-035).** The main visual draws starts as lines of light in a brain-shaped plate. Lines grow only from on-cue starts (ADR-024), because a stable cue is what the evidence points to. Nothing is removed, so the picture never punishes a quiet week. The geometry is generated locally from a seed (ADR-028). Every action also works with the canvas blocked (ADR-033), which is tested.

## What changed along the way

**ADR-029, the renderer.** A spike compared canvas 2D, raw WebGL2 and OGL on WebKit with the exact CSP. All three held the frame budget. Canvas 2D won on look (no white hotspots at joints), size, and because it does not depend on GPU WebGL. The spike was not the end of it. In M2 Task 7C, the iPhone E2E tests stopped passing in CI, because GitHub's Linux WebKit uses software raster. A full redraw there took 0.5 to 1.2 seconds, against 4 to 6 ms on macOS WebKit. The finding was that CI's WebKit is not the iPhone. Two things followed. The tests may no longer depend on a redraw finishing inside a frame budget. And that run exposed a real bug: the cached layer was redrawing on every renderer update, so it now redraws only when the drawn scene changes.

**R40, the frame-time guard.** The first guard threshold came from Apple WebKit: the drag mean was 0.66 to 0.8 ms, so the budget is 2 ms. CI has its own looser guard, 250 ms, because its first run measured 88 to 103 ms. The guard stays honest, because each number says where it was measured. The cost is that CI cannot catch a small regression on the device.

**R44, plan lapses.** Plans now carry `activeSince`, and lapses count only occurrences after the last resume or schedule change. The point is that a pause or a schedule change never counts earlier occurrences against the plan, in keeping with the product's calm tone.

## Trade-offs worth naming

- **Device proof is manual.** Automated tests cover behavior. Smoothness on an iPhone and the 30-second flow need a person with the phone, so those checks are recorded as owner checks.
- **Simulator in place of a device.** The M2 renderer check ran in the iOS Simulator by the owner's choice. It runs on the Mac, so it ranks options and does not predict the phone.
- **No comparisons between weeks.** Insights show starts per week and the check-in trend, but never compute streaks, completions or week-over-week change. This is a product rule, and it limits what the charts can say.
- **A small bundle.** The initial bundle stays under 150 kB gzip, and Brain space loads lazily with its own 30 kB budget.
- **Copy as code.** Every user-facing string lives in one place and a test enforces the banned words, the no-exclamation rule and the 40-word cap. That makes copy changes slower and the tone consistent.
