import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';
import type { Plan } from './config';
import { foldLine, planToIcs, utf8Length } from './ics';
import { instantOf, occurrencesBetween, type PlanWords } from './plans';

const words: PlanWords = {
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  today: 'today',
  tomorrow: 'tomorrow',
  weekdays: 'weekdays',
  everyDay: 'every day',
  weekends: 'weekends',
};

const plan: Plan = {
  id: 'p1',
  place: 'my desk',
  cueDetail: 'after coffee; no phone',
  firstAction: 'open the essay doc',
  time: '09:00',
  days: [1, 2, 3, 4, 5],
  graceMin: 30,
  active: true,
  createdAt: 0,
  editCount: 3,
};

function parse(ics: string) {
  const root = new ICAL.Component(ICAL.parse(ics));
  const tzComp = root.getFirstSubcomponent('vtimezone');
  if (!tzComp) throw new Error('no vtimezone');
  ICAL.TimezoneService.register(tzComp);
  const vevent = root.getFirstSubcomponent('vevent');
  if (!vevent) throw new Error('no vevent');
  return { root, vevent, event: new ICAL.Event(vevent) };
}

describe('planToIcs', () => {
  const now = Date.UTC(2026, 9, 26, 12, 0);

  it('writes the required properties with CRLF', () => {
    const ics = planToIcs(plan, 'America/New_York', now, words);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.split('\r\n').every((l) => utf8Length(l) <= 75)).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    const { vevent, event } = parse(ics);
    expect(event.uid).toBe('p1@arohexis');
    expect(vevent.getFirstPropertyValue('sequence')).toBe(3);
    expect(event.summary).toBe(
      "If it's 9:00 at my desk, after coffee; no phone, then open the essay doc",
    );
    expect(event.location).toBe('my desk');
    expect(event.description).toBe('Open Arohexis from your Home Screen.');
    expect(String(vevent.getFirstPropertyValue('duration'))).toBe('PT5M');
    expect(String(vevent.getFirstPropertyValue('rrule'))).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    const alarm = vevent.getFirstSubcomponent('valarm');
    expect(alarm?.getFirstPropertyValue('action')).toBe('DISPLAY');
    expect(String(alarm?.getFirstPropertyValue('trigger'))).toBe('PT0S');
  });

  it.each(['America/New_York', 'Europe/London', 'Australia/Lord_Howe', 'Asia/Kathmandu'])(
    'expands to 09:00 local on both sides of a DST change in %s',
    (tz) => {
      const { event } = parse(planToIcs(plan, tz, now, words));
      const expected = occurrencesBetween(
        { ...plan, days: [1, 2, 3, 4, 5] },
        now - 2 * 86_400_000,
        now + 400 * 86_400_000,
        tz,
      ).map((o) => o.at);
      const it = event.iterator();
      const got: number[] = [];
      const offsets = new Set<number>();
      for (let i = 0; i < expected.length; i++) {
        const next = it.next();
        if (!next) break;
        const t = next;
        expect(t.hour).toBe(9);
        expect(t.minute).toBe(0);
        offsets.add(t.utcOffset());
        got.push(t.toUnixTime() * 1000);
      }
      // The first occurrence is today or later; compare from the matching date on.
      const from = expected.indexOf(got[0] as number);
      expect(from).toBeGreaterThanOrEqual(0);
      expect(got.slice(0, 100)).toEqual(expected.slice(from, from + 100));
      const dst = tz === 'Asia/Kathmandu' ? 1 : 2;
      expect(offsets.size).toBe(dst);
    },
  );

  it('keeps the alarm at 09:00 local across DST in year 8', () => {
    const tz = 'America/New_York';
    const { event } = parse(planToIcs({ ...plan, days: [0, 1, 2, 3, 4, 5, 6] }, tz, now, words));
    const it = event.iterator();
    const from = now + 7 * 365 * 86_400_000;
    const to = now + 8 * 365 * 86_400_000;
    const offsets = new Set<number>();
    let seen = 0;
    for (let t = it.next(); t; t = it.next()) {
      const ms = t.toUnixTime() * 1000;
      if (ms > to) break;
      if (ms < from) continue;
      seen++;
      expect(t.hour).toBe(9);
      offsets.add(t.utcOffset());
    }
    expect(seen).toBeGreaterThan(300);
    expect(offsets.size).toBe(2);
  });

  it('keeps the UTC time of the alarm moving with the offset', () => {
    const before = instantOf('2026-10-30', '09:00', 'America/New_York');
    const after = instantOf('2026-11-02', '09:00', 'America/New_York');
    expect(new Date(before).getUTCHours()).toBe(13);
    expect(new Date(after).getUTCHours()).toBe(14);
  });
});

describe('foldLine', () => {
  it('folds at 75 octets without splitting a character', () => {
    const lines = foldLine(`SUMMARY:${'é'.repeat(40)}€😀${'é'.repeat(40)}`);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(utf8Length(l)).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((l) => l.startsWith(' '))).toBe(true);
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(
      `SUMMARY:${'é'.repeat(40)}€😀${'é'.repeat(40)}`,
    );
    expect(foldLine('short')).toEqual(['short']);
  });
});
