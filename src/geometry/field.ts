import type { RegionId } from '../domain/config';
import { mulberry32 } from '../domain/random';

export const BRAIN_SEED = 20261112;
export const FIBRE_COUNT = 670;
export const STRANDS_PER_FIBRE = 8;
export const STRAND_POINTS_MIN = 8;
export const STRAND_POINTS_MAX = 22;
export const PLAN_FIBRES_PER_REGION = 12;
/** Pinned on the first green run. Changing it moves every user's light, so it needs an ADR. */
export const FIELD_HASH = 2077482883;

export type RegionKey =
  'region-1' | 'region-2' | 'region-3' | 'region-4' | 'region-5' | 'region-6' | 'core';

/** `strands` hold x, y, z interleaved, each within [-1, 1]. */
export type Fibre = {
  index: number;
  region: RegionKey;
  forPlans: boolean;
  strands: readonly Float32Array[];
};

export type Field = {
  fibres: readonly Fibre[];
  byRegion: Readonly<Record<RegionKey, readonly number[]>>;
  vertexCount: number;
  endCount: number;
};

/*
 * Region table. Axes: x runs across the two halves (positive is the right half), y is up, z runs
 * from the back (negative) to the front (positive). Fibres of a two-half region alternate between
 * the halves, so each half holds half of them.
 *
 *   key       fibres  area                              shapes
 *   region-1   120    the front, both halves            fans rising from the column, short loops
 *   region-2   110    the upper side, both halves       side arcs over the top, short loops
 *   region-3   90     the top, both halves              fans, short loops
 *   region-4   90     the back, both halves             sweeps from the waist, short loops
 *   region-5   80     the lower rear, on the midline    coil rings behind the column, and the column itself
 *   region-6   100    the lower side, both halves       long front-to-back runs, short loops
 *   core       80     the middle, on the midline        bundles crossing between the two halves
 *
 * The first PLAN_FIBRES_PER_REGION fibres of every region are kept for plan lines.
 */
const REGION_ORDER: readonly RegionKey[] = [
  'region-1',
  'region-2',
  'region-3',
  'region-4',
  'region-5',
  'region-6',
  'core',
];

const FIBRES_IN: Readonly<Record<RegionKey, number>> = {
  'region-1': 120,
  'region-2': 110,
  'region-3': 90,
  'region-4': 90,
  'region-5': 80,
  'region-6': 100,
  core: 80,
};

type V3 = readonly [number, number, number];
type Rng = () => number;
type Strand = V3[];

const unit = (x: number, y: number, z: number): readonly [number, number, number] => {
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
};

/**
 * Where each region moves when zooming pulls the parts apart, for the right half. The renderer
 * mirrors x for left-half fibres. Region-5 and the core sit on the midline, so their x is already
 * symmetric; the core stays where it is.
 */
export const PULL_DIRECTIONS: Readonly<Record<RegionKey, readonly [number, number, number]>> = {
  'region-1': unit(0.3, 0.2, 0.9),
  'region-2': unit(1, 0.4, 0),
  'region-3': unit(0.15, 1, -0.2),
  'region-4': unit(0.3, 0.1, -1),
  'region-5': unit(0, -0.8, -0.6),
  'region-6': unit(0.9, -0.5, 0.2),
  core: [0, 0, 0],
};

export function regionKey(region: RegionId | null): RegionKey {
  return region === null ? 'core' : (`region-${region}` as RegionKey);
}

// ---- small helpers ----

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const between = (rng: Rng, lo: number, hi: number): number => lo + (hi - lo) * rng();
const pointCount = (rng: Rng, lo: number, hi: number): number =>
  lo + Math.floor(rng() * (hi - lo + 1));
/** Roughly normal, standard deviation near 1. */
const gauss = (rng: Rng): number => (rng() + rng() + rng() + rng() - 2) * 1.7;

