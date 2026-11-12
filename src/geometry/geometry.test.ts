import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { assignFibres, type LineRef, type Placement } from './assign';
import {
  BRAIN_SEED,
  buildField,
  FIBRE_COUNT,
  FIELD_HASH,
  fieldHash,
  PLAN_FIBRES_PER_REGION,
  PULL_DIRECTIONS,
  regionKey,
  STRANDS_PER_FIBRE,
  STRAND_POINTS_MAX,
  STRAND_POINTS_MIN,
  type Field,
  type RegionKey,
} from './field';
import { lineShade } from './shade';

const REGIONS: readonly RegionKey[] = [
  'region-1',
  'region-2',
  'region-3',
  'region-4',
  'region-5',
  'region-6',
  'core',
];
const TWO_HALF: readonly RegionKey[] = ['region-1', 'region-2', 'region-3', 'region-4', 'region-6'];

const field: Field = buildField();

const PARTS: readonly (string | null)[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', null];
const regionOfPart = (partId: string | null): RegionKey =>
  partId === null ? 'core' : (`region-${partId.slice(1)}` as RegionKey);

const startsOf = (region: RegionKey): number =>
  field.byRegion[region].filter((i) => !field.fibres[i]!.forPlans).length;

const meanOf = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** A fibre's mean x, over every vertex of every strand. */
const fibreX = (index: number): number => {
  const xs: number[] = [];
  for (const strand of field.fibres[index]!.strands) {
    for (let i = 0; i < strand.length; i += 3) xs.push(strand[i]!);
  }
  return meanOf(xs);
};

/** A region's centroid: the mean of every strand's middle vertex. */
const centroid = (region: RegionKey): [number, number, number] => {
  const mids: [number, number, number][] = [];
  for (const i of field.byRegion[region]) {
    for (const s of field.fibres[i]!.strands) {
      const m = ((s.length / 3) >> 1) * 3;
      mids.push([s[m]!, s[m + 1]!, s[m + 2]!]);
    }
  }
  return [
    meanOf(mids.map((m) => m[0])),
    meanOf(mids.map((m) => m[1])),
    meanOf(mids.map((m) => m[2])),
  ];
};

describe('field', () => {
  it('same seed, same field', () => {
    expect(fieldHash(buildField())).toBe(fieldHash(buildField()));
    expect(fieldHash(buildField(BRAIN_SEED))).toBe(FIELD_HASH);
    expect(fieldHash(buildField(BRAIN_SEED + 1))).not.toBe(FIELD_HASH);
  });

  it('counts', () => {
    expect(field.fibres).toHaveLength(FIBRE_COUNT);
    field.fibres.forEach((f, i) => {
      expect(f.index).toBe(i);
      expect(f.strands).toHaveLength(STRANDS_PER_FIBRE);
    });
    let vertices = 0;
    for (const f of field.fibres) {
      for (const s of f.strands) {
        const n = s.length / 3;
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(STRAND_POINTS_MIN);
        expect(n).toBeLessThanOrEqual(STRAND_POINTS_MAX);
        vertices += n;
      }
    }
    expect(field.vertexCount).toBe(vertices);
    expect(field.vertexCount).toBeGreaterThanOrEqual(75_000);
    expect(field.vertexCount).toBeLessThanOrEqual(90_000);
    expect(field.endCount).toBe(FIBRE_COUNT * STRANDS_PER_FIBRE);
  });

  it('regions', () => {
    let total = 0;
    for (const key of REGIONS) {
      const indices = field.byRegion[key];
      total += indices.length;
      expect(indices.length).toBeGreaterThan(PLAN_FIBRES_PER_REGION);
      for (const i of indices) expect(field.fibres[i]!.region).toBe(key);
      expect(indices.filter((i) => field.fibres[i]!.forPlans)).toHaveLength(PLAN_FIBRES_PER_REGION);
    }
    expect(total).toBe(FIBRE_COUNT);
    for (const f of field.fibres) {
      for (const s of f.strands) {
        for (const v of s) {
          expect(v).toBeGreaterThanOrEqual(-1);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('shape', () => {
    const [cx, cy, cz] = centroid('core');
    expect(Math.hypot(cx, cy, cz)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(centroid('region-5')[0])).toBeLessThanOrEqual(0.1);
    expect(Math.abs(cx)).toBeLessThanOrEqual(0.1);

    for (const key of TWO_HALF) {
      const sides = new Set<number>();
      for (const i of field.byRegion[key]) {
        const side = Math.sign(fibreX(i));
        sides.add(side);
        for (const s of field.fibres[i]!.strands) {
          for (let k = 0; k < s.length; k += 3) expect(s[k]! * side).toBeGreaterThanOrEqual(-0.05);
        }
      }
      expect([...sides].sort()).toEqual([-1, 1]);
    }

    const six = REGIONS.filter((k) => k !== 'core').map(centroid);
    for (let a = 0; a < six.length; a++) {
      for (let b = a + 1; b < six.length; b++) {
        const p = six[a]!;
        const q = six[b]!;
        expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])).toBeGreaterThanOrEqual(0.3);
      }
    }
  });

  it('maps parts to region keys', () => {
    expect(regionKey(null)).toBe('core');
    expect(regionKey(1)).toBe('region-1');
    expect(regionKey(6)).toBe('region-6');
  });

  it('PULL_DIRECTIONS are unit vectors, and the core is zero', () => {
    for (const key of REGIONS) {
      const [x, y, z] = PULL_DIRECTIONS[key];
      if (key === 'core') expect([x, y, z]).toEqual([0, 0, 0]);
      else expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
    }
  });
});

const lineArb = (orderFrom: number, orderTo: number, idPrefix: string) =>
  fc
    .uniqueArray(
      fc.record({
        n: fc.integer({ min: 0, max: 400 }),
        kind: fc.constantFrom<'plan' | 'start'>('plan', 'start'),
        partId: fc.constantFrom(...PARTS),
        order: fc.integer({ min: orderFrom, max: orderTo }),
        waiting: fc.boolean(),
      }),
      { selector: (r) => r.n, maxLength: 90 },
    )
    .map((rows): LineRef[] =>
      rows.map((r) => ({
        id: `${idPrefix}${r.n}`,
        kind: r.kind,
        partId: r.kind === 'plan' && r.partId === null ? 'p1' : r.partId,
        order: r.order,
        waiting: r.kind === 'plan' && r.waiting,
      })),
    );

const run = (lines: readonly LineRef[]) => assignFibres(lines, field, regionOfPart);

const startLines = (count: number, partId: string | null): LineRef[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `s-${partId}-${i}`,
    kind: 'start',
    partId,
    order: i,
    waiting: false,
  }));

describe('assignFibres', () => {
  it('assignment is stable when lines are appended', () => {
    fc.assert(
      fc.property(lineArb(0, 20, 'a'), lineArb(21, 40, 'b'), (prefix, suffix) => {
        const before = run(prefix);
        const after = run([...prefix, ...suffix]);
        for (const line of prefix) {
          if (!line.waiting) expect(after.get(line.id)).toEqual(before.get(line.id));
        }
      }),
      { numRuns: 60 },
    );
  });

  it('waiting lines never displace non-waiting lines', () => {
    fc.assert(
      fc.property(lineArb(0, 30, 'x'), (lines) => {
        const solid = lines.filter((l) => !l.waiting);
        const alone = run(solid);
        const all = run(lines);
        for (const line of solid) expect(all.get(line.id)).toEqual(alone.get(line.id));
      }),
      { numRuns: 60 },
    );
  });

  it('plan lines use plan fibres and start lines never do', () => {
    fc.assert(
      fc.property(lineArb(0, 30, 'y'), (lines) => {
        const placed = run(lines);
        const taken = new Set<number>();
        for (const line of lines) {
          const p = placed.get(line.id)!;
          expect(p).toBeDefined();
          if (p.kind === 'none') continue;
          const fibre = field.fibres[p.fibre]!;
          expect(fibre.region).toBe(regionOfPart(line.partId));
          expect(fibre.forPlans).toBe(line.kind === 'plan');
          if (p.kind === 'fibre') {
            expect(taken.has(p.fibre)).toBe(false);
            taken.add(p.fibre);
          }
        }
      }),
      { numRuns: 60 },
    );
  });

  it('gives a plan line none once its region has no plan fibre left', () => {
    const lines: LineRef[] = Array.from({ length: PLAN_FIBRES_PER_REGION + 2 }, (_, i) => ({
      id: `plan-${i}`,
      kind: 'plan',
      partId: 'p3',
      order: i,
      waiting: false,
    }));
    const kinds = lines.map((l) => run(lines).get(l.id)!.kind);
    expect(kinds.filter((k) => k === 'fibre')).toHaveLength(PLAN_FIBRES_PER_REGION);
    expect(kinds.slice(-2)).toEqual(['none', 'none']);
  });

  it('places waiting lines after non-waiting ones, in order then id', () => {
    const lines: LineRef[] = [
      { id: 'w', kind: 'plan', partId: 'p1', order: 0, waiting: true },
      { id: 'b', kind: 'plan', partId: 'p1', order: 5, waiting: false },
      { id: 'a', kind: 'plan', partId: 'p1', order: 5, waiting: false },
    ];
    const withoutW = run(lines.slice(1));
    expect(run(lines).get('a')).toEqual(withoutW.get('a'));
    expect(run(lines).get('b')).toEqual(withoutW.get('b'));
    expect(run(lines).get('w')!.kind).toBe('fibre');
  });

  it('overflow lights ends in order and removes nothing', () => {
    const starts = startsOf('region-2');
    const lines = startLines(starts + 20, 'p2');
    const placed = run(lines);
    const base = run(lines.slice(0, starts));
    const fibreOf = (i: number) => (placed.get(lines[i]!.id) as { fibre: number }).fibre;

    for (let i = 0; i < starts; i++) {
      expect(placed.get(lines[i]!.id)).toEqual(base.get(lines[i]!.id));
      expect(placed.get(lines[i]!.id)!.kind).toBe('fibre');
    }
    const perFibre = STRANDS_PER_FIBRE - 1;
    for (let k = 0; k < 20; k++) {
      expect(placed.get(lines[starts + k]!.id)).toEqual({
        kind: 'end',
        fibre: fibreOf(Math.floor(k / perFibre)),
        strand: 1 + (k % perFibre),
      });
    }
  });

  it('gives none once every end in a region is lit, and lights each end once', () => {
    const starts = startsOf('region-6');
    const lines = startLines(starts * STRANDS_PER_FIBRE + 3, 'p6');
    const placed = run(lines);
    const lit = new Set<string>();
    let none = 0;
    for (const l of lines) {
      const p: Placement = placed.get(l.id)!;
      if (p.kind === 'none') none++;
      else lit.add(`${p.fibre}:${p.kind === 'end' ? p.strand : 0}`);
    }
    expect(none).toBe(3);
    expect(lit.size).toBe(starts * STRANDS_PER_FIBRE);
  });

  it('core sparks take core ends', () => {
    const starts = startsOf('core');
    const placed = run(startLines(starts + 5, null));
    for (const p of placed.values()) {
      expect(p.kind).not.toBe('none');
      if (p.kind === 'none') continue;
      expect(field.fibres[p.fibre]!.region).toBe('core');
      expect(field.fibres[p.fibre]!.forPlans).toBe(false);
    }
    expect([...placed.values()].filter((p) => p.kind === 'end')).toHaveLength(5);
  });
});

describe('lineShade', () => {
  const hue = fc.integer({ min: 0, max: 359 });
  it('stays within range and is stable per id', () => {
    fc.assert(
      fc.property(
        fc.string(),
        hue,
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 10, max: 90 }),
        (id, h, s, l) => {
          const out = lineShade(id, { h, s, l });
          const gap = Math.abs(out.h - h);
          expect(Math.min(gap, 360 - gap)).toBeLessThanOrEqual(8 + 1e-9);
          expect(out.h).toBeGreaterThanOrEqual(0);
          expect(out.h).toBeLessThan(360);
          expect(Math.abs(out.l - l)).toBeLessThanOrEqual(6 + 1e-9);
          expect(out.s).toBe(s);
          expect(lineShade(id, { h, s, l })).toEqual(out);
        },
      ),
    );
  });

  it('varies between ids, and clamps lightness to [0, 100]', () => {
    const base = { h: 190, s: 90, l: 60 };
    const ids = Array.from({ length: 20 }, (_, i) => `line-${i}`);
    expect(new Set(ids.map((id) => lineShade(id, base).h)).size).toBeGreaterThan(10);
    for (const id of ids) {
      expect(lineShade(id, { h: 5, s: 50, l: 98 }).l).toBeLessThanOrEqual(100);
      expect(lineShade(id, { h: 5, s: 50, l: 2 }).l).toBeGreaterThanOrEqual(0);
    }
  });
});
