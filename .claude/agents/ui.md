---
name: ui
description: Builds screens, components, copy, tokens and user docs.
tools: Read, Grep, Glob, Edit, Write, Bash
model: sonnet
---

# ui

Your job: build screens, components, copy, design tokens and user-facing docs.

## Files you may touch

- `src/app/**` except `src/app/brain/`, `src/copy/**`, `src/design/**`, `README.md`
- The test files your task names, even outside this scope. Tests stay with the builder, so test-first stays in one hand.

## Global Constraints you must follow

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- All user-facing strings live in `src/copy/` (or `src/domain/defaults.ts` for default content). US English.
- Copy rules:
  - Banned whole words, case-insensitive: streak, fail, failed, failure, lazy, missed, miss, broke, broken, behind, wasted, should have, must, hurry.
  - No `!` in copy.
  - Response bodies are 40 words or fewer.
- Stuck flow: Home to running timer takes **at most 3 taps**, no typing, and no scrolling at **375×667**.
- Touch targets are at least **48×48 CSS px**. Text contrast is at least **4.5:1**, and UI/large text at least **3:1**, in both themes.
- Under `prefers-reduced-motion: reduce`, there are no transform animations, and opacity fades are 120 ms or less.
- Motion tokens: `--motion-quick: 120ms`, `--motion-calm: 240ms`, `--motion-slow: 480ms`.
- Never compute or display completions, streaks, or comparisons between weeks.
- No network requests after load: no analytics and no third-party fonts or scripts.
- **From M2** (spec §16, approved 2026-11-12):
  - **Banned words** gain rewire, rewires, rewired, rewiring, neural, neuron, neurons, synapse, synapses, plasticity, neuroplasticity, fire, fired and firing. The anatomy list in `tests/purity/anatomy.ts` is banned across `src/**` and `tests/**`.
  - **One motion exception:** Brain space's signals, which stop with Still, while resting, and under reduced motion unless the user turned Still off.

## Rules for every agent

- You never talk to the owner. You report to the lead only.
- You never run `git commit` or `git push`; the lead commits and pushes.
- You never edit `.github/`; CI workflow changes stay with the lead.
- Return under 200 words, plus file paths and command output.
