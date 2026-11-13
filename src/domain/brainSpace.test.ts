import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Attempt } from './attempts';
import { foldAttempts, isCountedStart } from './attempts';
import {
  type BrainLine,
  RESTING_AFTER_MS,
  isOnCue,
  lightPartOf,
  partOfStart,
  projectBrainSpace,
  strengthFor,
  summaryLines,
} from './brainSpace';
import type { ColourId, Part, Plan, RegionId } from './config';
import { arbFlow } from './testing/arbitraries';

const NY = 'America/New_York';
const T0 = Date.UTC(2026, 10, 1);
const MIN = 60_000;

const part = (id: string, n: number): Part => ({
  id,
  label: id,
  order: n,
  enabled: true,
  colour: n as ColourId,
  region: n as RegionId,
});
const PARTS = [part('work', 1), part('home', 2)];

const plan = (id: string, over: Partial<Plan> = {}): Plan => ({
  id,
  place: 'desk',
  firstAction: 'open it',
  time: '09:00',
  days: [1],
  graceMin: 30,
  active: true,
  createdAt: T0 - 1000,
  editCount: 0,
  ...over,
});

type Spec = {
  id: string;
  openedAt: number;
  startAt?: number;
  backfilled?: boolean;
  undone?: boolean;
  undoneAt?: number;
  tags?: [string, number][];
  planId?: string;
  occurrence?: string;
};
function att(s: Spec): Attempt {
  const tags = (s.tags ?? []).map(([id, at]) => ({ id, label: id, at }));
  const last = tags[tags.length - 1];
  return {
    id: s.id,
    openedAt: s.openedAt,
    tz: NY,
    source: s.planId ? 'plan' : 'stuck',
    ...(s.planId !== undefined && { planId: s.planId }),
    ...(s.occurrence !== undefined && { occurrence: s.occurrence }),
    ...(s.startAt !== undefined && {
      start: { at: s.startAt, tz: NY, backfilled: s.backfilled ?? false },
    }),
    undone: s.undone ?? false,
    ...(s.undoneAt !== undefined && { undoneAt: s.undoneAt }),
    ...(last && { part: { id: last.id, label: last.label } }),
    tags,
    dismissed: false,
  };
}
/** A started attempt at minute `m`, tagged at the same minute. */
const started = (id: string, m: number, tag?: string, extra: Partial<Spec> = {}): Attempt =>
  att({
    id,
    openedAt: T0 + m * MIN,
    startAt: T0 + m * MIN + 1,
    ...(tag !== undefined && { tags: [[tag, T0 + m * MIN + 2]] }),
    ...extra,
  });
const onCue = (id: string, m: number, planId: string, occ: string, tag?: string): Attempt =>
  started(id, m, tag, { planId, occurrence: occ });

const planLines = (lines: BrainLine[]) =>
  lines.filter((l): l is Extract<BrainLine, { kind: 'plan' }> => l.kind === 'plan');
const startLines = (lines: BrainLine[]) =>
  lines.filter((l): l is Extract<BrainLine, { kind: 'start' }> => l.kind === 'start');

describe('helpers', () => {
  it('strengthFor steps', () => {
    expect(strengthFor(0)).toBe('waiting');
    expect(strengthFor(1)).toBe(1);
    expect(strengthFor(4)).toBe(1);
    expect(strengthFor(5)).toBe(2);
    expect(strengthFor(14)).toBe(2);
    expect(strengthFor(15)).toBe(3);
    expect(strengthFor(39)).toBe(3);
    expect(strengthFor(40)).toBe(4);
    expect(strengthFor(500)).toBe(4);
  });

  it('isOnCue needs a counted start with a plan and an occurrence', () => {
    expect(isOnCue(onCue('a', 1, 'p', 'o'))).toBe(true);
    expect(isOnCue(started('a', 1))).toBe(false);
    expect(isOnCue(started('a', 1, undefined, { planId: 'p' }))).toBe(false);
    expect(
      isOnCue(started('a', 1, undefined, { planId: 'p', occurrence: 'o', undone: true })),
    ).toBe(false);
    expect(isOnCue(att({ id: 'a', openedAt: 0, planId: 'p', occurrence: 'o' }))).toBe(false);
  });

  it('partOfStart is the latest tag or null', () => {
    expect(partOfStart(started('a', 1))).toBeNull();
    expect(
      partOfStart(
        att({
          id: 'a',
          openedAt: 0,
          tags: [
            ['x', 1],
            ['y', 2],
          ],
        }),
      ),
    ).toBe('y');
  });

  it('lightPartOf takes the latest tag made by the settling time', () => {
    const a = att({
      id: 'a',
      openedAt: 0,
      startAt: 1,
      tags: [
        ['x', 10],
        ['y', 20],
      ],
    });
    expect(lightPartOf(a, undefined)).toBe('y');
    expect(lightPartOf(a, 20)).toBe('y');
    expect(lightPartOf(a, 19)).toBe('x');
    expect(lightPartOf(a, 9)).toBeNull();
    expect(lightPartOf(att({ id: 'b', openedAt: 0 }), 5)).toBeNull();
  });
});

