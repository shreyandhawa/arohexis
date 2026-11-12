import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { buildField, type Field } from './field';

/** What a different engine could flip: each fibre's region and plan flag, its strand lengths, and byRegion. */
const structure = (field: Field) => ({
  fibres: field.fibres.map((f) => ({
    region: f.region,
    forPlans: f.forPlans,
    lengths: f.strands.map((s) => s.length / 3),
  })),
  byRegion: field.byRegion,
});

const NAMES = ['sin', 'cos', 'sqrt', 'pow', 'exp', 'hypot'] as const;

/** Nudges a result by one ulp, up or down. */
const nudge = (x: number, up: boolean): number => {
  if (!Number.isFinite(x) || x === 0) return x;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const bits = view.getBigUint64(0);
  view.setBigUint64(0, x > 0 === up ? bits + 1n : bits - 1n);
  return view.getFloat64(0);
};

describe('engine stability', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the structure when Math results move by one ulp', () => {
    const plain = structure(buildField());
    for (const up of [true, false]) {
      const spies: MockInstance[] = [];
      for (const name of NAMES) {
        const real = Math[name] as (...a: number[]) => number;
        spies.push(
          vi.spyOn(Math, name).mockImplementation((...a: number[]) => nudge(real(...a), up)),
        );
      }
      const nudged = buildField();
      for (const spy of spies.slice(0, 3)) expect(spy).toHaveBeenCalled(); // sin, cos, sqrt
      vi.restoreAllMocks();
      expect(structure(nudged)).toEqual(plain);
    }
  });
});
