// Brain space drawing: the scene (what is lit, and where) and the frame (how it is painted).
import type { BrainSpace } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { PART_COLOURS, PLATE } from '../../design/partColours';
import { assignFibres, type LineRef } from '../../geometry/assign';
import { PULL_DIRECTIONS, regionKey, type Field, type RegionKey } from '../../geometry/field';
import { lineShade } from '../../geometry/shade';
import { UNSELECTED_ALPHA } from './constants';
import { explodeAmount, type Camera } from './camera';

/** How far a region moves at full pull, in field units. */
const PULL_DISTANCE = 0.55;
/** Field y of the middle of the drawing. */
const CENTRE_Y = -0.17;
const LABEL_FONT = "600 13px 'Atkinson Hyperlegible Next Variable', system-ui, sans-serif";
/** Region keys whose fibres sit on the midline, so their pull direction is never mirrored. */
const MIDLINE: ReadonlySet<RegionKey> = new Set<RegionKey>(['region-5', 'core']);

// ---- rig: facts about the field that never change ----

export type Rig = {
  /** Pull direction per fibre (x already mirrored for the left half), x,y,z interleaved. */
  dirs: Float32Array;
  /** Where each region's label sits before pulling: the right half's centre. */
  labelAt: Map<RegionKey, readonly [number, number, number]>;
};

export function buildRig(field: Field): Rig {
  const dirs = new Float32Array(field.fibres.length * 3);
  const sums = new Map<RegionKey, [number, number, number, number]>();
  for (const f of field.fibres) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let n = 0;
    for (const s of f.strands) {
      for (let i = 0; i < s.length; i += 3) {
        sx += s[i]!;
        sy += s[i + 1]!;
        sz += s[i + 2]!;
        n += 1;
      }
    }
    const meanX = sx / n;
    const dir = PULL_DIRECTIONS[f.region];
    const left = !MIDLINE.has(f.region) && meanX < 0;
    dirs[f.index * 3] = left ? -dir[0] : dir[0];
    dirs[f.index * 3 + 1] = dir[1];
    dirs[f.index * 3 + 2] = dir[2];
    if (left) continue;
    const acc = sums.get(f.region) ?? [0, 0, 0, 0];
    acc[0] += sx;
    acc[1] += sy;
    acc[2] += sz;
    acc[3] += n;
    sums.set(f.region, acc);
  }
  const labelAt = new Map<RegionKey, readonly [number, number, number]>();
  for (const [key, a] of sums) labelAt.set(key, [a[0] / a[3], a[1] / a[3], a[2] / a[3]]);
  return { dirs, labelAt };
}

// ---- scene: the lit lines ----

export type Item = {
  id: string;
  partId: string | null;
  /** plan: a lit plan line; waiting: dashed with a ring; start: a hairline; spark: a point. */
  kind: 'plan' | 'waiting' | 'start' | 'spark';
  /** 1 to 4 for plan lines, 0 otherwise. */
  strength: number;
  css: string;
  fibre: number;
  /** -1 draws the whole fibre; otherwise light that one strand end. */
  strand: number;
};

export type Scene = { items: Item[]; signals: boolean };

export function buildScene(
  space: BrainSpace,
  parts: readonly Part[],
  field: Field,
  assign: typeof assignFibres = assignFibres,
): Scene {
  const partById = new Map(parts.map((p) => [p.id, p]));
  const partOf = (id: string | null): Part | undefined =>
    id === null ? undefined : partById.get(id);
  const refs: LineRef[] = space.lines.map((l) => ({
    id: l.id,
    kind: l.kind,
    partId: l.partId,
    order: l.order,
    waiting: l.kind === 'plan' && !l.everStarted,
  }));
  const placements = assign(refs, field, (id) => regionKey(partOf(id)?.region ?? null));

  const items: Item[] = [];
  let signals = false;
  for (const line of space.lines) {
    if (line.kind === 'plan' ? line.hidden : line.undone) continue;
    const place = placements.get(line.id);
    if (!place || place.kind === 'none') continue;
    const part = partOf(line.partId);
    const css = part ? hsl(lineShade(line.id, PART_COLOURS[part.colour])) : PLATE.core;
    const strand = place.kind === 'end' ? place.strand : -1;
    const base = { id: line.id, partId: line.partId, css, fibre: place.fibre, strand };
    if (line.kind === 'plan') {
      if (line.strength === 'waiting') {
        items.push({ ...base, kind: 'waiting', strength: 0, css: PLATE.waiting });
      } else {
        items.push({ ...base, kind: 'plan', strength: line.strength });
        if (line.strength >= 2) signals = true;
      }
    } else {
      items.push({ ...base, kind: line.partId === null ? 'spark' : 'start', strength: 0 });
    }
  }
  return { items, signals };
}

