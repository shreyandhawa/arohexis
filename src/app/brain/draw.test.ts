import { describe, expect, it, vi } from 'vitest';
import { buildField } from '../../geometry/field';
import { PART_COLOURS } from '../../design/partColours';
import { DEFAULT_PARTS } from '../../domain/defaults';
import { regionKey } from '../../geometry/field';
import { BRAIN_CENTRE } from './constants';
import {
  buildRig,
  drawDim,
  drawLabels,
  facing,
  hitTest,
  makeProject,
  pulledLabel,
  type Item,
  type Scene,
} from './draw';

const cam = { yaw: -Math.PI / 2, pitch: 0, zoom: 1, look: BRAIN_CENTRE } as const;
const sideOf = (yaw: number): number =>
  Math.PI / 2 + Math.PI * Math.round((yaw - Math.PI / 2) / Math.PI);

describe('facing', () => {
  it('turns a side point to face the viewer, by the shortest way', () => {
    const c = facing([1, -0.17, 0], { ...cam, yaw: -1.4, zoom: 2 });
    expect(c.yaw).toBeCloseTo(-Math.PI / 2);
    expect(c.zoom).toBe(2);
    const far = facing([1, -0.17, 0], { ...cam, yaw: -1.4 + 2 * Math.PI });
    expect(far.yaw).toBeCloseTo(-Math.PI / 2 + 2 * Math.PI);
  });

  it('turns a midline point to the side view nearer the current yaw', () => {
    const at = [0.01, 0.2, 0.8] as const;
    expect(facing(at, { ...cam, yaw: -1.4 }).yaw).toBeLessThan(0);
    expect(facing(at, { ...cam, yaw: 1.4 }).yaw).toBeGreaterThan(0);
    // Near the midline, not only exactly on it.
    const near = [0.08, 0.2, 0.8] as const;
    expect(facing(near, { ...cam, yaw: 1.4 }).yaw).toBeGreaterThan(0);
    expect(facing(near, { ...cam, yaw: -1.4 }).yaw).toBeLessThan(0);
  });

  it('keeps a midline point within a quarter turn of the nearest side view', () => {
    for (const from of [-Math.PI / 2, 0.2, 6.4, -9]) {
      for (const at of [
        [0, -0.17, 1],
        [0, -0.17, -1],
        [0.01, 0.2, 0.8],
      ] as const) {
        const c = facing(at, { ...cam, yaw: from });
        expect(Math.abs(c.yaw - sideOf(c.yaw))).toBeLessThanOrEqual(Math.PI / 4 + 1e-9);
      }
    }
  });
});

describe('the free band', () => {
  it('puts the look-at point at the band centre, whatever the insets', () => {
    const view = { w: 300, h: 300, top: 40, bottom: 100, cam };
    const p = makeProject(view)(...BRAIN_CENTRE);
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(40 + (300 - 40 - 100) / 2);
  });

  it('scales to the band, so a shorter band draws smaller', () => {
    const tall = makeProject({ w: 600, h: 600, top: 0, bottom: 0, cam });
    const short = makeProject({ w: 600, h: 600, top: 200, bottom: 200, cam });
    const span = (project: ReturnType<typeof makeProject>): number => {
      const hi = project(0, 0.5, 0).y;
      return Math.abs(hi - project(0, -0.5, 0).y);
    };
    expect(span(short)).toBeLessThan(span(tall));
  });

  it('never magnifies past the first pull, so zooming only pulls', () => {
    const view = { w: 375, h: 500, top: 60, bottom: 70 };
    const span = (zoom: number): number => {
      const project = makeProject({ ...view, cam: { ...cam, zoom } });
      return Math.abs(project(0, 0.5, 0).y - project(0, -0.5, 0).y);
    };
    expect(span(1.5)).toBeLessThanOrEqual(span(1.1));
    expect(span(3.2)).toBeLessThanOrEqual(span(1.5));
    expect(span(1.1)).toBeCloseTo(span(1.1000001));
    expect(span(1)).toBeLessThan(span(1.1));
  });

  it('fits the fully pulled brain inside the band', () => {
    const field = buildField();
    const rig = buildRig(field);
    for (const [w, h, top, bottom] of [
      [375, 667, 60, 70],
      [1280, 800, 60, 70],
    ] as const) {
      const view = { w, h, top, bottom, cam: { ...cam, zoom: 3.2 } };
      const project = makeProject(view);
      let lo = Infinity;
      let hi = -Infinity;
      let left = Infinity;
      let right = -Infinity;
      for (const f of field.fibres) {
        const k = 0.55;
        for (const s of f.strands) {
          const i = s.length - 3;
          const p = project(
            s[i]! + rig.dirs[f.index * 3]! * k,
            s[i + 1]! + rig.dirs[f.index * 3 + 1]! * k,
            s[i + 2]! + rig.dirs[f.index * 3 + 2]! * k,
          );
          lo = Math.min(lo, p.y);
          hi = Math.max(hi, p.y);
          left = Math.min(left, p.x);
          right = Math.max(right, p.x);
        }
      }
      expect(lo).toBeGreaterThanOrEqual(top);
      expect(hi).toBeLessThanOrEqual(h - bottom);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(w);
    }
  });

  it('frames the whole stage when the free band is too short to draw in', () => {
    const tall = makeProject({ w: 300, h: 600, top: 0, bottom: 0, cam })(...BRAIN_CENTRE);
    // 200 px plate: 20 px of band left between the insets.
    const small = makeProject({ w: 200, h: 200, top: 100, bottom: 80, cam })(...BRAIN_CENTRE);
    expect(small.y).toBeCloseTo(100);
    expect(tall.y).toBeCloseTo(300);
    const span = (project: ReturnType<typeof makeProject>): number =>
      Math.abs(project(0, 0.5, 0).y - project(0, -0.5, 0).y);
    expect(span(makeProject({ w: 400, h: 200, top: 100, bottom: 80, cam }))).toBeGreaterThan(40);
  });

  it('centres a selected region at the band centre once the look-at is on it', () => {
    const field = buildField();
    const rig = buildRig(field);
    const at = pulledLabel(rig, 'region-1', 2)!;
    const view = { w: 375, h: 500, top: 60, bottom: 70, cam: { ...cam, zoom: 2, look: at } };
    const p = makeProject(view)(...at);
    expect(p.x).toBeCloseTo(375 / 2);
    expect(p.y).toBeCloseTo(60 + (500 - 130) / 2);
  });
});

