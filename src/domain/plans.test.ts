import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Plan } from './config';
import type { AppEvent } from './events';
import { makeStart, openAttempt } from './commands';
import {
  daysPhrase,
  formatPlanTime,
  instantOf,
  occurrencesBetween,
  occurrenceStatus,
  offsetMinutes,
  planSentence,
  validatePlan,
} from './plans';
import { testDeps } from './testing/fixtures';

const MIN = 60_000;
const plan = (over: Partial<Plan> = {}): Plan => ({
  id: 'p1',
  place: 'my desk',
  firstAction: 'open the essay doc',
  time: '09:00',
  days: [1, 2, 3, 4, 5],
  graceMin: 30,
  active: true,
  createdAt: 0,
  editCount: 0,
  ...over,
});

const ZONES = ['America/New_York', 'Europe/London', 'Australia/Lord_Howe', 'Asia/Kathmandu'];

describe('instantOf', () => {
  it('moves a spring-forward gap time to the first valid minute', () => {
    // 2026-03-08 02:30 does not exist in New York; 03:00 EDT is 07:00Z.
    expect(instantOf('2026-03-08', '02:30', 'America/New_York')).toBe(Date.UTC(2026, 2, 8, 7, 0));
    // 2026-03-29 01:30 does not exist in London; 02:00 BST is 01:00Z.
    expect(instantOf('2026-03-29', '01:30', 'Europe/London')).toBe(Date.UTC(2026, 2, 29, 1, 0));
  });
  it('takes the first instance of a fall-back time', () => {
    // 2026-11-01 01:30 happens twice in New York; the first is EDT (05:30Z).
    expect(instantOf('2026-11-01', '01:30', 'America/New_York')).toBe(Date.UTC(2026, 10, 1, 5, 30));
  });
  it('handles a 30-minute shift in Lord Howe', () => {
    // 2026-10-04 02:15 does not exist (clocks go 02:00 to 02:30 local, +10:30 to +11).
    const at = instantOf('2026-10-04', '02:15', 'Australia/Lord_Howe');
    expect(offsetMinutes(at, 'Australia/Lord_Howe')).toBe(11 * 60);
    expect(at - Date.UTC(2026, 9, 3, 15, 30)).toBe(0);
  });
  it('uses Kathmandu +05:45', () => {
    expect(instantOf('2026-06-01', '09:00', 'Asia/Kathmandu')).toBe(Date.UTC(2026, 5, 1, 3, 15));
  });
});

describe('occurrencesBetween', () => {
  it('keeps the wall-clock time across DST in every zone', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ZONES),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: Date.UTC(2026, 0, 1), max: Date.UTC(2027, 0, 1) }),
        (tz, h, m, from) => {
          const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          const p = plan({ time, days: [0, 1, 2, 3, 4, 5, 6] });
          const occ = occurrencesBetween(p, from, from + 40 * 24 * 60 * MIN, tz);
          expect(occ.length).toBeGreaterThanOrEqual(39);
          for (const o of occ) {
            const local = new Date(o.at + offsetMinutes(o.at, tz) * MIN).toISOString();
            const date = local.slice(0, 10);
            const wall = local.slice(11, 16);
            if (wall === time) expect(date).toBe(o.date);
            else {
              // Only a skipped (gap) time may differ, and then it lands later on that date.
              expect(date).toBe(o.date);
              expect(wall > time).toBe(true);
              expect(Date.parse(`${date}T${wall}:00Z`) - Date.parse(`${date}T${time}:00Z`)).toBeLessThanOrEqual(
                60 * MIN,
              );
            }
          }
          const ats = occ.map((o) => o.at);
          expect(ats).toEqual([...ats].sort((a, b) => a - b));
          expect(new Set(occ.map((o) => o.date)).size).toBe(occ.length);
        },
      ),
    );
  });
  it('respects days, paused plans and createdAt', () => {
    const tz = 'America/New_York';
    const from = Date.UTC(2026, 10, 16, 0, 0);
    const to = Date.UTC(2026, 10, 23, 15, 0);
    const dates = occurrencesBetween(plan(), from, to, tz).map((o) => o.date);
    expect(dates).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-23']);
    expect(occurrencesBetween(plan({ active: false }), from, to, tz)).toEqual([]);
    expect(occurrencesBetween(plan(), to, from, tz)).toEqual([]);
    const created = instantOf('2026-11-18', '09:00', tz);
    expect(occurrencesBetween(plan({ createdAt: created }), from, to, tz)[0]?.date).toBe('2026-11-18');
    expect(occurrencesBetween(plan({ createdAt: created + 1 }), from, to, tz)[0]?.date).toBe('2026-11-19');
  });
});