function hsl(c: { h: number; s: number; l: number }): string {
  return `hsl(${c.h.toFixed(1)} ${c.s}% ${c.l.toFixed(1)}%)`;
}

// ---- projection ----

export type View = { w: number; h: number; cam: Camera };
/** `d` is depth: positive toward the viewer. */
type Point = { x: number; y: number; d: number };
export type Project = (x: number, y: number, z: number) => Point;
type Path = Pick<CanvasPath, 'moveTo' | 'lineTo'>;

export function makeProject({ w, h, cam }: View): Project {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const scale = Math.min(w / 2.1, h / 1.8) * cam.zoom;
  const out: Point = { x: 0, y: 0, d: 0 };
  return (x, y, z) => {
    const yy = y - CENTRE_Y;
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = yy * cp - z1 * sp;
    const z2 = yy * sp + z1 * cp;
    const f = scale * (1 + 0.18 * z2);
    out.x = w / 2 + x1 * f;
    out.y = h / 2 - y2 * f;
    out.d = z2;
    return out;
  };
}

/** The yaw and pitch that turn a field point to face the viewer, reached by the shortest turn from `from`. */
export function facing(at: readonly [number, number, number], from: Camera): Camera {
  const base = Math.atan2(-at[0], at[2]);
  const yaw = base + 2 * Math.PI * Math.round((from.yaw - base) / (2 * Math.PI));
  const depth = Math.hypot(at[0], at[2]);
  const pitch = Math.max(-0.6, Math.min(0.6, 0.5 * Math.atan2(at[1] - CENTRE_Y, depth)));
  return { yaw, pitch, zoom: from.zoom };
}

type Disp = { x: number; y: number; z: number };
function displace(rig: Rig, fibre: number, amount: number, out: Disp): Disp {
  const k = amount * PULL_DISTANCE;
  out.x = rig.dirs[fibre * 3]! * k;
  out.y = rig.dirs[fibre * 3 + 1]! * k;
  out.z = rig.dirs[fibre * 3 + 2]! * k;
  return out;
}

function trace(path: Path, pts: Float32Array, d: Disp, project: Project): void {
  for (let i = 0; i < pts.length; i += 3) {
    const p = project(pts[i]! + d.x, pts[i + 1]! + d.y, pts[i + 2]! + d.z);
    if (i === 0) path.moveTo(p.x, p.y);
    else path.lineTo(p.x, p.y);
  }
}

function endOf(pts: Float32Array, d: Disp, project: Project): Point {
  const i = pts.length - 3;
  return project(pts[i]! + d.x, pts[i + 1]! + d.y, pts[i + 2]! + d.z);
}

// ---- the static layer: dim field, then light ----

const BANDS = 5;
const TRACE_ALPHA: readonly [number, number] = [0.04, 0.2];
const POINT_ALPHA: readonly [number, number] = [0.05, 0.5];
const bandOf = (depth: number): number =>
  Math.max(0, Math.min(BANDS - 1, Math.floor(((depth + 1) / 2) * BANDS)));
const bandAlpha = (range: readonly [number, number], band: number): number =>
  range[0] + ((range[1] - range[0]) * (band + 0.5)) / BANDS;

