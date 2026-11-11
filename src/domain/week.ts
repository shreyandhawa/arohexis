import { TZDate } from '@date-fns/tz';
import { format, startOfWeek } from 'date-fns';
import type { WeekDay } from './config';

/** The local calendar date ('YYYY-MM-DD') of an instant in the given IANA zone. */
export function localDate(at: number, tz: string): string {
  return format(new TZDate(at, tz), 'yyyy-MM-dd');
}

/** The local hour (0-23) of an instant in the given IANA zone. */
export function localHour(at: number, tz: string): number {
  return new TZDate(at, tz).getHours();
}

/** The local date of the first day of the week containing the instant. */
export function weekKey(at: number, tz: string, weekStartsOn: WeekDay): string {
  return format(startOfWeek(new TZDate(at, tz), { weekStartsOn }), 'yyyy-MM-dd');
}