describe('projectBrainSpace', () => {
  it('an M1 history becomes start lines and sparks', () => {
    const attempts = [
      started('a1', 1, 'work'),
      started('a2', 10, 'work'),
      started('a3', 20, 'work'),
      started('a4', 30),
      started('a5', 40, 'other-task'),
      started('a6', 50, undefined, { undone: true }),
    ];
    const s = projectBrainSpace(attempts, [], PARTS, T0 + 60 * MIN);
    const starts = startLines(s.lines);
    expect(starts).toHaveLength(6);
    expect(starts.filter((l) => l.partId === 'work')).toHaveLength(3);
    expect(starts.filter((l) => l.partId === null && !l.undone)).toHaveLength(2);
    const undone = starts.filter((l) => l.undone);
    expect(undone).toHaveLength(1);
    expect(undone[0]?.partId).toBeNull();
    expect(s.parts).toEqual([
      { partId: 'work', starts: 3, planLines: 0, startLines: 3 },
      { partId: 'home', starts: 0, planLines: 0, startLines: 0 },
      { partId: null, starts: 2, planLines: 0, startLines: 2 },
    ]);
    expect(s.totalStarts).toBe(5);
    expect(summaryLines(s)).toBe(3);
  });

  it('marks start lines settled once a later attempt opens', () => {
    const s = projectBrainSpace(
      [started('a1', 1, 'work'), started('a2', 5, 'work')],
      [],
      PARTS,
      T0 + 9 * MIN,
    );
    expect(startLines(s.lines).map((l) => [l.id, l.settled])).toEqual([
      ['a1', true],
      ['a2', false],
    ]);
  });

  it('ignores attempts without a start', () => {
    const s = projectBrainSpace([att({ id: 'a', openedAt: T0 })], [], PARTS, T0);
    expect(s.lines).toEqual([]);
    expect(s.parts.at(-1)?.partId).toBe('home');
  });

  it('each occurrence counts once', () => {
    const attempts = [
      onCue('a1', 1, 'p', 'o1', 'work'),
      onCue('a2', 5, 'p', 'o1', 'work'),
      onCue('a3', 9, 'p', 'o2', 'work'),
    ];
    const s = projectBrainSpace(attempts, [plan('p')], PARTS, T0 + 20 * MIN);
    const [line] = planLines(s.lines);
    expect(line).toMatchObject({ id: 'p:work', onCueStarts: 2, strength: 1, everStarted: true });
    expect(startLines(s.lines).map((l) => l.id)).toEqual(['a2']);
    expect(s.totalStarts).toBe(3);
  });

  it('a later counted start replaces an undone first one for the occurrence', () => {
    const attempts = [onCue('a1', 1, 'p', 'o1', 'work'), onCue('a2', 5, 'p', 'o1', 'work')].map(
      (a, i) => (i === 0 ? { ...a, undone: true } : a),
    );
    const s = projectBrainSpace(attempts, [plan('p')], PARTS, T0 + 20 * MIN);
    expect(planLines(s.lines)[0]).toMatchObject({ onCueStarts: 1, order: T0 + MIN + 1 });
    expect(startLines(s.lines)).toEqual([]);
  });

  it('an undone start after the occurrence is on cue stays as an undone start line', () => {
    const attempts = [
      onCue('a1', 1, 'p', 'o1', 'work'),
      { ...onCue('a2', 5, 'p', 'o1', 'home'), undone: true },
    ];
    const s = projectBrainSpace(attempts, [plan('p')], PARTS, T0 + 20 * MIN);
    expect(planLines(s.lines).map((l) => l.id)).toEqual(['p:work']);
    expect(startLines(s.lines)).toMatchObject([{ id: 'a2', undone: true }]);
  });

  it('a late start does not take the occurrence from a settled one', () => {
    // A1 opened first, but its start arrives after A2's (second tab, or Back).
    const a1 = att({
      id: 'a1',
      openedAt: T0 + MIN,
      startAt: T0 + 20 * MIN,
      planId: 'p',
      occurrence: 'o',
    });
    const a2 = onCue('a2', 5, 'p', 'o', 'work');
    const s = projectBrainSpace([a1, a2], [plan('p')], PARTS, T0 + 30 * MIN);
    expect(planLines(s.lines)).toMatchObject([{ id: 'p:work', onCueStarts: 1 }]);
    expect(startLines(s.lines)).toMatchObject([{ id: 'a1', partId: null, undone: false }]);
  });

  it('a stale undo of the holder does not promote a later start', () => {
    const a1 = onCue('a1', 1, 'p', 'o', 'work');
    const a2 = onCue('a2', 5, 'p', 'o', 'work');
    const undone = { ...a1, undone: true, undoneAt: T0 + 100 * MIN };
    const s = projectBrainSpace([undone, a2], [plan('p')], PARTS, T0 + 200 * MIN);
    expect(planLines(s.lines)).toMatchObject([
      { id: 'p:work', onCueStarts: 0, strength: 'waiting', order: a1.start?.at, everStarted: true },
    ]);
    expect(startLines(s.lines)).toMatchObject([{ id: 'a2', undone: false }]);
  });

  it('undo then retry still earns the occurrence', () => {
    const a1 = { ...onCue('a1', 1, 'p', 'o', 'work'), undone: true, undoneAt: T0 + 2 * MIN };
    const a2 = onCue('a2', 5, 'p', 'o', 'work');
    const s = projectBrainSpace([a1, a2], [plan('p')], PARTS, T0 + 20 * MIN);
    expect(planLines(s.lines)).toMatchObject([
      { id: 'p:work', onCueStarts: 1, order: a1.start?.at, everStarted: true },
    ]);
    expect(startLines(s.lines)).toEqual([]);
  });

  it('a start undone after another held the occurrence is an undone start line', () => {
    const a1 = onCue('a1', 1, 'p', 'o', 'work');
    const a2 = { ...onCue('a2', 5, 'p', 'o', 'work'), undone: true, undoneAt: T0 + 6 * MIN };
    const s = projectBrainSpace([a1, a2], [plan('p')], PARTS, T0 + 20 * MIN);
    expect(planLines(s.lines)).toMatchObject([{ id: 'p:work', onCueStarts: 1 }]);
    expect(startLines(s.lines)).toMatchObject([{ id: 'a2', undone: true }]);
  });

  it('breaks start-time ties by attempt id', () => {
    const b = att({ id: 'b', openedAt: T0, startAt: T0 + MIN, planId: 'p', occurrence: 'o' });
    const a = att({ id: 'a', openedAt: T0 + 1, startAt: T0 + MIN, planId: 'p', occurrence: 'o' });
    const s = projectBrainSpace([b, a], [plan('p')], PARTS, T0 + 20 * MIN);
    expect(startLines(s.lines).map((l) => l.id)).toEqual(['b']);
  });

  it('counts waiting lines of both kinds in planLines, and not hidden ones', () => {
    const undoneOnly = {
      ...onCue('a1', 1, 'p', 'o', 'work'),
      undone: true,
      undoneAt: T0 + 2 * MIN,
    };
    const s = projectBrainSpace(
      [undoneOnly],
      [plan('p'), plan('q', { partId: 'work' }), plan('r', { active: false, partId: 'work' })],
      PARTS,
      T0 + 20 * MIN,
    );
    expect(s.lines.map((l) => l.id).sort()).toEqual(['p:work', 'q:work']);
    expect(s.parts[0]).toMatchObject({ partId: 'work', planLines: 2 });
  });

  it('an active plan with no on-cue start waits', () => {
    const s = projectBrainSpace([], [plan('p', { partId: 'work' })], PARTS, T0);
    expect(s.lines).toEqual([
      {
        kind: 'plan',
        id: 'p:work',
        planId: 'p',
        partId: 'work',
        onCueStarts: 0,
        strength: 'waiting',
        order: T0 - 1000,
        everStarted: false,
        hidden: false,
      },
    ]);
    expect(summaryLines(s)).toBe(0);
  });

  it('a waiting plan without a part, or with an unknown one, waits in the core', () => {
    const s = projectBrainSpace([], [plan('p'), plan('q', { partId: 'ghost' })], PARTS, T0);
    expect(s.lines.map((l) => l.id)).toEqual(['p:core', 'q:core']);
    expect(planLines(s.lines).every((l) => l.partId === null)).toBe(true);
  });

  it('a paused plan with no on-cue start shows nothing', () => {
    const s = projectBrainSpace([], [plan('p', { active: false })], PARTS, T0);
    expect(s.lines).toEqual([]);
  });

  it('a paused plan keeps its line', () => {
    const attempts = [onCue('a1', 1, 'p', 'o1', 'work')];
    const s = projectBrainSpace(attempts, [plan('p', { active: false })], PARTS, T0 + 5 * MIN);
    expect(planLines(s.lines)[0]).toMatchObject({ onCueStarts: 1, strength: 1, hidden: false });
  });

  it('a plan that no longer exists keeps its line', () => {
    const s = projectBrainSpace([onCue('a1', 1, 'gone', 'o1', 'work')], [], PARTS, T0 + 5 * MIN);
    expect(planLines(s.lines)[0]).toMatchObject({ id: 'gone:work', onCueStarts: 1 });
  });

  it("changing a plan's part starts a new line", () => {
    const attempts = [
      onCue('a1', 1, 'p', 'o1', 'work'),
      onCue('a2', 10, 'p', 'o2', 'home'),
      onCue('a3', 20, 'p', 'o3', 'work'),
    ];
    const s = projectBrainSpace(attempts, [plan('p', { partId: 'home' })], PARTS, T0 + 30 * MIN);
    const lines = planLines(s.lines);
    expect(lines.map((l) => [l.id, l.onCueStarts])).toEqual([
      ['p:work', 2],
      ['p:home', 1],
    ]);
    expect(lines.map((l) => l.partId)).toEqual(['work', 'home']);
  });

  it('puts waiting lines that never started after every other line', () => {
    const attempts = [onCue('a1', 1, 'p', 'o1', 'work'), started('a2', 5, 'work')];
    const s = projectBrainSpace(
      attempts,
      [plan('p'), plan('q', { createdAt: 0 })],
      PARTS,
      T0 + 9 * MIN,
    );
    expect(s.lines.map((l) => l.id)).toEqual(['p:work', 'a2', 'q:core']);
  });

  it('keeps a hidden or waiting line when every on-cue start was undone', () => {
    const attempts = [{ ...onCue('a1', 1, 'p', 'o1', 'work'), undone: true }];
    const active = projectBrainSpace(attempts, [plan('p')], PARTS, T0 + 5 * MIN);
    expect(planLines(active.lines)).toMatchObject([
      {
        id: 'p:work',
        onCueStarts: 0,
        strength: 'waiting',
        order: T0 + MIN + 1,
        everStarted: true,
        hidden: false,
      },
    ]);
    const paused = projectBrainSpace(attempts, [plan('p', { active: false })], PARTS, T0 + 5 * MIN);
    expect(planLines(paused.lines)).toMatchObject([
      { id: 'p:work', onCueStarts: 0, order: T0 + MIN + 1, everStarted: true, hidden: true },
    ]);
    expect(summaryLines(paused)).toBe(0);
    expect(paused.totalStarts).toBe(0);
    expect(paused.parts.map((p) => p.planLines)).toEqual([0, 0]);
  });

  it('undone on-cue starts keep the line, its order and everStarted', () => {
    const base = [onCue('a1', 1, 'p', 'o1', 'work'), onCue('a2', 10, 'p', 'o2', 'work')];
    const before = projectBrainSpace(base, [plan('p')], PARTS, T0 + 20 * MIN);
    const undone = base.map((a, i) => (i === 0 ? { ...a, undone: true } : a));
    const after = projectBrainSpace(undone, [plan('p')], PARTS, T0 + 20 * MIN);
    const b = planLines(before.lines)[0];
    const a = planLines(after.lines)[0];
    expect(a).toMatchObject({ id: b?.id, order: b?.order, everStarted: true, onCueStarts: 1 });
    const all = base.map((x) => ({ ...x, undone: true }));
    const none = projectBrainSpace(all, [plan('p')], PARTS, T0 + 20 * MIN);
    expect(planLines(none.lines)[0]).toMatchObject({
      id: b?.id,
      order: b?.order,
      strength: 'waiting',
    });
  });

  it('two tabs: a tag on a settled attempt changes counts and not light', () => {
    // Two tabs: a stale tab tags a settled attempt after the next one opened.
    const first = att({
      id: 'a1',
      openedAt: T0,
      startAt: T0 + 1,
      tags: [
        ['work', T0 + 2],
        ['home', T0 + 100 * MIN],
      ],
    });
    const second = started('a2', 10);
    const s = projectBrainSpace([first, second], [], PARTS, T0 + 200 * MIN);
    expect(startLines(s.lines).find((l) => l.id === 'a1')?.partId).toBe('work');
    expect(s.parts.map((p) => [p.partId, p.starts])).toEqual([
      ['work', 0],
      ['home', 1],
      [null, 1],
    ]);
  });

  it('moving at exactly 48 hours, resting 1 ms later', () => {
    const a = started('a1', 0, 'work');
    const at = T0 + 1;
    expect(projectBrainSpace([a], [], PARTS, at + RESTING_AFTER_MS).motion).toBe('moving');
    expect(projectBrainSpace([a], [], PARTS, at + RESTING_AFTER_MS + 1).motion).toBe('resting');
  });

  it('a backfilled start counts as the newest start', () => {
    const old = started('a1', 0, 'work');
    const late = att({
      id: 'a2',
      openedAt: T0 + 100 * 60 * MIN,
      startAt: T0 + 100 * 60 * MIN + 5,
      backfilled: true,
    });
    const now = T0 + 100 * 60 * MIN + RESTING_AFTER_MS + 5;
    expect(projectBrainSpace([old, late], [], PARTS, now).motion).toBe('moving');
    expect(projectBrainSpace([old, late], [], PARTS, now + 1).motion).toBe('resting');
  });

  it('is resting with no starts at all', () => {
    expect(projectBrainSpace([], [], PARTS, T0).motion).toBe('resting');
  });

  it('an undone start does not keep it moving', () => {
    const s = projectBrainSpace(
      [started('a1', 0, undefined, { undone: true })],
      [],
      PARTS,
      T0 + MIN,
    );
    expect(s.motion).toBe('resting');
  });
});