describe('hitTest', () => {
  const field = buildField();
  const rig = buildRig(field);
  const view = { w: 300, h: 300, top: 0, bottom: 0, cam };
  const item = (partId: string | null, kind: Item['kind']): Item => ({
    id: `${partId}`,
    partId,
    kind,
    strength: 0,
    css: '#fff',
    fibre: 0,
    strand: -1,
  });

  it('never matches a core spark, and gives nothing for an empty tap', () => {
    const scene: Scene = { items: [item(null, 'spark')], signals: false };
    for (let x = 0; x < 300; x += 50)
      for (let y = 0; y < 300; y += 50)
        expect(hitTest(scene, field, rig, view, x, y, 400)).toBeUndefined();
  });

  it('matches a part line within the radius', () => {
    const scene: Scene = { items: [item('work', 'start')], signals: false };
    expect(hitTest(scene, field, rig, view, 150, 150, 400)).toEqual({ partId: 'work' });
    expect(hitTest(scene, field, rig, view, -500, -500, 24)).toBeUndefined();
  });

  it('agrees with the projection after a look-at pan and band insets', () => {
    const scene: Scene = { items: [item('work', 'start')], signals: false };
    const panned = {
      w: 300,
      h: 400,
      top: 50,
      bottom: 90,
      cam: { ...cam, look: [0.3, 0.1, -0.2] as const },
    };
    const s = field.fibres[0]!.strands[0]!;
    const at = makeProject(panned)(s[0]!, s[1]!, s[2]!);
    const moved = makeProject({ ...panned, cam })(s[0]!, s[1]!, s[2]!);
    expect(Math.hypot(at.x - moved.x, at.y - moved.y)).toBeGreaterThan(10);
    expect(hitTest(scene, field, rig, panned, at.x, at.y, 1)).toEqual({ partId: 'work' });
  });
});