describe('occurrenceStatus', () => {
  const tz = 'America/New_York';
  const p = plan();
  const at = instantOf('2026-11-16', '09:00', tz);
  const occ = { planId: 'p1', date: '2026-11-16', at };
  const status = (now: number, events: AppEvent[] = []) => occurrenceStatus(p, occ, events, now);

  it('walks upcoming, open, slipped by time', () => {
    expect(status(at - 15 * MIN - 1)).toBe('upcoming');
    expect(status(at - 15 * MIN)).toBe('open');
    expect(status(at + 30 * MIN)).toBe('open');
    expect(status(at + 30 * MIN + 1)).toBe('slipped');
  });
  it('prefers started over resolved over time', () => {
    const deps = testDeps({ at, tz });
    const opened = openAttempt(deps, { source: 'plan', planId: 'p1', occurrence: '2026-11-16' });
    const start = makeStart(deps, [opened], opened.attemptId, {
      planId: 'p1',
      occurrence: '2026-11-16',
      backfilled: false,
    });
    const resolved = {
      id: 'r',
      type: 'occurrence.resolved' as const,
      at,
      tz,
      v: 1 as const,
      planId: 'p1',
      occurrence: '2026-11-16',
      outcome: 'slipped' as const,
    };
    expect(status(at + 999 * MIN, [resolved])).toBe('resolved');
    expect(status(at + 999 * MIN, [opened, ...start, resolved])).toBe('started');
    expect(status(at + 999 * MIN, [resolved, { ...resolved, planId: 'other' }])).toBe('resolved');
    expect(status(at + 999 * MIN, [{ ...resolved, occurrence: '2026-11-17' }])).toBe('slipped');
  });
});

describe('planSentence', () => {
  it('reads as an if-then sentence', () => {
    expect(planSentence(plan())).toBe(
      "If it's 9:00 on weekdays at my desk, then I will open the essay doc.",
    );
    expect(planSentence(plan({ cueDetail: 'after coffee', firstAction: 'open it.' }), 'calendar')).toBe(
      "If it's 9:00 at my desk, after coffee, then open it",
    );
    expect(planSentence(plan({ place: ' ', time: '13:05', days: [0, 6] }))).toBe(
      "If it's 13:05 on weekends, then I will open the essay doc.",
    );
    expect(planSentence(plan({ place: '', cueDetail: 'after coffee', days: [] }))).toBe(
      "If it's 9:00 after coffee, then I will open the essay doc.",
    );
  });
  it('names days', () => {
    expect(daysPhrase([0, 1, 2, 3, 4, 5, 6])).toBe('every day');
    expect(daysPhrase([3, 1])).toBe('Mon, Wed');
    expect(formatPlanTime('00:00')).toBe('0:00');
  });
});

describe('validatePlan', () => {
  it('flags bad fields', () => {
    expect(validatePlan(plan())).toEqual([]);
    expect(validatePlan(plan({ time: '9:00', days: [], firstAction: ' ', graceMin: -1 }))).toEqual([
      'time',
      'days',
      'firstAction',
      'graceMin',
    ]);
    expect(validatePlan(plan({ days: [7 as 6] }))).toEqual(['days']);
  });
});
