import type { Clock, IdGen } from '../ports';

export type TestClock = Clock & {
  set(at: number): void;
  advance(ms: number): void;
  setTimeZone(tz: string): void;
};

export function testDeps(opts: { at?: number; tz?: string } = {}): {
  clock: TestClock;
  ids: IdGen;
} {
  let at = opts.at ?? Date.UTC(2026, 10, 16, 14, 0);
  let tz = opts.tz ?? 'America/New_York';
  let n = 0;
  const clock: TestClock = {
    now: () => at,
    timeZone: () => tz,
    set: (value) => {
      at = value;
    },
    advance: (ms) => {
      at += ms;
    },
    setTimeZone: (value) => {
      tz = value;
    },
  };
  const ids: IdGen = { next: () => `id-${++n}` };
  return { clock, ids };
}