describe('projectBrainSpace properties', () => {
  const known = (flowParts: readonly Part[]) => new Set(flowParts.map((p) => p.id));

  it('light adds up', () => {
    fc.assert(
      fc.property(arbFlow(), ({ events, plans, parts, now }) => {
        const attempts = foldAttempts(events);
        const s = projectBrainSpace(attempts, plans, parts, now);
        const counted = attempts.filter(isCountedStart).length;
        const onCueSum = planLines(s.lines).reduce((n, l) => n + l.onCueStarts, 0);
        const startsNotUndone = startLines(s.lines).filter((l) => !l.undone).length;
        expect(onCueSum + startsNotUndone).toBe(counted);
        expect(s.totalStarts).toBe(counted);
      }),
    );
  });

  it('undone draws nothing and keeps its place', () => {
    fc.assert(
      fc.property(arbFlow(), ({ events, plans, parts, now }) => {
        const attempts = foldAttempts(events);
        const s = projectBrainSpace(attempts, plans, parts, now);
        const ids = new Set(parts.map((p) => p.id));
        attempts.forEach((a, i) => {
          if (a.start === undefined) return;
          const own = startLines(s.lines).filter((l) => l.id === a.id);
          expect(own.length).toBeLessThanOrEqual(1);
          if (own.length === 0) {
            expect(a.planId).toBeDefined();
            const light = lightPartOf(a, attempts[i + 1]?.openedAt);
            const id = `${a.planId}:${light !== null && ids.has(light) ? light : 'core'}`;
            const line = planLines(s.lines).find((l) => l.id === id);
            expect(line?.everStarted).toBe(true);
            expect(line?.order).toBeLessThanOrEqual(a.start?.at ?? 0);
          }
        });
        for (const l of s.lines) {
          if (l.kind === 'plan' && l.onCueStarts === 0 && l.everStarted) {
            expect(l.strength).toBe('waiting');
          }
        }
      }),
    );
  });

  it('appending is stable', () => {
    fc.assert(
      fc.property(arbFlow(), fc.nat(), ({ events, plans, parts, now }, cut) => {
        if (events.length === 0) return;
        const k = cut % events.length;
        const before = foldAttempts(events.slice(0, k));
        const after = projectBrainSpace(foldAttempts(events.slice(0, k + 1)), plans, parts, now);
        const was = projectBrainSpace(before, plans, parts, now);
        // The one plan line that may still change: the one holding the unsettled last attempt.
        const last = before.at(-1);
        const lastPart = last ? lightPartOf(last, undefined) : null;
        const holderId =
          last?.start !== undefined &&
          last.planId !== undefined &&
          !was.lines.some((l) => l.kind === 'start' && l.id === last.id)
            ? `${last.planId}:${lastPart !== null && parts.some((p) => p.id === lastPart) ? lastPart : 'core'}`
            : undefined;
        for (const l of was.lines) {
          if (l.kind === 'start') {
            if (!l.settled) continue;
            const kept = after.lines.find((x) => x.id === l.id);
            expect(kept).toMatchObject({ id: l.id, partId: l.partId, order: l.order });
          } else if (l.everStarted && l.id !== holderId) {
            const kept = planLines(after.lines).find((x) => x.id === l.id);
            expect(kept).toMatchObject({ partId: l.partId, order: l.order });
            expect(kept?.onCueStarts).toBeGreaterThanOrEqual(l.onCueStarts);
          }
        }
        // Fibre safety: any new lit line sorts after every line that was already lit.
        const lit = (l: BrainLine) => l.kind === 'start' || l.everStarted;
        const oldIds = new Set(was.lines.map((l) => l.id));
        const top = Math.max(-Infinity, ...was.lines.filter(lit).map((l) => l.order));
        for (const l of after.lines.filter((x) => lit(x) && !oldIds.has(x.id))) {
          expect(l.order).toBeGreaterThanOrEqual(top);
        }
      }),
    );
  });

  it('only on-cue starts grow', () => {
    fc.assert(
      fc.property(arbFlow(), fc.nat(), ({ events, plans, parts, now }, cut) => {
        if (events.length === 0) return;
        const k = cut % events.length;
        const step = events[k];
        if (step?.type !== 'start.made') return;
        const before = foldAttempts(events.slice(0, k));
        const own = foldAttempts(events.slice(0, k + 1)).find((a) => a.id === step.attemptId);
        const duplicate = before.some(
          (a) => isCountedStart(a) && a.planId === own?.planId && a.occurrence === own?.occurrence,
        );
        if (own?.planId !== undefined && !duplicate) return;
        const ids = (evs: typeof events) =>
          planLines(projectBrainSpace(foldAttempts(evs), plans, parts, now).lines)
            .map((l) => [l.id, l.onCueStarts])
            .sort();
        expect(ids(events.slice(0, k + 1))).toEqual(ids(events.slice(0, k)));
      }),
    );
  });

  it('is moving exactly when the newest counted start is at most 48 hours old', () => {
    fc.assert(
      fc.property(arbFlow(), ({ events, plans, parts, now }) => {
        const attempts = foldAttempts(events);
        const s = projectBrainSpace(attempts, plans, parts, now);
        const newest = Math.max(
          -Infinity,
          ...attempts.filter(isCountedStart).map((a) => a.start?.at ?? -Infinity),
        );
        expect(s.motion).toBe(now - newest <= RESTING_AFTER_MS ? 'moving' : 'resting');
      }),
    );
  });

  it('PartLight.starts equals an independent count by the latest tag', () => {
    fc.assert(
      fc.property(arbFlow(), ({ events, plans, parts, now }) => {
        const attempts = foldAttempts(events);
        const ids = known(parts);
        const s = projectBrainSpace(attempts, plans, parts, now);
        const count = (id: string | null) =>
          attempts.filter(
            (a) =>
              isCountedStart(a) &&
              (a.part !== undefined && ids.has(a.part.id) ? a.part.id : null) === id,
          ).length;
        for (const pl of s.parts) expect(pl.starts).toBe(count(pl.partId));
        expect(s.parts.reduce((n, p) => n + p.starts, 0)).toBe(s.totalStarts);
      }),
    );
  });
});
