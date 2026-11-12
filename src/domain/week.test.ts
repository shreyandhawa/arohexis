import { describe, expect, it } from 'vitest';
import { localDate, localHour, weekKey } from './week';

const NY = 'America/New_York';

describe('week', () => {
  it('weekKey uses Monday by default', () => {
    expect(weekKey(Date.UTC(2026, 10, 16, 4, 59), NY, 1)).toBe('2026-11-09');
    expect(weekKey(Date.UTC(2026, 10, 16, 5, 1), NY, 1)).toBe('2026-11-16');
  });

  it('weekKey honors a Sunday start', () => {
    expect(weekKey(Date.UTC(2026, 10, 15, 15, 0), NY, 0)).toBe('2026-11-15');
  });

  it('localHour is right on both sides of the DST change', () => {
    expect(localHour(Date.UTC(2026, 10, 1, 5, 30), NY)).toBe(1);
    expect(localHour(Date.UTC(2026, 10, 1, 6, 30), NY)).toBe(1);
  });

  it('localDate in a +5:45 zone', () => {
    expect(localDate(Date.UTC(2026, 10, 15, 22, 0), 'Asia/Kathmandu')).toBe('2026-11-16');
  });
});
