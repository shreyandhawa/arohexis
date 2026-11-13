import type { Plan, WeekDay } from './config';
import { instantOf, offsetMinutes, planSentence, type PlanWords } from './plans';
import { localDate } from './week';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const YEARS_MS = 10 * 366 * DAY;
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

type Transition = { at: number; from: number; to: number };

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

/** `YYYYMMDDTHHMMSS` of an instant read at a fixed offset (minutes). */
function localStamp(at: number, offset: number): string {
  const d = new Date(at + offset * MIN);
  return (
    `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function offsetText(offset: number): string {
  const abs = Math.abs(offset);
  return `${offset < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

/** UTC-offset transitions in [start, end], found by a daily scan and a minute bisection. */
function transitionsBetween(tz: string, start: number, end: number): Transition[] {
  const out: Transition[] = [];
  let prev = offsetMinutes(start, tz);
  for (let t = start; t < end; t += DAY) {
    const next = offsetMinutes(t + DAY, tz);
    if (next === prev) continue;
    let lo = t;
    let hi = t + DAY;
    while (hi - lo > MIN) {
      const mid = lo + Math.floor((hi - lo) / MIN / 2) * MIN;
      if (offsetMinutes(mid, tz) === prev) lo = mid;
      else hi = mid;
    }
    out.push({ at: hi, from: prev, to: next });
    prev = next;
  }
  return out;
}

function vtimezone(tz: string, start: number): string[] {
  const transitions = transitionsBetween(tz, start - DAY, start + YEARS_MS);
  const initial = offsetMinutes(start - DAY, tz);
  const other = transitions[0]?.to;
  const lines = ['BEGIN:VTIMEZONE', `TZID:${tz}`];
  const observance = (
    kind: 'STANDARD' | 'DAYLIGHT',
    from: number,
    to: number,
    dtstart: string,
    rdates: string[],
  ) => {
    lines.push(
      `BEGIN:${kind}`,
      `DTSTART:${dtstart}`,
      `TZOFFSETFROM:${offsetText(from)}`,
      `TZOFFSETTO:${offsetText(to)}`,
      `TZNAME:${offsetText(to)}`,
      ...rdates.map((r) => `RDATE:${r}`),
      `END:${kind}`,
    );
  };
  observance(
    other !== undefined && initial > other ? 'DAYLIGHT' : 'STANDARD',
    initial,
    initial,
    '19700101T000000',
    [],
  );
  const groups = new Map<string, Transition[]>();
  for (const t of transitions) {
    const key = `${t.from}:${t.to}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  for (const [first, ...rest] of groups.values()) {
    if (!first) continue;
    observance(
      first.to > first.from ? 'DAYLIGHT' : 'STANDARD',
      first.from,
      first.to,
      localStamp(first.at, first.from),
      [first, ...rest].map((t) => localStamp(t.at, t.from)), // ical.js reads only RDATEs when any exist,
    );
  }
  lines.push('END:VTIMEZONE');
  return lines;
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function utf8Length(text: string): number {
  let n = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    n += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return n;
}

/** Folds a content line at 75 octets, never inside a UTF-8 character (RFC 5545 §3.1). */
export function foldLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const bytes = utf8Length(ch);
    // Continuation lines start with a space, which counts toward the 75.
    if (size + bytes > 75) {
      out.push(current);
      current = ' ';
      size = 1;
    }
    current += ch;
    size += bytes;
  }
  out.push(current);
  return out;
}

/** The first local date, today or later, that falls on one of the plan's days. */
function firstDate(plan: Plan, now: number, tz: string): string {
  const [y, m, d] = localDate(now, tz).split('-').map(Number) as [number, number, number];
  for (let i = 0; i < 7; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i));
    if (plan.days.includes(day.getUTCDay() as WeekDay)) return day.toISOString().slice(0, 10);
  }
  return localDate(now, tz);
}

/** One VEVENT for a plan, with its VTIMEZONE, as an iCalendar string (spec §6.4). */
export function planToIcs(plan: Plan, tz: string, now: number, words: PlanWords): string {
  const date = firstDate(plan, now, tz);
  const startAt = instantOf(date, plan.time, tz);
  const dtstart = localStamp(startAt, offsetMinutes(startAt, tz));
  const days = [...new Set(plan.days)].sort((a, b) => a - b).map((d) => BYDAY[d]);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arohexis//Plans//EN',
    'CALSCALE:GREGORIAN',
    ...vtimezone(tz, startAt),
    'BEGIN:VEVENT',
    `UID:${plan.id}@arohexis`,
    `SEQUENCE:${plan.editCount}`,
    `DTSTAMP:${localStamp(now, 0)}Z`,
    `DTSTART;TZID=${tz}:${dtstart}`,
    'DURATION:PT5M',
    `RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')}`,
    `SUMMARY:${escapeText(planSentence(plan, 'calendar', words))}`,
    `LOCATION:${escapeText(plan.place)}`,
    'DESCRIPTION:Open Arohexis from your Home Screen.',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Plan reminder',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.flatMap(foldLine).join('\r\n') + '\r\n';
}
