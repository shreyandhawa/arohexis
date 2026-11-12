import { describe, expect, it } from 'vitest';
import type { BrainLine } from './brainSpace';
import type { Plan } from './config';
import type { AppEvent } from './events';
import { focusFor, recentLapses } from './focus';

const plan = (id: string, partId?: string): Plan => ({
  id,
  place: 'desk',
  firstAction: 'open it',
  time: '09:00',
  days: [1],
  graceMin: 30,
  active: true,
  createdAt: 0,
  editCount: 0,
  ...(partId !== undefined && { partId }),
});
type Strength = Extract<BrainLine, { kind: 'plan' }>['strength'];
const line = (
  planId: string,
  partId: string | null,
  strength: Strength,
  hidden = false,
): BrainLine => ({
  kind: 'plan',
  id: `${planId}:${partId ?? 'core'}`,
  planId,
  partId,
  onCueStarts: strength === 'waiting' ? 0 : 1,
  strength,
  order: 0,
  everStarted: strength !== 'waiting',
  hidden,
});
const none = new Set<string>();
const base = {
  partId: 'work',
  plans: [] as Plan[],
  lines: [] as BrainLine[],
  lapsedPlanIds: none,
  plansAvailable: true,
};

describe('focusFor', () => {
  it('rule 1: a recent lapse comes first', () => {
    expect(
      focusFor({
        ...base,
        plans: [plan('p', 'work')],
        lines: [line('p', 'work', 'waiting'), line('q', 'work', 3)],
        lapsedPlanIds: new Set(['p']),
      }),
    ).toBe('lapse');
  });

  it("ignores a lapse in another part's plan", () => {
    expect(focusFor({ ...base, plans: [plan('p', 'home')], lapsedPlanIds: new Set(['p']) })).toBe(
      'add-plan',
    );
  });

  it('rule 2: a waiting plan beats a stable cue', () => {
    expect(
      focusFor({
        ...base,
        plans: [plan('p', 'work'), plan('q', 'work')],
        lines: [line('p', 'work', 'waiting'), line('q', 'work', 3)],
      }),
    ).toBe('waiting');
  });

  it("does not count a hidden or another part's waiting line", () => {
    expect(
      focusFor({
        ...base,
        plans: [plan('p', 'work')],
        lines: [line('p', 'work', 'waiting', true), line('q', 'home', 'waiting')],
      }),
    ).toBe('name-feeling');
  });

  it('rule 3: strength 2 or more is a stable cue, strength 1 is not', () => {
    const plans = [plan('p', 'work')];
    expect(focusFor({ ...base, plans, lines: [line('p', 'work', 2)] })).toBe('stable-cue');
    expect(focusFor({ ...base, plans, lines: [line('p', 'work', 4)] })).toBe('stable-cue');
    expect(focusFor({ ...base, plans, lines: [line('p', 'work', 1)] })).toBe('name-feeling');
  });

  it('rule 4: a part with no plan is offered one, when plans exist', () => {
    expect(focusFor(base)).toBe('add-plan');
    expect(focusFor({ ...base, plansAvailable: false })).toBe('name-feeling');
  });

  it('rule 5: otherwise name the feeling', () => {
    expect(focusFor({ ...base, plans: [plan('p', 'work')] })).toBe('name-feeling');
  });
});

describe('recentLapses', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 10, 16);
  const env = { id: 'e', tz: 'UTC', v: 1 as const };
  const slip = (planId: string, at: number): AppEvent => ({
    ...env,
    type: 'occurrence.resolved',
    at,
    planId,
    occurrence: 'o',
    outcome: 'slipped',
  });
  const repair = (planId: string, at: number): AppEvent => ({
    ...env,
    type: 'lapse.repaired',
    at,
    planId,
    occurrence: 'o',
    startedAnyway: false,
    choice: 'keep',
  });

  it('keeps a slip at exactly 7 days and drops one older by 1 ms', () => {
    expect([
      ...recentLapses([slip('a', now - 7 * DAY), slip('b', now - 7 * DAY - 1)], now),
    ]).toEqual(['a']);
  });

  it('counts repairs too, and ignores expired occurrences and other events', () => {
    const expired: AppEvent = {
      ...env,
      type: 'occurrence.resolved',
      at: now,
      planId: 'c',
      occurrence: 'o',
      outcome: 'expired',
    };
    const opened: AppEvent = {
      ...env,
      type: 'attempt.opened',
      at: now,
      attemptId: 'x',
      source: 'stuck',
    };
    expect([...recentLapses([repair('r', now - DAY), expired, opened], now)]).toEqual(['r']);
  });
});
