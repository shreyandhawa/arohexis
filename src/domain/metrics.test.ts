import { describe, expect, it } from 'vitest';
import type { Attempt } from './attempts';
import * as fc from 'fast-check';
import { foldAttempts, isCountedStart } from './attempts';
import { arbAttemptEvents } from './testing/arbitraries';
import {
  responseStats,
  startsByFeeling,
  startsByHour,
  startsByPart,
  startsByWeek,
  startsThisWeek,
} from './metrics';

const NY = 'America/New_York';

function attempt(over: Partial<Attempt> & { startTz?: string; startAt?: number }): Attempt {
  const { startTz, startAt, ...rest } = over;
  return {
    id: 'a1',
    openedAt: 0,
    tz: NY,
    source: 'stuck',
    undone: false,
    tags: [],
    dismissed: false,
    ...(startAt !== undefined
      ? { start: { at: startAt, tz: startTz ?? NY, backfilled: false } }
      : {}),
    ...rest,
  };
}

describe('startsThisWeek', () => {
  const start = Date.UTC(2026, 10, 15, 22, 0);
  const now = Date.UTC(2026, 10, 16, 15, 0);

  it("uses each start's own zone", () => {
    expect(
      startsThisWeek([attempt({ startAt: start, startTz: 'Asia/Kathmandu' })], now, NY, 1),
    ).toBe(1);
    expect(startsThisWeek([attempt({ startAt: start, startTz: NY })], now, NY, 1)).toBe(0);
  });

  it('ignores undone and abandoned attempts', () => {
    const t = Date.UTC(2026, 10, 16, 14, 0);
    const list = [
      attempt({ id: 'a', startAt: t }),
      attempt({ id: 'b', startAt: t, undone: true }),
      attempt({ id: 'c' }),
    ];
    expect(startsThisWeek(list, now, NY, 1)).toBe(1);
  });
});

describe('insights metrics', () => {
  const t = (d: number, h = 12) => Date.UTC(2026, 10, d, h, 0);
  const now = t(16);

  it('startsByWeek is contiguous with zero weeks', () => {
    const list = [
      attempt({ id: 'a', openedAt: t(2), startAt: t(2) }),
      attempt({ id: 'b', openedAt: t(16), startAt: t(16) }),
    ];
    expect(startsByWeek(list, now, NY, 1)).toEqual([
      { weekOf: '2026-11-02', count: 1 },
      { weekOf: '2026-11-09', count: 0 },
      { weekOf: '2026-11-16', count: 1 },
    ]);
    expect(startsByWeek([], now, NY, 1)).toEqual([]);
  });

  it('groups by feeling with From a plan, hour, and part', () => {
    const list = [
      attempt({ id: 'a', startAt: t(2, 14), feeling: { id: 'bored', label: 'Bored' } }),
      attempt({ id: 'b', startAt: t(3, 14), source: 'plan' }),
      attempt({ id: 'c', startAt: t(4, 14), part: { id: 'p', label: 'Work' } }),
      attempt({ id: 'd', startAt: t(5, 14), undone: true }),
    ];
    expect(startsByFeeling(list).map((g) => [g.label, g.count])).toEqual([
      ['Bored', 1],
      ['From a plan', 1],
      ['Something else', 1],
    ]);
    expect(startsByHour(list)[9]).toBe(3);
    expect(startsByPart(list).map((g) => [g.label, g.count])).toEqual([
      ['No part', 2],
      ['Work', 1],
    ]);
  });

  it('responseStats flags early days under 5 and ignores undone', () => {
    const r = { id: 'r1', basis: 'reframe' as const };
    const list = [
      attempt({ id: 'a', startAt: t(2), response: r }),
      attempt({ id: 'b', response: r }),
      attempt({ id: 'c', startAt: t(3), response: r, undone: true }),
    ];
    expect(responseStats(list)).toEqual([
      { responseId: 'r1', basis: 'reframe', shown: 3, ledToStart: 1, rate: 1 / 3, earlyDays: true },
    ]);
    const five = Array.from({ length: 5 }, (_, i) => attempt({ id: `x${i}`, response: r }));
    expect(responseStats(five)[0]?.earlyDays).toBe(false);
  });

  it('property: weekly sum equals counted starts; undone never counted', () => {
    fc.assert(
      fc.property(arbAttemptEvents(), (events) => {
        const attempts = foldAttempts(events);
        const total = attempts.filter(isCountedStart).length;
        const sum = (xs: { count: number }[]) => xs.reduce((n, x) => n + x.count, 0);
        expect(sum(startsByWeek(attempts, 1_800_000_000_000, NY, 1))).toBe(total);
        expect(sum(startsByFeeling(attempts))).toBe(total);
        expect(sum(startsByPart(attempts))).toBe(total);
        expect(startsByHour(attempts).reduce((n, x) => n + x, 0)).toBe(total);
      }),
    );
  });
});
