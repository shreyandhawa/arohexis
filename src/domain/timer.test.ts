import { describe, expect, it } from 'vitest';
import { isUndoProminent, TIMER_SECONDS, timerState, UNDO_PROMINENT_MS } from './timer';

describe('timerState', () => {
  const start = 1_000_000;
  it('counts down', () => {
    expect(timerState(start, start + 30_000)).toEqual({
      elapsedSec: 30,
      remainingSec: 90,
      done: false,
    });
  });
  it('is done at 120 s', () => {
    expect(TIMER_SECONDS).toBe(120);
    expect(timerState(start, start + 120_000)).toEqual({
      elapsedSec: 120,
      remainingSec: 0,
      done: true,
    });
  });
  it('shows done straight away after a locked phone, never negative', () => {
    expect(timerState(start, start + 600_000)).toMatchObject({ remainingSec: 0, done: true });
  });
  it('clamps elapsed at 0 when the clock is behind', () => {
    expect(timerState(start, start - 5_000)).toEqual({
      elapsedSec: 0,
      remainingSec: 120,
      done: false,
    });
  });
});

describe('isUndoProminent', () => {
  it('is true below 10 s and false at 10 s', () => {
    expect(UNDO_PROMINENT_MS).toBe(10_000);
    expect(isUndoProminent(0, 9_999)).toBe(true);
    expect(isUndoProminent(0, 10_000)).toBe(false);
  });
});
