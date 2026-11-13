import type { WeekDay } from './config';
import type { AppEvent } from './events';
import { weekKey } from './week';

export { CHECKIN_ATTRIBUTION, CHECKIN_ITEMS, CHECKIN_SCALE_LABELS, CHECKIN_STEM } from './defaults';

export type CheckinAnswers = [number, number, number, number];
export type TrendPoint = { weekOf: string; score: number };

/** The `weekOf` of the check-in period containing `now`: the date of its `checkinDay`. */
export function checkinPeriod(now: number, tz: string, checkinDay: WeekDay): string {
  return weekKey(now, tz, checkinDay);
}

/** Due from the start of the period until submitted or skipped for that period. */
export function isCheckinDue(
  now: number,
  tz: string,
  checkinDay: WeekDay,
  submittedWeeks: readonly string[],
  dismissedWeek: string | undefined,
): boolean {
  const period = checkinPeriod(now, tz, checkinDay);
  return !submittedWeeks.includes(period) && dismissedWeek !== period;
}

/** Mean of the four answers (1 to 7). */
export function scoreCheckin(answers: readonly number[]): number {
  return answers.reduce((n, x) => n + x, 0) / answers.length;
}

/** One point per submitted week, oldest first; the latest submission for a week wins. */
export function checkinTrend(events: readonly AppEvent[]): TrendPoint[] {
  const latest = new Map<string, { at: number; score: number }>();
  for (const e of events) {
    if (e.type !== 'checkin.submitted') continue;
    const prev = latest.get(e.weekOf);
    if (!prev || e.at >= prev.at)
      latest.set(e.weekOf, { at: e.at, score: scoreCheckin(e.answers) });
  }
  return [...latest.entries()]
    .map(([weekOf, v]) => ({ weekOf, score: v.score }))
    .sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1));
}
