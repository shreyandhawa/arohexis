import { isCountedStart, type Attempt } from './attempts';
import type { WeekDay } from './config';
import { weekKey } from './week';

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
