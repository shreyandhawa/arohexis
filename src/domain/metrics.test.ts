import { describe, expect, it } from 'vitest';
import type { Attempt } from './attempts';
import { startsThisWeek } from './metrics';

const NY = 'America/New_York';

function attempt(over: Partial<Attempt> & { startTz?: string; startAt?: number }): Attempt {
  const { startTz, startAt, ...rest } = over;
  return {
    id: 'a1',
    openedAt: 0,
    tz: NY,
    source: 'stuck',
    undone: false,
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