/** A point on the Bezier curve through `ctrl` (de Casteljau). */
function bezier(ctrl: readonly V3[], u: number): V3 {
  let pts = ctrl;
  while (pts.length > 1) {
    const next: V3[] = [];
    for (let i = 0; i + 1 < pts.length; i++) next.push(lerp3(pts[i]!, pts[i + 1]!, u));
    pts = next;
  }
  return pts[0]!;
}

/** A point on the outer shell of one half: `a` is the angle in the front-back plane (0 front, 90° top, 180° back), `s` runs 0 (midline) to 1 (outermost). */
function shell(side: number, a: number, s: number): V3 {
  const lat = (s * Math.PI) / 2;
  const fall = Math.sqrt(Math.cos(lat));
  const sa = Math.sin(a);
  return [
    side * (0.04 + 0.58 * Math.sin(lat)),
    0.1 + (sa >= 0 ? 0.5 : 0.3) * sa * fall,
    0.86 * Math.cos(a) * fall,
  ];
}

const SHELL_CORE: V3 = [0.25, 0.1, 0];

/** A point on the small rounded patch on the lower side. */
function lowerShell(side: number, t: number, p: number): V3 {
  return [
    side * (0.42 + 0.19 * Math.sin(t) * Math.cos(p)),
    -0.22 - 0.17 * Math.sin(t) * Math.sin(p),
    0.12 + 0.44 * Math.cos(t),
  ];
}

const LOWER_CORE: V3 = [0.42, -0.22, 0.12];
const DEG = Math.PI / 180;

// ---- shapes: each returns the STRANDS_PER_FIBRE strands of one fibre ----

/** Strands that leave the narrow column and spread to a patch of the shell. */
function fan(rng: Rng, side: number, a0: number, a1: number, s0: number, s1: number): Strand[] {
  const aw = between(rng, a0, a1);
  const sw = between(rng, s0, s1);
  return Array.from({ length: STRANDS_PER_FIBRE }, () => {
    const t = shell(side, aw + gauss(rng) * 0.045, clamp(sw + gauss(rng) * 0.045, 0.05, 0.95));
    const pull = between(rng, 0.88, 1);
    const jx = gauss(rng) * 0.014;
    const jz = gauss(rng) * 0.014;
    const waist: V3 = [side * 0.12 + jx * 1.5, -0.1, -0.1 + jz * 1.5];
    const target: V3 = [lerp(side * 0.2, t[0], pull), lerp(0.05, t[1], pull), t[2] * pull];
    const ctrl: V3[] = [
      [jx, -0.94, -0.34 + jz],
      [side * 0.04 + jx, -0.54, -0.28 + jz],
      waist,
      lerp3(waist, target, 0.6),
      target,
    ];
    const n = pointCount(rng, 19, 22);
    const u0 = between(rng, 0.1, 0.4);
    const u1 = 1 - between(rng, 0, 0.05);
    return Array.from({ length: n }, (_, i) => bezier(ctrl, lerp(u0, u1, i / (n - 1))));
  });
}

/** Short strands that follow a patch of a surface, dipping inward in the middle. */
function loop(
  rng: Rng,
  at: (p: number, q: number) => V3,
  inner: V3,
  p: number,
  q: number,
  scale: number,
): Strand[] {
  const turn = between(rng, 0, 2 * Math.PI);
  const length = between(rng, 0.13, 0.22);
  const dp = (length * Math.cos(turn)) / scale;
  const dq = length * Math.sin(turn);
  return Array.from({ length: STRANDS_PER_FIBRE }, () => {
    const jp = gauss(rng) * 0.035;
    const jq = gauss(rng) * 0.035;
    const depth = between(rng, 0.035, 0.075);
    const n = pointCount(rng, 8, 11);
    return Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      const s = at(p + jp + dp * (u - 0.5), q + jq + dq * (u - 0.5));
      const len = Math.hypot(inner[0] - s[0], inner[1] - s[1], inner[2] - s[2]) || 1;
      const d = (depth * Math.sin(Math.PI * u)) / len;
      return [
        s[0] + (inner[0] - s[0]) * d,
        s[1] + (inner[1] - s[1]) * d,
        s[2] + (inner[2] - s[2]) * d,
      ] as V3;
    });
  });
}