/** A context that records each fillText with the fill style and alpha in force. */
function recorder() {
  const state: Record<string, unknown> = { globalAlpha: 1 };
  const texts: { text: string; style: unknown; x: number; y: number }[] = [];
  const strokes: number[] = [];
  const ctx = new Proxy(state, {
    get: (t, key) => {
      if (key === 'measureText') return () => ({ width: 40 });
      if (key === 'fillText')
        return (text: string, x: number, y: number) =>
          texts.push({ text, style: t['fillStyle'], x, y });
      if (key === 'stroke') return () => strokes.push(t['globalAlpha'] as number);
      return Reflect.get(t, key) ?? (() => undefined);
    },
    set: (t, key, v) => {
      t[key as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, strokes };
}

describe('drawLabels', () => {
  const field = buildField();
  const rig = buildRig(field);
  const parts = DEFAULT_PARTS;
  const hsl = (c: { h: number; s: number; l: number }) =>
    `hsl(${c.h.toFixed(1)} ${c.s}% ${c.l.toFixed(1)}%)`;

  it('writes each name in its part colour', () => {
    const r = recorder();
    drawLabels(r.ctx, rig, parts, { w: 375, h: 500, top: 0, bottom: 0, cam: { ...cam, zoom: 2 } });
    expect(r.texts.length).toBeGreaterThan(0);
    for (const t of r.texts) {
      const part = parts.find((p) => p.label === t.text)!;
      expect(t.style).toBe(hsl(PART_COLOURS[part.colour]));
    }
  });

  it('shows from the first pull, and not before it', () => {
    const first = recorder();
    drawLabels(first.ctx, rig, parts, {
      w: 375,
      h: 500,
      top: 0,
      bottom: 0,
      cam: { ...cam, zoom: 1.25 },
    });
    expect(first.texts.length).toBeGreaterThan(0);
    const none = recorder();
    drawLabels(none.ctx, rig, parts, {
      w: 375,
      h: 500,
      top: 0,
      bottom: 0,
      cam: { ...cam, zoom: 1.1 },
    });
    expect(none.texts).toHaveLength(0);
  });

  it('keeps every label inside the band', () => {
    const r = recorder();
    const view = { w: 375, h: 400, top: 60, bottom: 70, cam: { ...cam, zoom: 3.2 } };
    drawLabels(r.ctx, rig, parts, view);
    for (const t of r.texts) {
      expect(t.x - 20).toBeGreaterThanOrEqual(8);
      expect(t.x + 20).toBeLessThanOrEqual(375 - 8);
      expect(t.y - 11).toBeGreaterThanOrEqual(60 + 8);
      expect(t.y + 11).toBeLessThanOrEqual(400 - 70 - 8);
    }
  });

  it("draws only the selected part's label while one is selected", () => {
    const r = recorder();
    const view = { w: 375, h: 500, top: 0, bottom: 0, cam: { ...cam, zoom: 2 } };
    drawLabels(r.ctx, rig, parts, view, { selected: 'work' });
    expect(r.texts.map((t) => t.text)).toEqual([parts.find((p) => p.id === 'work')!.label]);
  });

  it('keeps labels inside a stage framed because the band is too short', () => {
    const r = recorder();
    const view = { w: 300, h: 200, top: 100, bottom: 80, cam: { ...cam, zoom: 3.2 } };
    drawLabels(r.ctx, rig, parts, view);
    expect(r.texts.length).toBeGreaterThan(0);
    for (const t of r.texts) {
      expect(t.y - 11).toBeGreaterThanOrEqual(8);
      expect(t.y + 11).toBeLessThanOrEqual(200 - 8);
    }
  });

  it("anchors a label to its part's lit fibres, and falls back to the region", () => {
    const field = buildField();
    const line: Item = {
      id: 'l',
      partId: 'work',
      kind: 'start',
      strength: 0,
      css: '#fff',
      fibre: 3,
      strand: -1,
    };
    const scene: Scene = { items: [line], signals: false };
    const view = { w: 375, h: 500, top: 0, bottom: 0, cam: { ...cam, zoom: 2 } };
    const plain = recorder();
    drawLabels(plain.ctx, rig, parts, view);
    const lit = recorder();
    drawLabels(lit.ctx, rig, parts, view, { lit: { scene, field } });
    const at = (r: ReturnType<typeof recorder>, id: string) =>
      r.texts.find((t) => t.text === parts.find((p) => p.id === id)!.label)!;
    const a = at(lit, 'work');
    const b = at(plain, 'work');
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.5);
    // A part with no lit fibre keeps its region's place.
    const other = parts.find((p) => p.enabled && p.id !== 'work')!;
    expect(at(lit, other.id).x).toBeCloseTo(at(plain, other.id).x);
    expect(at(lit, other.id).y).toBeCloseTo(at(plain, other.id).y);
  });

  it('uses the pulled position of a region', () => {
    const at = pulledLabel(rig, regionKey(parts[0]!.region), 0);
    expect(at).toEqual(rig.labelAt.get(regionKey(parts[0]!.region)));
  });
});

describe('drawDim', () => {
  const stub = () =>
    vi.stubGlobal(
      'Path2D',
      class {
        moveTo(): void {}
        lineTo(): void {}
        rect(): void {}
      },
    );

  it('fades to half its alpha while a part is selected', () => {
    const field = buildField();
    const rig = buildRig(field);
    const view = { w: 300, h: 300, top: 0, bottom: 0, cam };
    const run = (selected: boolean) => {
      const r = recorder();
      stub();
      try {
        drawDim(r.ctx, field, rig, view, false, selected);
      } finally {
        vi.unstubAllGlobals();
      }
      return r.strokes;
    };
    const plain = run(false);
    const dimmed = run(true);
    expect(plain.length).toBeGreaterThan(0);
    dimmed.forEach((a, i) => expect(a).toBeCloseTo(plain[i]! * 0.5));
  });

  it('strokes with butt caps and miter joins, whatever the context held before', () => {
    const field = buildField();
    const rig = buildRig(field);
    const seen: { cap: string; join: string }[] = [];
    const state = { lineCap: 'round', lineJoin: 'round' };
    const ctx = new Proxy(state, {
      get: (t, key) => {
        if (key === 'stroke') {
          return () => seen.push({ cap: t.lineCap, join: t.lineJoin });
        }
        return Reflect.get(t, key) ?? (() => undefined);
      },
    }) as unknown as CanvasRenderingContext2D;
    const view = { w: 300, h: 300, top: 0, bottom: 0, cam };
    vi.stubGlobal(
      'Path2D',
      class {
        moveTo(): void {}
        lineTo(): void {}
        rect(): void {}
      },
    );
    try {
      drawDim(ctx, field, rig, view, false);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(seen.length).toBeGreaterThan(0);
    for (const s of seen) expect(s).toEqual({ cap: 'butt', join: 'miter' });
  });
});
