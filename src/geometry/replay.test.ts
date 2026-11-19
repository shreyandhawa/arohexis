import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { foldAttempts } from '../domain/attempts';
import { projectAt, projectBrainSpace, replayMoments, type BrainLine } from '../domain/brainSpace';
import type { Part } from '../domain/config';
import { arbFlow } from '../domain/testing/arbitraries';
import { assignFibres, type Placement } from './assign';
import { buildField, regionKey } from './field';

const field = buildField();

const place = (lines: readonly BrainLine[], parts: readonly Part[]) =>
  assignFibres(
    lines.map((l) => ({
      id: l.id,
      kind: l.kind,
      partId: l.partId,
      order: l.order,
      waiting: l.kind === 'plan' && !l.everStarted,
    })),
    field,
    (id) => regionKey(parts.find((p) => p.id === id)?.region ?? null),
  );

describe('replay keeps light in place', () => {
  it('every line at t sits where it sits today', () => {
    fc.assert(
      fc.property(arbFlow(), fc.nat(), ({ events, plans, parts, now }, pick) => {
        const attempts = foldAttempts(events);
        const moments = replayMoments(attempts);
        if (moments.length === 0) return;
        const t = moments[pick % moments.length]!;
        const final = place(projectBrainSpace(attempts, plans, parts, now).lines, parts);
        const frame = projectAt(attempts, parts, t).lines;
        const here = place(frame, parts);
        for (const line of frame) {
          const today: Placement | undefined = final.get(line.id);
          // A line missing today is the stale-tag edge (ADR-035); skip it.
          if (today === undefined) continue;
          expect(here.get(line.id)).toEqual(today);
        }
      }),
    );
  });

  it('lines and plan strength never shrink as t grows', () => {
    fc.assert(
      fc.property(arbFlow(), ({ events, parts }) => {
        const attempts = foldAttempts(events).filter((a) => !a.undone);
        let count = 0;
        const strength = new Map<string, number>();
        for (const t of replayMoments(attempts)) {
          const lines = projectAt(attempts, parts, t).lines;
          expect(lines.length).toBeGreaterThanOrEqual(count);
          count = lines.length;
          for (const l of lines) {
            if (l.kind !== 'plan') continue;
            expect(l.onCueStarts).toBeGreaterThanOrEqual(strength.get(l.id) ?? 0);
            strength.set(l.id, l.onCueStarts);
          }
        }
      }),
    );
  });
});
