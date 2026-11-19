import { describe, expect, it } from 'vitest';
import { LAND_FRESH_MS, landFor } from './landing';

const newest = { at: 10_000_000, lineId: 'p1:core' };

describe('landFor', () => {
  it('lands a start newer than the last one shown', () => {
    expect(landFor(newest, 9_000_000, newest.at + 5)).toBe('p1:core');
  });
  it('does not land the same start twice, or an older one', () => {
    expect(landFor(newest, newest.at, newest.at + 5)).toBeUndefined();
    expect(landFor(newest, newest.at + 1, newest.at + 5)).toBeUndefined();
  });
  it('does nothing without a start', () => {
    expect(landFor(undefined, undefined, 1)).toBeUndefined();
  });
  it('on a first visit lands only a recent start', () => {
    expect(landFor(newest, undefined, newest.at + LAND_FRESH_MS)).toBe('p1:core');
    expect(landFor(newest, undefined, newest.at + LAND_FRESH_MS + 1)).toBeUndefined();
  });
});
