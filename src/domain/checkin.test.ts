import { describe, expect, it } from 'vitest';
import { checkinPeriod, checkinTrend, isCheckinDue, scoreCheckin, CHECKIN_ITEMS } from './checkin';
import type { AppEvent } from './events';

const NY = 'America/New_York';

function submitted(
  id: string,
  at: number,
  weekOf: string,
  answers: [number, number, number, number],
) {
  return { id, at, tz: NY, type: 'checkin.submitted', weekOf, answers } as unknown as AppEvent;
}

describe('checkin', () => {
  it('has four items', () => {
    expect(CHECKIN_ITEMS).toHaveLength(4);
  });

  it('weekOf is the date of the period checkinDay in the local zone', () => {
    // Sunday 2026-11-15 04:59 UTC is still Saturday evening in New York.
    expect(checkinPeriod(Date.UTC(2026, 10, 15, 4, 59), NY, 0)).toBe('2026-11-08');
    expect(checkinPeriod(Date.UTC(2026, 10, 15, 5, 0), NY, 0)).toBe('2026-11-15');
    expect(checkinPeriod(Date.UTC(2026, 10, 18, 12, 0), NY, 0)).toBe('2026-11-15');
    expect(checkinPeriod(Date.UTC(2026, 10, 18, 12, 0), NY, 3)).toBe('2026-11-18');
  });

  it('is due until submitted or skipped for the period', () => {
    const now = Date.UTC(2026, 10, 17, 12, 0);
    expect(isCheckinDue(now, NY, 0, [], undefined)).toBe(true);
    expect(isCheckinDue(now, NY, 0, ['2026-11-15'], undefined)).toBe(false);
    expect(isCheckinDue(now, NY, 0, [], '2026-11-15')).toBe(false);
    expect(isCheckinDue(now, NY, 0, ['2026-11-08'], '2026-11-08')).toBe(true);
  });

  it('scores the mean and trends one point per week', () => {
    expect(scoreCheckin([1, 2, 3, 6])).toBe(3);
    const events = [
      submitted('b', 20, '2026-11-15', [4, 4, 4, 4]),
      submitted('a', 10, '2026-11-08', [1, 1, 1, 1]),
      submitted('c', 30, '2026-11-15', [6, 6, 6, 6]),
    ];
    expect(checkinTrend(events)).toEqual([
      { weekOf: '2026-11-08', score: 1 },
      { weekOf: '2026-11-15', score: 6 },
    ]);
  });
});
