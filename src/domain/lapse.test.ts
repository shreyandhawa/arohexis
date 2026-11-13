import { describe, expect, it } from 'vitest';
import type { Plan } from './config';
import type { AppEvent } from './events';
import { applyRepair, findLapseToRepair } from './lapse';
import { instantOf } from './plans';

const tz = 'America/New_York';
const plan = (over: Partial<Plan> = {}): Plan => ({
  id: 'p1',
  place: 'my desk',
  firstAction: 'open the essay doc',
  time: '09:00',
  days: [1, 2, 3, 4, 5],
  graceMin: 30,
  active: true,
  createdAt: instantOf('2026-10-01', '00:00', tz),
  editCount: 0,
  ...over,
});
const now = instantOf('2026-11-18', '12:00', tz);
const resolved = (planId: string, occurrence: string): AppEvent => ({
  id: `r-${planId}-${occurrence}`,
  type: 'occurrence.resolved',
  at: now,
  tz,
  v: 1,
  planId,
  occurrence,
  outcome: 'expired',
});

describe('findLapseToRepair', () => {
  it('offers the most recent slip and expires the rest, including those older than 7 days', () => {
    const { repair, expire } = findLapseToRepair([plan()], [], now, tz);
    expect(repair?.occurrence.date).toBe('2026-11-18');
    // 7 days back reaches 11-11 at 09:00; older weekdays since 10-01 are expired too.
    expect(expire.some((o) => o.date === '2026-11-17')).toBe(true);
    expect(expire.some((o) => o.date === '2026-10-01')).toBe(true);
    expect(expire.some((o) => o.date === '2026-11-18')).toBe(false);
  });
  it('skips resolved, upcoming and open occurrences', () => {
    const events = [resolved('p1', '2026-11-18')];
    expect(findLapseToRepair([plan()], events, now, tz).repair?.occurrence.date).toBe('2026-11-17');
    const early = instantOf('2026-11-18', '08:50', tz);
    expect(findLapseToRepair([plan()], [], early, tz).repair?.occurrence.date).toBe('2026-11-17');
  });
  it('expires a lone slip older than 7 days instead of offering it', () => {
    const p = plan({ days: [1], createdAt: instantOf('2026-11-01', '00:00', tz) });
    const later = instantOf('2026-11-18', '12:00', tz); // 11-16 is 2 days old, 11-09 is 9 days old
    const events = [resolved('p1', '2026-11-16')];
    const out = findLapseToRepair([p], events, later, tz);
    expect(out.repair).toBeUndefined();
    expect(out.expire.map((o) => o.date)).toEqual(['2026-11-09', '2026-11-02']);
    expect(findLapseToRepair([], [], now, tz)).toEqual({ expire: [] });
  });
});

describe('applyRepair', () => {
  const p = plan();
  it('returns the plan patch for each choice', () => {
    expect(applyRepair(p, 'keep', {})).toEqual({});
    expect(applyRepair(p, 'smaller', { firstAction: ' open the doc ' })).toEqual({
      firstAction: 'open the doc',
    });
    expect(applyRepair(p, 'smaller', { firstAction: '  ' })).toEqual({});
    expect(applyRepair(p, 'move', { time: '10:30', days: [2] })).toEqual({
      time: '10:30',
      days: [2],
    });
    expect(applyRepair(p, 'move', { days: [] })).toEqual({});
    expect(applyRepair(p, 'pause', {})).toEqual({ active: false });
    expect(applyRepair(plan({ active: false }), 'pause', {})).toEqual({});
  });
});
