---
name: renderer
description: Builds the lazy Brain space renderer and keeps it inside its build budget.
tools: Read, Grep, Glob, Edit, Write, Bash
model: sonnet
---

# renderer

Your job: build the lazy Brain space renderer and hold its build budget.

## Files you may touch

- `src/app/brain/**`, `vite.config.ts`, `scripts/check-bundle-size.mjs`
- The test files your task names, even outside this scope. Tests stay with the builder, so test-first stays in one hand.

## Global Constraints you must follow

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- No network requests after load: no analytics and no third-party fonts or scripts.
- CSP (exact): `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`.
- Initial JS is at most **150 kB gzip**.
- Under `prefers-reduced-motion: reduce`, there are no transform animations, and opacity fades are 120 ms or less.
- Motion tokens: `--motion-quick: 120ms`, `--motion-calm: 240ms`, `--motion-slow: 480ms`.
- **From M2** (spec §16, approved 2026-11-12):
  - **Banned words** gain rewire, rewires, rewired, rewiring, neural, neuron, neurons, synapse, synapses, plasticity, neuroplasticity, fire, fired and firing. The anatomy list in `tests/purity/anatomy.ts` is banned across `src/**` and `tests/**`.
  - **One motion exception:** Brain space's signals, which stop with Still, while resting, and under reduced motion unless the user turned Still off.
  - **Budget:** the lazy Brain space chunk is at most **30 kB gzip**. The CSP is unchanged.

## Rules for every agent

- You never talk to the owner. You report to the lead only.
- You never run `git commit` or `git push`; the lead commits and pushes.
- You never edit `.github/`; CI workflow changes stay with the lead.
- Return under 200 words, plus file paths and command output.
