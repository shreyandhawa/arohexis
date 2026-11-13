import { isCountedStart, type Attempt } from './attempts';
import type { WeekDay } from './config';
import { weekKey, localHour } from './week';
import { partOfStart } from './brainSpace';
import type { Basis } from './events';
import {
  FROM_A_PLAN_ID,
  FROM_A_PLAN_LABEL,
  NO_PART_LABEL,
  OTHER_FEELING_ID,
  DEFAULT_FEELINGS,
} from './defaults';

const OTHER_FEELING_LABEL =
  DEFAULT_FEELINGS.find((f) => f.id === OTHER_FEELING_ID)?.label ?? 'Something else';

/**
 * Counted starts whose own local week (in the zone they were made in) is the
 * current week. Returns one count; no streaks or week-to-week comparisons.
 */
export function startsThisWeek(
  attempts: readonly Attempt[],
  now: number,
  tz: string,
  weekStartsOn: WeekDay,
): number {
  const current = weekKey(now, tz, weekStartsOn);
  let count = 0;
  for (const a of attempts) {
    if (a.start && isCountedStart(a) && weekKey(a.start.at, a.start.tz, weekStartsOn) === current) {
      count++;
    }
  }
  return count;
}

const DAY_MS = 86_400_000;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export type WeekCount = { weekOf: string; count: number };

/**
 * Counted starts per week, contiguous from the first event's week to the
 * current week (zeros included). Each start is bucketed in its own zone.
 */
export function startsByWeek(
  attempts: readonly Attempt[],
  now: number,
  tz: string,
  weekStartsOn: WeekDay,
): WeekCount[] {
  if (attempts.length === 0) return [];
  const counts = new Map<string, number>();
  let first = weekKey(now, tz, weekStartsOn);
  let last = first;
  for (const a of attempts) {
    const opened = weekKey(a.openedAt, a.tz, weekStartsOn);
    if (opened < first) first = opened;
    if (a.start && isCountedStart(a)) {
      const k = weekKey(a.start.at, a.start.tz, weekStartsOn);
      counts.set(k, (counts.get(k) ?? 0) + 1);
      if (k < first) first = k;
      if (k > last) last = k;
    }
  }
  const out: WeekCount[] = [];
  for (let k = first; k <= last; k = addDays(k, 7)) {
    out.push({ weekOf: k, count: counts.get(k) ?? 0 });
  }
  return out;
}

export type FeelingCount = { id: string; label: string; count: number };

/** Counted starts by feeling (newest label wins); unnamed plan starts are "From a plan". */
export function startsByFeeling(attempts: readonly Attempt[]): FeelingCount[] {
  const groups = new Map<string, FeelingCount>();
  for (const a of attempts) {
    if (!isCountedStart(a)) continue;
    const id = a.feeling?.id ?? (a.source === 'plan' ? FROM_A_PLAN_ID : OTHER_FEELING_ID);
    const label =
      a.feeling?.label ?? (a.source === 'plan' ? FROM_A_PLAN_LABEL : OTHER_FEELING_LABEL);
    const g = groups.get(id);
    if (g) {
      g.count++;
      if (a.feeling) g.label = label;
    } else {
      groups.set(id, { id, label, count: 1 });
    }
  }
  return [...groups.values()];
}

/** 24 counts by the local hour of each counted start, in its own zone. */
export function startsByHour(attempts: readonly Attempt[]): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const a of attempts) {
    if (a.start && isCountedStart(a)) {
      const h = localHour(a.start.at, a.start.tz);
      hours[h] = (hours[h] ?? 0) + 1;
    }
  }
  return hours;
}

export type PartCount = { id: string | null; label: string; count: number };

/** Counted starts by `partOfStart`, with "No part" (id null) when any start is untagged. */
export function startsByPart(attempts: readonly Attempt[]): PartCount[] {
  const groups = new Map<string | null, PartCount>();
  for (const a of attempts) {
    if (!isCountedStart(a)) continue;
    const id = partOfStart(a);
    const g = groups.get(id);
    if (g) {
      g.count++;
      if (a.part) g.label = a.part.label;
    } else {
      groups.set(id, { id, label: a.part?.label ?? NO_PART_LABEL, count: 1 });
    }
  }
  return [...groups.values()];
}

export type ResponseStat = {
  responseId: string;
  basis: Basis;
  shown: number;
  ledToStart: number;
  rate: number;
  earlyDays: boolean;
};

export const EARLY_DAYS_BELOW = 5;

/** Per response: times shown (abandoned and dismissed included) and how many led to a counted start. */
export function responseStats(attempts: readonly Attempt[]): ResponseStat[] {
  const groups = new Map<string, ResponseStat>();
  for (const a of attempts) {
    if (!a.response) continue;
    const g = groups.get(a.response.id) ?? {
      responseId: a.response.id,
      basis: a.response.basis,
      shown: 0,
      ledToStart: 0,
      rate: 0,
      earlyDays: true,
    };
    g.shown++;
    if (isCountedStart(a)) g.ledToStart++;
    g.rate = g.ledToStart / g.shown;
    g.earlyDays = g.shown < EARLY_DAYS_BELOW;
    groups.set(g.responseId, g);
  }
  return [...groups.values()];
}
