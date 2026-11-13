import { describe, expect, it } from 'vitest';
import { effectiveStill } from './useStill';

describe('effectiveStill', () => {
  it('follows reduced motion when nothing is set', () => {
    expect(effectiveStill(undefined, true)).toBe(true);
    expect(effectiveStill(undefined, false)).toBe(false);
  });

  it('keeps a chosen moving setting under reduced motion', () => {
    expect(effectiveStill('moving', true)).toBe(false);
    expect(effectiveStill('moving', false)).toBe(false);
  });

  it('keeps a chosen still setting', () => {
    expect(effectiveStill('still', false)).toBe(true);
    expect(effectiveStill('still', true)).toBe(true);
  });
});