const upperLoop = (rng: Rng, side: number, a0: number, a1: number): Strand[] =>
  loop(
    rng,
    (a, s) => shell(side, a, clamp(s, 0.04, 0.97)),
    [side * SHELL_CORE[0], SHELL_CORE[1], SHELL_CORE[2]],
    between(rng, a0, a1),
    between(rng, 0.1, 0.95),
    0.6,
  );

const lowerLoop = (rng: Rng, side: number): Strand[] =>
  loop(
    rng,
    (t, p) => lowerShell(side, clamp(t, 0.12 * Math.PI, 0.88 * Math.PI), p),
    [side * LOWER_CORE[0], LOWER_CORE[1], LOWER_CORE[2]],
    between(rng, 0.2, 0.8) * Math.PI,
    between(rng, -60, 150) * DEG,
    0.4,
  );

/** A bundle that follows one curve, thick in the middle and drawing in at the ends. */
function bundle(
  rng: Rng,
  ctrl: readonly V3[],
  mid: number,
  end: number,
  lo: number,
  hi: number,
): Strand[] {
  const fibre: V3 = [gauss(rng), gauss(rng), gauss(rng)];
  return Array.from({ length: STRANDS_PER_FIBRE }, () => {
    const own: V3 = [
      fibre[0] + 0.35 * gauss(rng),
      fibre[1] + 0.35 * gauss(rng),
      fibre[2] + 0.35 * gauss(rng),
    ];
    const n = pointCount(rng, lo, hi);
    const u0 = between(rng, 0, 0.07);
    const u1 = 1 - between(rng, 0, 0.07);
    return Array.from({ length: n }, (_, i) => {
      const u = lerp(u0, u1, i / (n - 1));
      const r = lerp(mid, end, Math.pow(Math.abs(2 * u - 1), 1.6));
      const c = bezier(ctrl, u);
      return [c[0] + own[0] * r, c[1] + own[1] * r, c[2] + own[2] * r] as V3;
    });
  });
}

/** An arch over the upper side, from low at the front, over the top, to low at the back. */
function sideArc(rng: Rng, side: number): Strand[] {
  const cx = between(rng, 0.44, 0.54);
  const cy = between(rng, 0.12, 0.24);
  const cz = between(rng, -0.12, 0);
  const rz = between(rng, 0.42, 0.56);
  const ry = between(rng, 0.2, 0.34);
  const from = between(rng, -0.45, -0.15) * Math.PI;
  const to = between(rng, 0.85, 1.05) * Math.PI;
  const fibre: V3 = [gauss(rng), gauss(rng), gauss(rng)];
  return Array.from({ length: STRANDS_PER_FIBRE }, () => {
    const own: V3 = [
      fibre[0] + 0.35 * gauss(rng),
      fibre[1] + 0.35 * gauss(rng),
      fibre[2] + 0.35 * gauss(rng),
    ];
    const n = pointCount(rng, 18, 21);
    return Array.from({ length: n }, (_, i) => {
      const th = lerp(from, to, i / (n - 1));
      const r = 0.03 + 0.05 * Math.abs(Math.cos(th));
      return [
        side * cx + own[0] * r,
        cy + ry * Math.sin(th) + own[1] * r,
        cz + rz * Math.cos(th) + own[2] * r,
      ] as V3;
    });
  });
}

/** A long run along the lower side, front to back. */
function lowerRun(rng: Rng, side: number): Strand[] {
  const dy = between(rng, -0.08, 0.1);
  const dx = between(rng, -0.05, 0.06);
  const ctrl: V3[] = [
    [side * (0.3 + dx), -0.2 + dy, 0.7],
    [side * (0.42 + dx), -0.24 + dy, 0.3],
    [side * (0.44 + dx), -0.26 + dy, -0.2],
    [side * (0.38 + dx), -0.22 + dy, -0.72],
  ];
  return bundle(rng, ctrl, 0.025, 0.06, 16, 19);
}

