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
