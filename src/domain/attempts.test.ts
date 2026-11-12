import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { findAttempt, foldAttempts, isCountedStart } from './attempts';
import { createEvent, type AppEvent } from './events';
import { arbAttemptEvents } from './testing/arbitraries';
import { testDeps } from './testing/fixtures';

function setup() {
  const deps = testDeps();
  const open = (attemptId = 'a1') =>
    createEvent(deps, 'attempt.opened', { attemptId, source: 'stuck' });
  return { deps, open };
}

describe('foldAttempts', () => {
  it('folds a full stuck flow into one attempt', () => {
    const { deps, open } = setup();
    const t0 = deps.clock.now();
    const evts: AppEvent[] = [
      open(),
      createEvent(deps, 'feeling.named', {
        attemptId: 'a1',
        feelingId: 'anxious',
        label: 'Anxious',
      }),
      createEvent(deps, 'response.shown', {
        attemptId: 'a1',
        feelingId: 'anxious',
        responseId: 'anxious.name',
        basis: 'name-the-feeling',
      }),
    ];
    deps.clock.advance(1000);
    evts.push(createEvent(deps, 'start.made', { attemptId: 'a1', backfilled: false }));
    evts.push(
      createEvent(deps, 'start.tagged', {
        attemptId: 'a1',
        taskTypeId: 'writing',
        label: 'Writing',
      }),
    );
    evts.push(
      createEvent(deps, 'timer.closed', {
        attemptId: 'a1',
        elapsedSec: 120,
        outcome: 'kept-going',
      }),
    );
    const [a, ...rest] = foldAttempts(evts);
    expect(rest).toEqual([]);
    expect(a).toEqual({
      id: 'a1',
      openedAt: t0,
      tz: 'America/New_York',
      source: 'stuck',
      feeling: { id: 'anxious', label: 'Anxious' },
      response: { id: 'anxious.name', basis: 'name-the-feeling' },
      start: { at: t0 + 1000, tz: 'America/New_York', backfilled: false },
      undone: false,
      taskType: { id: 'writing', label: 'Writing' },
      timer: { elapsedSec: 120, outcome: 'kept-going' },
      dismissed: false,
    });
    expect(isCountedStart(a!)).toBe(true);
  });

  it('carries plan fields and dismissal', () => {
    const { deps } = setup();
    const evts: AppEvent[] = [
      createEvent(deps, 'attempt.opened', {
        attemptId: 'p1',
        source: 'plan',
        planId: 'plan-1',
        occurrence: '2026-11-16',
      }),
      createEvent(deps, 'attempt.dismissed', { attemptId: 'p1' }),
    ];
    expect(findAttempt(evts, 'p1')).toMatchObject({
      source: 'plan',
      planId: 'plan-1',
      occurrence: '2026-11-16',
      dismissed: true,
    });
  });

  it('undone start is not counted', () => {
    const { deps, open } = setup();
    const evts: AppEvent[] = [
      open(),
      createEvent(deps, 'start.made', { attemptId: 'a1', backfilled: false }),
      createEvent(deps, 'start.undone', { attemptId: 'a1' }),
    ];
    const a = findAttempt(evts, 'a1')!;
    expect(a.undone).toBe(true);
    expect(isCountedStart(a)).toBe(false);
  });

  it('undone is sticky: a later start.made does not clear it', () => {
    const { deps, open } = setup();
    const first = createEvent(deps, 'start.made', { attemptId: 'a1', backfilled: false });
    deps.clock.advance(5000);
    const evts: AppEvent[] = [
      open(),
      first,
      createEvent(deps, 'start.undone', { attemptId: 'a1' }),
      createEvent(deps, 'start.made', { attemptId: 'a1', backfilled: false }),
    ];
    const a = findAttempt(evts, 'a1')!;
    expect(a.undone).toBe(true);
    expect(a.start?.at).toBe(first.at);
    expect(isCountedStart(a)).toBe(false);
  });

  it('latest tag wins', () => {
    const { deps, open } = setup();
    const evts: AppEvent[] = [
      open(),
      createEvent(deps, 'start.tagged', {
        attemptId: 'a1',
        taskTypeId: 'writing',
        label: 'Writing',
      }),
      createEvent(deps, 'start.tagged', { attemptId: 'a1', taskTypeId: 'admin', label: 'Admin' }),
    ];
    expect(findAttempt(evts, 'a1')?.taskType).toEqual({ id: 'admin', label: 'Admin' });
  });

  it('a second start.made keeps the first start time', () => {
    const { deps, open } = setup();
    const first = createEvent(deps, 'start.made', { attemptId: 'a1', backfilled: false });
    deps.clock.advance(300);
    deps.clock.setTimeZone('Asia/Tokyo');
    const second = createEvent(deps, 'start.made', { attemptId: 'a1', backfilled: true });
    const a = findAttempt([open(), first, second], 'a1')!;
    expect(a.start).toEqual({ at: first.at, tz: 'America/New_York', backfilled: false });
    expect(foldAttempts([open(), first, second]).filter(isCountedStart)).toHaveLength(1);
  });

  it('attempt with no start and no dismissal is abandoned', () => {
    const { open } = setup();
    const a = findAttempt([open()], 'a1')!;
    expect(isCountedStart(a)).toBe(false);
    expect(a.dismissed).toBe(false);
    expect(a.undone).toBe(false);
  });

  it('ignores events for attempts that were never opened', () => {
    const { deps } = setup();
    const evts = [createEvent(deps, 'start.made', { attemptId: 'ghost', backfilled: false })];
    expect(foldAttempts(evts)).toEqual([]);
    expect(findAttempt(evts, 'ghost')).toBeUndefined();
  });

  it('orders attempts by openedAt', () => {
    const { deps } = setup();
    const late = createEvent(deps, 'attempt.opened', { attemptId: 'late', source: 'stuck' });
    deps.clock.set(late.at - 10_000);
    const early = createEvent(deps, 'attempt.opened', { attemptId: 'early', source: 'stuck' });
    expect(foldAttempts([late, early]).map((a) => a.id)).toEqual(['early', 'late']);
  });

  it('counted starts equal attempts with a start.made and no start.undone', () => {
    fc.assert(
      fc.property(arbAttemptEvents(), (evts) => {
        const opened = new Set<string>();
        const made = new Set<string>();
        const undone = new Set<string>();
        for (const e of evts) {
          if (e.type === 'attempt.opened') opened.add(e.attemptId);
          else if (e.type === 'start.made') made.add(e.attemptId);
          else if (e.type === 'start.undone') undone.add(e.attemptId);
        }
        const expected = [...opened].filter((id) => made.has(id) && !undone.has(id)).length;
        expect(foldAttempts(evts).filter(isCountedStart)).toHaveLength(expected);
      }),
    );
  });

  it('counts every start regardless of how storage orders equal-at events', () => {
    fc.assert(
      fc.property(arbAttemptEvents(), (evts) => {
        // IndexedDB returns equal `at` rows by primary key, which is a random id.
        const stored = [...evts].sort((x, y) => x.at - y.at || (x.id < y.id ? -1 : 1));
        const key = (list: AppEvent[]) =>
          JSON.stringify(foldAttempts(list).map((a) => [a.id, a.start?.at, a.undone]));
        expect(key(stored)).toBe(key(evts));
        expect(foldAttempts(stored).filter(isCountedStart)).toHaveLength(
          foldAttempts(evts).filter(isCountedStart).length,
        );
      }),
    );
  });

  it('opens an attempt even when start.made sorts before attempt.opened', () => {
    const { deps, open } = setup();
    const opened = open();
    const made = createEvent(deps, 'start.made', { attemptId: 'a1', backfilled: false });
    const a = findAttempt([made, opened], 'a1');
    expect(a && isCountedStart(a)).toBe(true);
  });
});