/** A sweep from the waist to the back, ending on the back of the shell. */
function backSweep(rng: Rng, side: number): Strand[] {
  const aw = between(rng, 165, 205) * DEG;
  const sw = between(rng, 0.1, 0.5);
  return Array.from({ length: STRANDS_PER_FIBRE }, () => {
    const j = gauss(rng) * 0.015;
    const t = shell(side, aw + gauss(rng) * 0.04, clamp(sw + gauss(rng) * 0.04, 0.05, 0.9));
    const ctrl: V3[] = [
      [side * (0.2 + j), -0.08 + j, -0.18],
      [side * (0.36 + j), -0.05 + gauss(rng) * 0.02, -0.4],
      [side * (0.28 + j), -0.02 + gauss(rng) * 0.02, -0.64],
      [t[0] * 0.95, t[1] * 0.95, t[2] * 0.95],
    ];
    const n = pointCount(rng, 15, 19);
    return Array.from({ length: n }, (_, i) => bezier(ctrl, i / (n - 1)));
  });
}

/** A stack of partial rings behind the column, one ring per fibre, rising with `rank` (0 to 1). */
function coilRing(rng: Rng, side: number, rank: number): Strand[] {
  const h = lerp(-0.85, 0.85, rank);
  const radius = Math.sqrt(1 - h * h);
  return Array.from({ length: STRANDS_PER_FIBRE }, () => {
    const rho = between(rng, 0.93, 1);
    const start = (between(rng, 150, 190) * Math.PI) / 180;
    const n = pointCount(rng, 13, 15);
    const jitter = gauss(rng) * 0.025;
    return Array.from({ length: n }, (_, i) => {
      const psi = start - ((230 * Math.PI) / 180) * (i / (n - 1));
      return [
        side * 0.22 + side * 0.27 * radius * rho * Math.sin(psi),
        -0.45 + 0.2 * clamp(h + jitter, -1, 1),
        -0.62 - 0.26 * radius * rho * Math.cos(psi),
      ] as V3;
    });
  });
}

/** Strands twisting down a narrow column, swelling near the top. */
function column(rng: Rng, turn: number): Strand[] {
  return Array.from({ length: STRANDS_PER_FIBRE }, () => {
    const an = turn + gauss(rng) * 0.12;
    const scale = between(rng, 0.55, 1);
    const n = pointCount(rng, 11, 13);
    return Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      const swell = Math.exp(-(((u - 0.3) / 0.16) ** 2));
      const r = (0.075 - 0.02 * u + 0.03 * swell) * scale;
      return [
        r * Math.cos(an),
        -0.28 - 0.66 * u,
        -0.24 - 0.14 * u + 0.06 * swell + r * Math.sin(an),
      ] as V3;
    });
  });
}

/** A bundle that runs from one half, across the midline, to the other. */
function crossing(rng: Rng): Strand[] {
  const t = rng();
  const zMid = 0.34 - 0.72 * t;
  const yMid = -0.04 + 0.1 * Math.sin(Math.PI * t);
  const anchor = (side: number) => {
    const p = shell(side, (25 + 135 * t + gauss(rng) * 5) * DEG, between(rng, 0.12, 0.72));
    return lerp3([0.2 * side, yMid + 0.07, zMid], p, 0.9 + 0.1 * rng());
  };
  return Array.from({ length: STRANDS_PER_FIBRE }, () => {
    const centre: V3 = [0, yMid + gauss(rng) * 0.012, zMid + gauss(rng) * 0.015];
    const left = anchor(-1);
    const right = anchor(1);
    const ctrl: V3[] = [
      left,
      [-0.2, centre[1] + 0.07, lerp(left[2], centre[2], 0.65)],
      centre,
      [0.2, centre[1] + 0.07, lerp(right[2], centre[2], 0.65)],
      right,
    ];
    const n = pointCount(rng, 21, 22);
    return Array.from({ length: n }, (_, i) => bezier(ctrl, i / (n - 1)));
  });
}

// ---- assembly ----