/** The dim field. Alpha rises with depth (spec §16.7), in a few bands with one path per band. */
export function drawDim(
  ctx: CanvasRenderingContext2D,
  field: Field,
  rig: Rig,
  view: View,
  detailed: boolean,
): void {
  const project = makeProject(view);
  const amount = explodeAmount(view.cam.zoom);
  const d: Disp = { x: 0, y: 0, z: 0 };
  const every = detailed ? 1 : 4;
  const traces = Array.from({ length: BANDS }, () => new Path2D());
  const points = Array.from({ length: BANDS }, () => new Path2D());
  for (const f of field.fibres) {
    displace(rig, f.index, amount, d);
    if (f.index % every === 0) {
      const first = f.strands[0];
      if (first) {
        const mid = (first.length / 6) | 0;
        const band = bandOf(
          project(first[mid * 3]! + d.x, first[mid * 3 + 1]! + d.y, first[mid * 3 + 2]! + d.z).d,
        );
        for (const s of f.strands) trace(traces[band]!, s, d, project);
      }
    }
    for (const s of f.strands) {
      const p = endOf(s, d, project);
      points[bandOf(p.d)]!.rect(p.x - 0.6, p.y - 0.6, 1.2, 1.2);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = PLATE.dimTrace;
  ctx.fillStyle = PLATE.dimPoint;
  ctx.lineWidth = 0.5;
  for (let b = 0; b < BANDS; b++) {
    ctx.globalAlpha = bandAlpha(TRACE_ALPHA, b);
    ctx.stroke(traces[b]!);
    ctx.globalAlpha = bandAlpha(POINT_ALPHA, b);
    ctx.fill(points[b]!);
  }
  ctx.globalAlpha = 1;
}

export type LitFrame = {
  ctx: CanvasRenderingContext2D;
  field: Field;
  rig: Rig;
  scene: Scene;
  view: View;
  selected: string | null;
  resting: boolean;
  /** Milliseconds, for signal phase. */
  time: number;
  restingBrightness: number;
};

const WIDTH = [0, 0.6, 1.0, 1.6, 2.4] as const;
const ALPHA = [0, 0.5, 0.6, 0.7, 0.8] as const;

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const fadeOf = (f: LitFrame, it: Item): number =>
  (f.selected !== null && it.partId !== f.selected ? UNSELECTED_ALPHA : 1) *
  (f.resting ? f.restingBrightness : 1);

/** Lit lines, added together. Drawn into the cached layer, so signals and waiting lines stay out of it. */
export function drawLit(f: LitFrame): void {
  const { ctx, field, rig, scene, view } = f;
  const project = makeProject(view);
  const amount = explodeAmount(view.cam.zoom);
  const d: Disp = { x: 0, y: 0, z: 0 };

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const it of scene.items) {
    if (it.kind === 'waiting') continue;
    const fibre = field.fibres[it.fibre];
    if (!fibre) continue;
    displace(rig, it.fibre, amount, d);
    const mul = fadeOf(f, it);
    ctx.strokeStyle = it.css;
    ctx.fillStyle = it.css;

    if (it.strand >= 0 || it.kind === 'spark') {
      // One lit point at a strand end.
      const strand = fibre.strands[it.strand >= 0 ? it.strand : 0];
      if (!strand) continue;
      const p = endOf(strand, d, project);
      ctx.globalAlpha = (it.kind === 'spark' ? 0.7 : 0.45) * mul;
      ctx.beginPath();
      ctx.arc(p.x, p.y, it.kind === 'spark' ? 1.6 : 1.2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const strength = it.strength;
    const width = it.kind === 'plan' ? WIDTH[strength]! : 0.4;
    const alpha = it.kind === 'plan' ? ALPHA[strength]! : 0.28;
    const line = new Path2D();
    for (const s of fibre.strands) trace(line, s, d, project);
    if (strength >= 3) {
      ctx.globalAlpha = 0.07 * mul;
      ctx.lineWidth = width * 3.5;
      ctx.stroke(line);
    }
    ctx.globalAlpha = alpha * mul;
    ctx.lineWidth = width;
    ctx.stroke(line);
    if (strength === 4) {
      ctx.globalAlpha = 0.55 * mul;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke(line);
    }
    // Every strand end, in one path.
    const radius = it.kind === 'plan' ? 1.1 + strength * 0.25 : 0.9;
    const ends = new Path2D();
    for (const s of fibre.strands) {
      const p = endOf(s, d, project);
      ends.moveTo(p.x + radius, p.y);
      ends.arc(p.x, p.y, radius, 0, Math.PI * 2);
    }
    ctx.globalAlpha = Math.min(1, alpha + 0.2) * mul;
    ctx.fillStyle = it.css;
    ctx.fill(ends);
  }
  ctx.globalAlpha = 1;
}

/** Specks travelling along plan lines of strength 2 and up. Only these move while the camera rests. */
export function drawSignals(f: LitFrame): void {
  const { ctx, field, rig, scene, view } = f;
  const project = makeProject(view);
  const amount = explodeAmount(view.cam.zoom);
  const d: Disp = { x: 0, y: 0, z: 0 };
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#ffffff';
  const specks = new Map<number, Path2D>();
  for (const it of scene.items) {
    if (it.kind !== 'plan' || it.strength < 2 || it.strand >= 0) continue;
    const fibre = field.fibres[it.fibre];
    if (!fibre) continue;
    displace(rig, it.fibre, amount, d);
    const mul = fadeOf(f, it);
    const bucket = Math.round(mul * 20);
    let path = specks.get(bucket);
    if (!path) specks.set(bucket, (path = new Path2D()));
    for (let k = 0; k < 2; k++) {
      const s = fibre.strands[k * 4];
      if (!s) continue;
      const u = (f.time * 0.00008 * (0.6 + it.strength * 0.2) + hash01(it.id + k)) % 1;
      const n = s.length / 3;
      const at = u * (n - 1);
      const i = Math.floor(at);
      const t = at - i;
      const a = project(s[i * 3]! + d.x, s[i * 3 + 1]! + d.y, s[i * 3 + 2]! + d.z);
      const ax = a.x;
      const ay = a.y;
      const j = Math.min(i + 1, n - 1);
      const b = project(s[j * 3]! + d.x, s[j * 3 + 1]! + d.y, s[j * 3 + 2]! + d.z);
      const x = ax + (b.x - ax) * t;
      const y = ay + (b.y - ay) * t;
      path.moveTo(x + 1.5, y);
      path.arc(x, y, 1.5, 0, Math.PI * 2);
    }
  }
  for (const [bucket, path] of specks) {
    ctx.globalAlpha = 0.9 * (bucket / 20);
    ctx.fill(path);
  }
  ctx.globalAlpha = 1;
}

/** Waiting lines: dashed and pale, with a ring at the end. */
export function drawWaiting(f: LitFrame): void {
  const { ctx, field, rig, scene, view } = f;
  const project = makeProject(view);
  const amount = explodeAmount(view.cam.zoom);
  const d: Disp = { x: 0, y: 0, z: 0 };
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = PLATE.waiting;
  ctx.lineWidth = 1;
  for (const it of scene.items) {
    if (it.kind !== 'waiting') continue;
    const strand = field.fibres[it.fibre]?.strands[0];
    if (!strand) continue;
    displace(rig, it.fibre, amount, d);
    const mul = fadeOf(f, it);
    const line = new Path2D();
    trace(line, strand, d, project);
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.75 * mul;
    ctx.stroke(line);
    const p = endOf(strand, d, project);
    const ring = new Path2D();
    ring.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9 * mul;
    ctx.stroke(ring);
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// ---- labels ----

/** Part names, once the regions have pulled apart. Each sits on an opaque plate-coloured backing. */
export function drawLabels(
  ctx: CanvasRenderingContext2D,
  rig: Rig,
  parts: readonly Part[],
  view: View,
): void {
  const amount = explodeAmount(view.cam.zoom);
  if (amount < 0.25) return;
  const project = makeProject(view);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const part of parts) {
    if (!part.enabled) continue;
    const key = regionKey(part.region);
    const at = rig.labelAt.get(key);
    if (!at) continue;
    const dir = PULL_DIRECTIONS[key];
    const k = amount * PULL_DISTANCE;
    const p = project(at[0] + dir[0] * k, at[1] + dir[1] * k, at[2] + dir[2] * k);
    const width = ctx.measureText(part.label).width;
    ctx.fillStyle = PLATE.bg;
    ctx.fillRect(p.x - width / 2 - 5, p.y - 11, width + 10, 22);
    ctx.fillStyle = PLATE.waiting;
    ctx.fillText(part.label, p.x, p.y);
  }
}

// ---- hit test ----

/**
 * The part of the lit line nearest to (x, y) within `radius` CSS px, or `undefined` if none. Lines
 * with no part (core sparks) never match, so a tap near one counts as a tap on nothing.
 */
export function hitTest(
  scene: Scene,
  field: Field,
  rig: Rig,
  view: View,
  x: number,
  y: number,
  radius: number,
): { partId: string } | undefined {
  const project = makeProject(view);
  const amount = explodeAmount(view.cam.zoom);
  const d: Disp = { x: 0, y: 0, z: 0 };
  let best = radius;
  let found: { partId: string } | undefined;
  for (const it of scene.items) {
    if (it.partId === null) continue;
    const fibre = field.fibres[it.fibre];
    if (!fibre) continue;
    displace(rig, it.fibre, amount, d);
    // Only what is drawn: one strand end, or a waiting line's first strand, or the whole fibre.
    const single = it.strand >= 0;
    const strands = single
      ? [fibre.strands[it.strand]]
      : it.kind === 'waiting'
        ? [fibre.strands[0]]
        : fibre.strands;
    for (const s of strands) {
      if (!s) continue;
      for (let i = single ? s.length - 3 : 0; i < s.length; i += single ? 3 : 6) {
        const p = project(s[i]! + d.x, s[i + 1]! + d.y, s[i + 2]! + d.z);
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < best) {
          best = dist;
          found = { partId: it.partId };
        }
      }
    }
  }
  return found;
}
