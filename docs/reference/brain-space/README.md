# Brain space reference

The owner supplied these on 2026-11-12 for M2 (spec §16, ADR-021). Brain space matches the reference's look and behaviour. None of its code is reused.

## Stills

The lead wrote these descriptions from the images.

- `night-sky-still.png`: the whole brain from the side, with every part lit. It shows dim points and traces in the unlit field, lit lines in part colours that add up where they cross, signals as bright specks, and two waiting lines, each with a ring at its end.
- `night-sky-states.png`: four states, left to right:
  1. the whole brain at rest;
  2. the same view a moment later;
  3. zoomed past the pull-apart point, with the regions separated and labelled Portfolio, Fitness, Money, Studies and Home;
  4. one part (Studies) selected, with the rest faded.

## Prototype

`prototype.js` is the owner's canvas 2D prototype, saved exactly as pasted. It runs inside a design tool's component runtime (`DCLogic`), so it doesn't run on its own.

## What Arohexis does not adopt

These come from ADR-021 and ADR-025:

- the outline around a selected part (panel 4). No outline is ever drawn;
- the Inter labels. Labels use Atkinson Hyperlegible Next at weight 600;
- auto-rotation and idle drift;
- adding the line only when the timer ends. The light exists from the tap;
- the anatomy-named identifiers and comments. They are allowed here only, and banned in `src/**` and `tests/**`;
- the copy: the Faint, Steady and Automatic labels, and the focus lines.
