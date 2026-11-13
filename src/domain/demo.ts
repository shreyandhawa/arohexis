import { startFromPlan } from './commands';
import type { Config, Part, Plan, WeekDay } from './config';
import {
  DEFAULT_FEELINGS,
  DEFAULT_OBSTACLES,
  DEFAULT_RESPONSES,
  GENERIC_RESPONSE_ID,
} from './defaults';
import { createEvent, type AppEvent, type EventDeps } from './events';
import type { ExportData } from './exportFormat';
import { instantOf } from './plans';
import { mulberry32 } from './random';
import { weekKey } from './week';

export const DEMO_SEED = 20261111;
export const DEMO_WEEKS = 10;
/** The five demo parts (spec §16.11). Ids and labels differ from the defaults. */
export const DEMO_PARTS: readonly Part[] = [
  { id: 'portfolio', label: 'Portfolio', order: 1, enabled: true, colour: 1, region: 1 },
  { id: 'studies', label: 'Studies', order: 2, enabled: true, colour: 2, region: 2 },
  { id: 'fitness', label: 'Fitness', order: 3, enabled: true, colour: 3, region: 3 },
  { id: 'money', label: 'Money', order: 4, enabled: true, colour: 4, region: 4 },
  { id: 'home', label: 'Home', order: 5, enabled: true, colour: 5, region: 5 },
];

const MIN = 60_000;
const DAY_COUNT = DEMO_WEEKS * 7;
const DIP_WEEKS = new Set([3, 7]);
const HOUR_WINDOWS: readonly (readonly [lo: number, hi: number, weight: number])[] = [
  [8, 11, 5],
  [14, 16, 3],
  [20, 22, 3],
];

type PlanSpec = {
  plan: Omit<Plan, 'createdAt' | 'activeSince'>;
  startWeek: number;
  /** Indexes (among this plan's on-cue starts) tagged to another part, so a New line appears. */
  retag?: { indexes: readonly number[]; partId: string };
};
const PLAN_SPECS: readonly PlanSpec[] = [
  {
    plan: {
      id: 'demo-plan-weekdays',
      place: 'at my desk',
      cueDetail: 'after coffee',
      firstAction: 'open the portfolio draft',
      time: '09:00',
      days: [1, 2, 3, 4, 5],
      graceMin: 30,
      active: true,
      editCount: 0,
      partId: 'portfolio',
    },
    startWeek: 0,
  },
  {
    plan: {
      id: 'demo-plan-mwf',
      place: 'by the front door',
      firstAction: 'put on my walking shoes',
      time: '15:00',
      days: [1, 3, 5],
      graceMin: 30,
      active: true,
      editCount: 0,
      partId: 'fitness',
    },
    startWeek: 2,
    retag: { indexes: [3, 7], partId: 'home' },
  },
  {
    plan: {
      id: 'demo-plan-tt',
      place: 'at the kitchen table',
      firstAction: 'open my notes',
      time: '20:30',
      days: [2, 4],
      graceMin: 30,
      active: true,
      editCount: 0,
      partId: 'studies',
    },
    startWeek: 5,
  },
];

const partFor = (partId: string | undefined) => (partId === undefined ? {} : { partId });

function addDays(date: string, n: number): string {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10);
}
function weekdayOf(date: string): WeekDay {
  return new Date(`${date}T00:00:00Z`).getUTCDay() as WeekDay;
}
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Ten weeks of realistic demo data ending on `endDate` ('YYYY-MM-DD', local to `tz`). Pure and
 * deterministic for a seed (spec §7.4, §16.11). Week 1 is the oldest block of seven days.
 */
