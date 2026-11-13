import { describe, expect, it } from 'vitest';
import { foldAttempts, isCountedStart } from './attempts';
import { projectBrainSpace } from './brainSpace';
import { DEMO_PARTS, DEMO_SEED, generateDemoData } from './demo';
import { parseExport, buildExport } from './exportFormat';
import { instantOf } from './plans';

const END = '2026-11-12';
const TZ = 'America/New_York';
const data = generateDemoData(DEMO_SEED, END, TZ);
const attempts = foldAttempts(data.events);
const counted = attempts.filter(isCountedStart);
const start = instantOf('2026-09-04', '00:00', TZ);
const weekOf = (at: number) => Math.floor((at - start) / (7 * 24 * 60 * MIN_PER));
const MIN_PER = 60_000;

describe('generateDemoData', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(generateDemoData(DEMO_SEED, END, TZ)).toEqual(data);
    expect(generateDemoData(1, END, TZ)).not.toEqual(data);
  });

  it('is a valid export', () => {
    const file = buildExport(data, { exportedAt: '2026-11-13T00:00:00Z', build: 'x' });
    expect(parseExport(JSON.parse(JSON.stringify(file))).ok).toBe(true);
    expect(data.parts).toEqual(DEMO_PARTS);
    expect(data.settings.onboarded).toBe(true);
  });

  it('covers 10 weeks with starts rising from about 6 to about 15', () => {
    const perWeek = new Array<number>(10).fill(0);
    for (const a of counted) {
      const w = weekOf(a.start?.at ?? 0);
      perWeek[w] = (perWeek[w] ?? 0) + 1;
    }
    expect(perWeek.every((c) => c > 0)).toBe(true);
    expect(perWeek[0]).toBeGreaterThanOrEqual(4);
    expect(perWeek[0]).toBeLessThanOrEqual(8);
    expect(perWeek[9]).toBeGreaterThanOrEqual(12);
    expect(perWeek[9]).toBeLessThanOrEqual(18);
    expect(Math.min(perWeek[3] ?? 0, perWeek[7] ?? 0)).toBeLessThan(perWeek[2] ?? 0);
  });

  it('keeps the other bands of spec 7.4', () => {
    const tagged = counted.filter((a) => a.part).length / counted.length;
    expect(tagged).toBeGreaterThan(0.7);
    expect(tagged).toBeLessThan(0.9);
    const stuck = attempts.filter((a) => a.source === 'stuck');
    const rate = (from: number, to: number) => {
      const group = stuck.filter((a) => weekOf(a.openedAt) >= from && weekOf(a.openedAt) < to);
      return group.filter(isCountedStart).length / group.length;
    };
    expect(rate(7, 10)).toBeGreaterThan(rate(0, 3));
    const hours = counted.map((a) => new Date((a.start?.at ?? 0) - 5 * 3_600_000).getUTCHours());
    expect(hours.some((h) => h >= 8 && h < 12)).toBe(true);
    const checkins = data.events.filter((e) => e.type === 'checkin.submitted');
    expect(checkins).toHaveLength(10);
    const mean = (e: (typeof checkins)[number]) =>
      e.type === 'checkin.submitted' ? e.answers.reduce((s, x) => s + x, 0) / 4 : 0;
    expect(mean(checkins[9]!)).toBeGreaterThan(mean(checkins[0]!));
    for (const e of checkins)
      if (e.type === 'checkin.submitted')
        expect(e.answers.every((x) => x >= 1 && x <= 7)).toBe(true);
  });

  it('starts the three plans in weeks 1, 3 and 6', () => {
    const firstWeek = (planId: string) =>
      Math.min(
        ...attempts
          .filter((a) => a.planId === planId && a.start)
          .map((a) => weekOf(a.start?.at ?? 0)),
      );
    expect(data.plans.map((p) => firstWeek(p.id))).toEqual([0, 2, 5]);
  });

  it('fills Brain space: light in every part, every strength, and moving today', () => {
    const now = instantOf('2026-11-13', '12:00', TZ);
    const space = projectBrainSpace(attempts, data.plans, data.parts, now);
    for (const p of data.parts) {
      const light = space.parts.find((l) => l.partId === p.id);
      expect(
        (light?.starts ?? 0) + (light?.planLines ?? 0) + (light?.startLines ?? 0),
      ).toBeGreaterThan(0);
    }
    const strengths = new Set(space.lines.flatMap((l) => (l.kind === 'plan' ? [l.strength] : [])));
    expect([...strengths].sort()).toEqual([1, 2, 3, 4]);
    expect(space.motion).toBe('moving');
  });
});
