import * as fc from 'fast-check';
import type { AppEvent, Basis } from '../events';
import type { Config, Settings, WeekDay } from '../config';

const BASES: Basis[] = [
  'name-the-feeling',
  'shrink-the-step',
  'self-kindness',
  'reframe',
  'pair-a-reward',
];
const ZONES = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];

type Op = 'start' | 'undo' | 'tag' | 'close' | 'dismiss';

function buildAttempt(n: number, tz: string, named: boolean, ops: Op[], basis: Basis): AppEvent[] {
  const attemptId = `a${n}`;
  const common = (type: AppEvent['type'], k: number) => ({
    id: `e${n}-${k}`,
    type,
    at: 0,
    tz,
    v: 1 as const,
  });
  const out: AppEvent[] = [
    { ...common('attempt.opened', 0), type: 'attempt.opened', attemptId, source: 'stuck' },
  ];
  if (named) {
    out.push({
      ...common('feeling.named', 1),
      type: 'feeling.named',
      attemptId,
      feelingId: 'anxious',
      label: 'Anxious',
    });
    out.push({
      ...common('response.shown', 2),
      type: 'response.shown',
      attemptId,
      feelingId: 'anxious',
      responseId: `r${n}`,
      basis,
    });
  }
  let started = false;
  ops.forEach((op, i) => {
    const k = 10 + i;
    if (op === 'start') {
      started = true;
      out.push({
        ...common('start.made', k),
        type: 'start.made',
        attemptId,
        backfilled: false,
      });
    } else if (op === 'undo') {
      if (started) out.push({ ...common('start.undone', k), type: 'start.undone', attemptId });
    } else if (op === 'tag') {
      out.push({
        ...common('start.tagged', k),
        type: 'start.tagged',
        attemptId,
        taskTypeId: `t${i}`,
        label: `Task ${i}`,
      });
    } else if (op === 'close') {
      out.push({
        ...common('timer.closed', k),
        type: 'timer.closed',
        attemptId,
        elapsedSec: 60 + i,
        outcome: i % 2 === 0 ? 'kept-going' : 'stopped',
      });
    } else {
      out.push({ ...common('attempt.dismissed', k), type: 'attempt.dismissed', attemptId });
    }
  });
  return out;
}

/** Valid per-attempt event sequences, interleaved across attempts, with random undo/tag/close. */
export function arbAttemptEvents(): fc.Arbitrary<AppEvent[]> {
  const arbOps = fc.array(fc.constantFrom<Op>('start', 'undo', 'tag', 'close', 'dismiss'), {
    maxLength: 6,
  });
  const arbAttempt = fc.record({
    tz: fc.constantFrom(...ZONES),
    named: fc.boolean(),
    ops: arbOps,
    basis: fc.constantFrom(...BASES),
  });
  return fc
    .tuple(
      fc.array(arbAttempt, { maxLength: 6 }),
      fc.array(fc.nat({ max: 1000 }), { minLength: 64, maxLength: 64 }),
    )
    .map(([attempts, picks]) => {
      const queues = attempts.map((a, n) => buildAttempt(n, a.tz, a.named, a.ops, a.basis));
      const merged: AppEvent[] = [];
      let p = 0;
      while (queues.some((q) => q.length > 0)) {
        const live = queues.filter((q) => q.length > 0);
        const pick = picks[p++ % picks.length] ?? 0;
        const q = live[pick % live.length];
        const ev = q?.shift();
        if (ev) merged.push({ ...ev, at: Date.UTC(2026, 10, 1) + merged.length * 60_000 });
      }
      return merged;
    });
}

const arbText = fc.string({ maxLength: 12 });
const arbWeekDay = fc.constantFrom<WeekDay>(0, 1, 2, 3, 4, 5, 6);
const arbBasis = fc.constantFrom(...BASES);

const arbListItem = fc.record({
  id: arbText,
  label: arbText,
  order: fc.nat({ max: 99 }),
  enabled: fc.boolean(),
});

const arbFeeling = fc.record({
  id: arbText,
  label: arbText,
  order: fc.nat({ max: 99 }),
  enabled: fc.boolean(),
  builtIn: fc.boolean(),
});

const arbResponse = fc.record({
  id: arbText,
  feelingId: arbText,
  body: arbText,
  basis: arbBasis,
  enabled: fc.boolean(),
  order: fc.nat({ max: 99 }),
  builtIn: fc.boolean(),
});

const arbPlan = fc.record(
  {
    id: arbText,
    place: arbText,
    cueDetail: arbText,
    firstAction: arbText,
    time: arbText,
    days: fc.array(arbWeekDay, { maxLength: 7 }),
    graceMin: fc.nat({ max: 120 }),
    active: fc.boolean(),
    createdAt: fc.nat(),
    editCount: fc.nat({ max: 50 }),
  },
  {
    requiredKeys: [
      'id',
      'place',
      'firstAction',
      'time',
      'days',
      'graceMin',
      'active',
      'createdAt',
      'editCount',
    ],
  },
);

const arbSettings = fc.record(
  {
    theme: fc.constantFrom<Settings['theme']>('system', 'light', 'dark'),
    weekStartsOn: arbWeekDay,
    checkinDay: arbWeekDay,
    checkinDismissedWeek: arbText,
    lastExportAt: fc.nat(),
    persistRequested: fc.boolean(),
    onboarded: fc.boolean(),
  },
  { requiredKeys: ['theme', 'weekStartsOn', 'checkinDay', 'persistRequested', 'onboarded'] },
);

/** Arbitrary configs; optional plan and settings fields are generated both present and absent. */
export function arbConfig(): fc.Arbitrary<Config> {
  return fc.record({
    feelings: fc.array(arbFeeling, { maxLength: 4 }),
    responses: fc.array(arbResponse, { maxLength: 4 }),
    taskTypes: fc.array(arbListItem, { maxLength: 4 }),
    obstacles: fc.array(arbListItem, { maxLength: 4 }),
    plans: fc.array(arbPlan, { maxLength: 4 }),
    settings: arbSettings,
  });
}