export function generateDemoData(seed: number, endDate: string, tz: string): ExportData {
  const rng = mulberry32(seed);
  const int = (n: number) => Math.floor(rng() * n);
  const days = Array.from({ length: DAY_COUNT }, (_, i) => addDays(endDate, i - (DAY_COUNT - 1)));
  let n = 0;
  let cur = 0;
  const deps: EventDeps = {
    clock: { now: () => cur, timeZone: () => tz },
    ids: { next: () => `demo-${++n}` },
  };
  const events: AppEvent[] = [];
  const emit = <T extends AppEvent['type']>(
    at: number,
    type: T,
    payload: Parameters<typeof createEvent<T>>[2],
  ) => {
    cur = at;
    events.push(createEvent(deps, type, payload));
  };
  const timeOn = (date: string): number => {
    const roll = rng() * HOUR_WINDOWS.reduce((s, w) => s + w[2], 0);
    let acc = 0;
    const [lo, hi] = HOUR_WINDOWS.find((w) => (acc += w[2]) > roll) ?? HOUR_WINDOWS[0]!;
    const hour = lo + int(hi - lo);
    return instantOf(
      date,
      `${String(hour).padStart(2, '0')}:${String(int(60)).padStart(2, '0')}`,
      tz,
    );
  };

  // Plans, started in turn.
  const plans: Plan[] = PLAN_SPECS.map(({ plan, startWeek }) => {
    const createdAt = instantOf(days[startWeek * 7] as string, '00:01', tz);
    return { ...plan, createdAt, activeSince: createdAt };
  });
  const planStartsByWeek = new Array<number>(DEMO_WEEKS).fill(0);
  PLAN_SPECS.forEach((spec, p) => {
    const plan = plans[p] as Plan;
    let onCue = 0;
    days.forEach((date, i) => {
      if (i < spec.startWeek * 7 || !plan.days.includes(weekdayOf(date))) return;
      const at = instantOf(date, plan.time, tz);
      if (rng() < (DIP_WEEKS.has(Math.floor(i / 7)) ? 0.6 : 0.92)) {
        const startAt = at + int(12) * MIN;
        const retagged = spec.retag?.indexes.includes(onCue) === true;
        cur = startAt;
        events.push(
          ...startFromPlan(
            deps,
            { id: plan.id, ...partFor(retagged ? spec.retag?.partId : plan.partId) },
            DEMO_PARTS,
            date,
          ),
        );
        onCue += 1;
        planStartsByWeek[Math.floor(i / 7)] = (planStartsByWeek[Math.floor(i / 7)] ?? 0) + 1;
      } else if (rng() < 0.7) {
        const obstacle = DEFAULT_OBSTACLES[int(DEFAULT_OBSTACLES.length)];
        emit(at + (plan.graceMin + 60 + int(240)) * MIN, 'lapse.repaired', {
          planId: plan.id,
          occurrence: date,
          startedAnyway: false,
          ...(obstacle && { obstacleId: obstacle.id, obstacleLabel: obstacle.label }),
          choice: rng() < 0.5 ? 'keep' : 'smaller',
        });
      } else {
        emit(at + (plan.graceMin + 30) * MIN, 'occurrence.resolved', {
          planId: plan.id,
          occurrence: date,
          outcome: 'expired',
        });
      }
    });
  });

  // Stuck-flow starts and attempts that did not start.
  let tagged = 0;
  for (let w = 0; w < DEMO_WEEKS; w++) {
    const t = w / (DEMO_WEEKS - 1);
    const target = (6 + 9 * t) * (DIP_WEEKS.has(w) ? 0.7 : 1);
    const starts = Math.max(1, Math.round(target - (planStartsByWeek[w] ?? 0)));
    const rate = 0.55 + 0.25 * t;
    const dismissed = Math.round((starts * (1 - rate)) / rate);
    const feelingWeights = [
      4 * (1 - t) + 1, // anxious
      1 + 3 * t, // bored
      3 * (1 - t) + 1, // overwhelmed
      1 + 3 * t, // unsure
      1, // perfectionistic
      0.5, // something else
    ];
    for (let k = 0; k < starts + dismissed; k++) {
      const isStart = k < starts;
      const forcedLast = w === DEMO_WEEKS - 1 && k === 0;
      const date = forcedLast ? endDate : (days[w * 7 + int(7)] as string);
      const at = timeOn(date);
      let roll = rng() * feelingWeights.reduce((s, x) => s + x, 0);
      const fi = feelingWeights.findIndex((x) => (roll -= x) < 0);
      const feeling = DEFAULT_FEELINGS[fi] ?? DEFAULT_FEELINGS[0]!;
      const pool = DEFAULT_RESPONSES.filter(
        (r) => r.feelingId === feeling.id || r.id === GENERIC_RESPONSE_ID,
      );
      const response = pool[int(pool.length)] ?? pool[0]!;
      const attemptId = `demo-attempt-${++n}`;
      emit(at, 'attempt.opened', { attemptId, source: 'stuck' });
      emit(at + 5_000, 'feeling.named', {
        attemptId,
        feelingId: feeling.id,
        label: feeling.label,
      });
      emit(at + 5_000, 'response.shown', {
        attemptId,
        feelingId: feeling.id,
        responseId: response.id,
        basis: response.basis,
      });
      if (!isStart) {
        emit(at + 3 * MIN, 'attempt.dismissed', { attemptId });
        continue;
      }
      emit(at + MIN, 'start.made', { attemptId, backfilled: false });
      if (rng() < 0.45) {
        const part = DEMO_PARTS[tagged < DEMO_PARTS.length ? tagged : int(DEMO_PARTS.length)];
        tagged += 1;
        if (part) {
          emit(at + MIN + 20_000, 'start.tagged', {
            attemptId,
            taskTypeId: part.id,
            label: part.label,
          });
        }
      }
      if (rng() < 0.5) {
        emit(at + 12 * MIN, 'timer.closed', {
          attemptId,
          elapsedSec: 120 + int(600),
          outcome: rng() < 0.6 ? 'kept-going' : 'stopped',
        });
      }
    }

    // A weekly check-in on the block's last day, rising with noise.
    const date = days[w * 7 + 6] as string;
    const base = 2.5 + 2.1 * t;
    const answers = [0, 1, 2, 3].map((): number =>
      clamp(Math.round(base + (rng() - 0.5) * 1.6), 1, 7),
    ) as [number, number, number, number];
    emit(instantOf(date, '19:00', tz), 'checkin.submitted', {
      weekOf: weekKey(instantOf(date, '12:00', tz), tz, 1),
      answers,
    });
  }

  events.sort((x, y) => x.at - y.at);
  const config: Config = {
    feelings: [...DEFAULT_FEELINGS],
    responses: [...DEFAULT_RESPONSES],
    parts: [...DEMO_PARTS],
    obstacles: [...DEFAULT_OBSTACLES],
    plans,
    settings: {
      theme: 'system',
      weekStartsOn: 1,
      checkinDay: 0,
      persistRequested: false,
      onboarded: true,
    },
  };
  return { ...config, events };
}
