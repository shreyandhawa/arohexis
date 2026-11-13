import { TZDate } from '@date-fns/tz';
import { foldAttempts, isCountedStart } from './attempts';
import type { Plan, WeekDay } from './config';
import type { AppEvent } from './events';
import { localDate } from './week';

export type Occurrence = { planId: string; date: string; at: number };
export type OccurrenceStatus = 'started' | 'resolved' | 'upcoming' | 'open' | 'slipped';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
/** An occurrence opens this long before its time. */
export const OPEN_LEAD_MS = 15 * MIN;

/** The UTC offset in minutes (east positive) of a zone at an instant. */
export function offsetMinutes(at: number, tz: string): number {
  return -new TZDate(at, tz).getTimezoneOffset();
}

/**
 * The instant of a wall-clock time on a local date. A time in a spring-forward gap moves to
 * the first valid minute after it; an ambiguous time takes the first instance (spec §6.4).
 */
export function instantOf(date: string, time: string, tz: string): number {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const before = offsetMinutes(wall - DAY, tz);
  const after = offsetMinutes(wall + DAY, tz);
  const valid = [before, after]
    .map((off) => wall - off * MIN)
    .filter((t, i, all) => all.indexOf(t) === i && wall - offsetMinutes(t, tz) * MIN === t);
  if (valid.length > 0) return Math.min(...valid);
  // In a gap: find the first minute at the new offset.
  let lo = wall - Math.max(before, after) * MIN;
  let hi = wall - Math.min(before, after) * MIN;
  while (hi - lo > MIN) {
    const mid = lo + Math.floor((hi - lo) / MIN / 2) * MIN;
    if (offsetMinutes(mid, tz) === after) hi = mid;
    else lo = mid;
  }
  return hi;
}

function addDays(date: string, n: number): string {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10);
}

function weekdayOf(date: string): WeekDay {
  return new Date(`${date}T00:00:00Z`).getUTCDay() as WeekDay;
}

/** Occurrences with `from <= at <= to`, oldest first. Paused plans have none; nothing before `createdAt`. */
export function occurrencesBetween(plan: Plan, from: number, to: number, tz: string): Occurrence[] {
  if (!plan.active || to < from) return [];
  const out: Occurrence[] = [];
  const last = addDays(localDate(to, tz), 1);
  for (let date = addDays(localDate(from, tz), -1); date <= last; date = addDays(date, 1)) {
    if (!plan.days.includes(weekdayOf(date))) continue;
    const at = instantOf(date, plan.time, tz);
    if (at >= from && at <= to && at >= plan.createdAt) out.push({ planId: plan.id, date, at });
  }
  return out;
}

/** Spec §6.4: the first matching rule, in order. */
export function occurrenceStatus(
  plan: Plan,
  occurrence: Occurrence,
  events: readonly AppEvent[],
  now: number,
): OccurrenceStatus {
  const linked = foldAttempts(events).some(
    (a) => a.planId === plan.id && a.occurrence === occurrence.date && isCountedStart(a),
  );
  if (linked) return 'started';
  const resolved = events.some(
    (e) =>
      (e.type === 'occurrence.resolved' || e.type === 'lapse.repaired') &&
      e.planId === plan.id &&
      e.occurrence === occurrence.date,
  );
  if (resolved) return 'resolved';
  if (now < occurrence.at - OPEN_LEAD_MS) return 'upcoming';
  if (now <= occurrence.at + plan.graceMin * MIN) return 'open';
  return 'slipped';
}

/** The earliest occurrence that is open at `now`, if any. */
export function openOccurrence(
  plan: Plan,
  events: readonly AppEvent[],
  now: number,
  tz: string,
): Occurrence | undefined {
  return occurrencesBetween(plan, now - plan.graceMin * MIN, now + OPEN_LEAD_MS, tz).find(
    (o) => occurrenceStatus(plan, o, events, now) === 'open',
  );
}

/** The next occurrence that has not opened yet, within the coming week. */
export function nextOccurrence(
  plan: Plan,
  events: readonly AppEvent[],
  now: number,
  tz: string,
): Occurrence | undefined {
  return occurrencesBetween(plan, now, now + 8 * DAY, tz).find(
    (o) => occurrenceStatus(plan, o, events, now) === 'upcoming',
  );
}

/** "today", "tomorrow" or a weekday name, for the day of `at` as seen from `now`. */
export function dayWord(at: number, now: number, tz: string): string {
  const date = localDate(at, tz);
  const today = localDate(now, tz);
  if (date === today) return 'today';
  if (date === addDays(today, 1)) return 'tomorrow';
  return DAY_NAMES[weekdayOf(date)] as string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "9:00" or "13:30". */
export function formatPlanTime(time: string): string {
  const [h, m] = time.split(':');
  return `${Number(h)}:${m}`;
}

export function daysPhrase(days: readonly WeekDay[]): string {
  const key = [...new Set(days)].sort().join('');
  if (key === '12345') return 'weekdays';
  if (key === '0123456') return 'every day';
  if (key === '06') return 'weekends';
  return [...new Set(days)]
    .sort((a, b) => a - b)
    .map((d) => (DAY_NAMES[d] as string).slice(0, 3))
    .join(', ');
}

function trimAction(text: string): string {
  return text.trim().replace(/[.]+$/, '');
}

/**
 * "If it's 9:00 on weekdays at my desk, then I will open the essay doc."
 * The `calendar` form drops the days and "I will": "If it's 9:00 at my desk, then open the essay doc".
 */
export function planSentence(plan: Plan, form: 'full' | 'calendar' = 'full'): string {
  const place = plan.place.trim();
  const detail = plan.cueDetail?.trim();
  const where = [place, detail].filter((s): s is string => !!s).join(', ');
  const when = [
    `If it's ${formatPlanTime(plan.time)}`,
    form === 'full' && plan.days.length > 0 ? `on ${daysPhrase(plan.days)}` : '',
    where ? (place ? `at ${where}` : where) : '',
  ]
    .filter(Boolean)
    .join(' ');
  const action = trimAction(plan.firstAction);
  return form === 'full' ? `${when}, then I will ${action}.` : `${when}, then ${action}`;
}

/** Problems with a plan record; empty when valid. */
export function validatePlan(plan: Plan): string[] {
  const problems: string[] = [];
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(plan.time)) problems.push('time');
  if (plan.days.length === 0 || plan.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
    problems.push('days');
  if (plan.firstAction.trim() === '') problems.push('firstAction');
  if (!Number.isFinite(plan.graceMin) || plan.graceMin < 0) problems.push('graceMin');
  return problems;
}
