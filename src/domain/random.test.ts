import { describe, expect, it } from 'vitest';
import { hash32, mulberry32 } from './random';

describe('mulberry32', () => {
  it('matches the reference algorithm for seed 1', () => {
    const next = mulberry32(1);
    expect(next()).toBe(0.6270739405881613);
    expect(next()).toBe(0.002735721180215478);
    expect(next()).toBe(0.5274470399599522);
  });

  it('keeps every value in [0, 1)', () => {
    for (const seed of [0, 1, 20261112, 0xffffffff]) {
      const next = mulberry32(seed);
      for (let i = 0; i < 2000; i++) {
        const v = next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('gives the same sequence for the same seed and different ones for different seeds', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const c = mulberry32(8);
    expect([a(), a()]).toEqual([b(), b()]);
    expect(mulberry32(7)()).not.toBe(c());
  });
});

describe('hash32', () => {
  it('is FNV-1a over the text, as an unsigned 32-bit number', () => {
    expect(hash32('')).toBe(2166136261);
    expect(hash32('a')).toBe(0xe40c292c);
  });
});