type Maker = (rng: Rng, side: number, j: number, rank: number) => Strand[];

const MAKERS: Readonly<Record<RegionKey, Maker>> = {
  'region-1': (rng, side, j) =>
    j % 3 === 2
      ? upperLoop(rng, side, -30 * DEG, 90 * DEG)
      : fan(rng, side, 15 * DEG, 80 * DEG, 0.1, 0.8),
  'region-2': (rng, side, j) =>
    j % 11 < 6 ? sideArc(rng, side) : upperLoop(rng, side, 40 * DEG, 150 * DEG),
  'region-3': (rng, side, j) =>
    j % 3 === 2
      ? upperLoop(rng, side, 80 * DEG, 140 * DEG)
      : fan(rng, side, 100 * DEG, 140 * DEG, 0.1, 0.8),
  'region-4': (rng, side, j) =>
    j % 9 < 5 ? backSweep(rng, side) : upperLoop(rng, side, 150 * DEG, 215 * DEG),
  'region-5': (rng, side, j, rank) =>
    j % 2 === 0 ? coilRing(rng, side, rank) : column(rng, (2 * Math.PI * j) / 40),
  'region-6': (rng, side, j) => (j % 5 < 2 ? lowerRun(rng, side) : lowerLoop(rng, side)),
  core: (rng) => crossing(rng),
};

/** Packs a strand's points, keeping them within [-1, 1] and, for a half, on that half. */
function pack(strand: Strand, side: number | null): Float32Array {
  const out = new Float32Array(strand.length * 3);
  strand.forEach(([x, y, z], i) => {
    out[i * 3] = clamp(side === null ? x : side * Math.max(side * x, 0.02), -1, 1);
    out[i * 3 + 1] = clamp(y, -1, 1);
    out[i * 3 + 2] = clamp(z, -1, 1);
  });
  return out;
}

/** Builds the whole field from `seed`. The same seed always gives the same field. */
export function buildField(seed: number = BRAIN_SEED): Field {
  const rng = mulberry32(seed);
  const fibres: Fibre[] = [];
  const byRegion = {} as Record<RegionKey, number[]>;
  let vertexCount = 0;

  for (const region of REGION_ORDER) {
    const count = FIBRES_IN[region];
    const halves = region === 'region-5' || region === 'core' ? null : ([1, -1] as const);
    const indices: number[] = [];
    byRegion[region] = indices;
    for (let k = 0; k < count; k++) {
      const side = halves === null ? 1 : halves[k % 2]!;
      const j = halves === null ? k : k >> 1;
      // Midline regions alternate the halves for their coil rings, and rank rings by height.
      const midSide = region === 'region-5' ? (j % 4 === 0 ? 1 : -1) : 1;
      const rank = region === 'region-5' ? ((j >> 2) % 10) / 9 : 0;
      const strands = MAKERS[region](rng, halves === null ? midSide : side, j, rank).map((s) =>
        pack(s, halves === null ? null : side),
      );
      for (const s of strands) vertexCount += s.length / 3;
      indices.push(fibres.length);
      fibres.push({
        index: fibres.length,
        region,
        forPlans: indices.length <= PLAN_FIBRES_PER_REGION,
        strands,
      });
    }
  }
  return { fibres, byRegion, vertexCount, endCount: fibres.length * STRANDS_PER_FIBRE };
}

/** A 32-bit hash of the field's structure and every vertex, to tell whether two fields match. */
export function fieldHash(field: Field): number {
  let h = 2166136261;
  const mix = (word: number): void => {
    h = Math.imul(h ^ (word >>> 0), 16777619);
  };
  for (const fibre of field.fibres) {
    mix(fibre.index);
    mix(REGION_ORDER.indexOf(fibre.region));
    mix(fibre.forPlans ? 1 : 0);
    for (const strand of fibre.strands) {
      mix(strand.length);
      const bits = new Uint32Array(strand.buffer, strand.byteOffset, strand.length);
      for (const b of bits) mix(b);
    }
  }
  return h >>> 0;
}
