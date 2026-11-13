import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectBrainSpace } from '../../domain/brainSpace';
import type { Plan } from '../../domain/config';
import { DEFAULT_PARTS } from '../../domain/defaults';
import { buildField } from '../../geometry/field';
import { createRenderer, type RenderState } from './brain';
import { BRAIN_CENTRE } from './constants';
import { buildRig, pulledLabel } from './draw';

const lookOf = (at: readonly number[]): string => at.map((v) => v.toFixed(2)).join(',');

/** Just enough of a browser for the renderer: a context that does nothing, and a frame queue. */
function setup(opts: { reduce?: boolean } = {}) {
  const frames: FrameRequestCallback[] = [];
  const control = { throwOnDraw: false };
  const calls: Record<string, number> = {};
  const ctx = new Proxy(
    {},
    {
      get: (_t, key) => {
        if (typeof key === 'string') calls[key] = (calls[key] ?? 0) + 1;
        if (key === 'measureText') return () => ({ width: 10 });
        if (key === 'drawImage')
          return () => {
            if (control.throwOnDraw) throw new Error('draw failed');
          };
        return () => undefined;
      },
      set: () => true,
    },
  );
  const listeners = new Map<string, (e: unknown) => void>();
  const element = () => ({
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    clientWidth: 300,
    clientHeight: 200,
    width: 0,
    height: 0,
    getContext: () => ctx,
    setPointerCapture: () => undefined,
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  });
  const canvas = element();
  const query = (q: string) => ({
    matches: opts.reduce === true && q.includes('reduce'),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal('window', {
    devicePixelRatio: 1,
    innerHeight: 200,
    matchMedia: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal('document', {
    hidden: false,
    documentElement: { scrollHeight: 100 },
    createElement: element,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal(
    'Path2D',
    class {
      moveTo(): void {}
      lineTo(): void {}
      arc(): void {}
      rect(): void {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  const reported: unknown[] = [];
  vi.stubGlobal('reportError', (e: unknown) => reported.push(e));

  const renderer = createRenderer(canvas as unknown as HTMLCanvasElement, {
    variant: 'plate',
    now: () => 0,
    onPartTap: () => undefined,
  });
  const state = (over: Partial<RenderState> = {}): RenderState => ({
    space: projectBrainSpace([], [], DEFAULT_PARTS, 0),
    parts: DEFAULT_PARTS,
    selected: null,
    still: false,
    ...over,
  });
  /** Runs the queued frame, if any, at `time`. */
  const flush = (time: number): void => {
    const next = frames.shift();
    next?.(time);
  };
  /** A press, a move well past the tap slop, and a release on the canvas. */
  const pointer = {
    /** Presses and drags without releasing, so the loop keeps running. */
    press: (): void => {
      listeners.get('pointerdown')?.({ pointerId: 1, clientX: 10, clientY: 20 });
      listeners.get('pointermove')?.({ pointerId: 1, clientX: 80, clientY: 20 });
    },
    drag: (): void => {
      const at = (x: number) => ({ pointerId: 1, clientX: x, clientY: 20 });
      listeners.get('pointerdown')?.(at(10));
      listeners.get('pointermove')?.(at(80));
      listeners.get('pointerup')?.(at(80));
    },
  };
  return { renderer, canvas, control, pointer, reported, state, flush, frames, calls };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('a draw error', () => {
  it('stops the loop, is reported, and ends further frames', () => {
    const h = setup();
    h.control.throwOnDraw = true;
    h.renderer.update(h.state());
    expect(h.frames).toHaveLength(1);
    h.flush(0);
    expect(h.reported).toHaveLength(1);
    expect(h.canvas.dataset['loop']).toBe('idle');
    h.renderer.update(h.state());
    expect(h.frames).toHaveLength(0);
  });
});

describe('camera moves', () => {
  const START_YAW = '-1.57';
  const FACING_WORK_YAW = '-1.03';

  it('ease to a selected part, aiming the yaw at once', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.flush(0);
    h.renderer.update(h.state({ selected: 'work' }));
    // The yaw that turns region-1's centre to face the viewer (facing() in draw.ts).
    expect(h.canvas.dataset['yaw']).toBe(FACING_WORK_YAW);
    h.flush(0);
    h.flush(16);
    expect(h.canvas.dataset['loop']).toBe('running');
  });

  it('snap to a selected part under Still', () => {
    const h = setup();
    h.renderer.update(h.state({ still: true }));
    h.flush(0);
    h.renderer.update(h.state({ still: true, selected: 'work' }));
    expect(h.canvas.dataset['yaw']).not.toBe(START_YAW);
    h.flush(0);
    expect(h.canvas.dataset['loop']).toBe('idle');
  });

  it('snap under reduced motion even with Still off', () => {
    const h = setup({ reduce: true });
    h.renderer.update(h.state());
    h.flush(0);
    h.renderer.turn(1);
    h.flush(0);
    expect(h.canvas.dataset['loop']).toBe('idle');
    h.renderer.zoom(1);
    h.flush(16);
    expect(h.canvas.dataset['loop']).toBe('idle');
  });

  it('keep easing without reduced motion', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.flush(0);
    h.renderer.turn(1);
    h.flush(0);
    h.flush(16);
    expect(h.canvas.dataset['loop']).toBe('running');
    h.flush(1000);
    expect(h.canvas.dataset['loop']).toBe('idle');
  });

  it('land exactly on the target, so the loop goes idle', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.flush(0);
    // A turn whose end value shows a rounding residue under `from + (to - from) * 1`.
    for (let i = 0; i < 11; i++) h.renderer.turn(1);
    for (let t = 0; t < 600; t += 16) h.flush(t);
    h.flush(1000);
    expect(h.canvas.dataset['loop']).toBe('idle');
    expect(h.frames).toHaveLength(0);
  });

  it('keep a zoom ease on its own clock while a drag turns the view', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.flush(0);
    h.renderer.zoom(1);
    h.flush(0);
    h.flush(240); // halfway through the zoom ease
    h.pointer.drag();
    h.flush(250);
    h.flush(480); // 480 ms after the zoom began, whatever the drag did
    h.flush(490);
    expect(h.canvas.dataset['zoom']).toBe('1.25');
    expect(h.frames).toHaveLength(0);
    expect(h.canvas.dataset['loop']).toBe('idle');
  });
});

describe('the band', () => {
  it('clips every layer to it', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.flush(0);
    expect(h.calls['clip']).toBeGreaterThanOrEqual(2); // the cached layer and the live layer
    expect(h.calls['restore']).toBe(h.calls['save']);
  });
});

describe('the look-at', () => {
  it('keeps its ease clock through a drag', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.flush(0);
    h.renderer.update(h.state({ selected: 'work' }));
    h.flush(0);
    h.flush(240);
    h.pointer.drag();
    h.flush(250);
    h.flush(490);
    h.flush(500);
    expect(h.frames).toHaveLength(0);
    expect(h.canvas.dataset['loop']).toBe('idle');
  });

  const rig = buildRig(buildField());
  // Zoom does not change on selecting, so the pull is the one at zoom 1: none.
  const workAt = lookOf(pulledLabel(rig, 'region-1', 0)!);

  it('eases to the selected region and back to the centre when the selection clears', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.flush(0);
    expect(h.canvas.dataset['look']).toBe(lookOf(BRAIN_CENTRE));
    h.renderer.update(h.state({ selected: 'work' }));
    expect(h.canvas.dataset['look']).toBe(workAt);
    h.flush(0);
    h.flush(16);
    expect(h.canvas.dataset['loop']).toBe('running');
    h.flush(1000);
    expect(h.canvas.dataset['loop']).toBe('idle');
    h.renderer.update(h.state({ selected: null }));
    expect(h.canvas.dataset['look']).toBe(lookOf(BRAIN_CENTRE));
    h.flush(1100);
    h.flush(1116);
    expect(h.canvas.dataset['loop']).toBe('running');
    h.flush(2000);
    expect(h.canvas.dataset['loop']).toBe('idle');
  });

  it('snaps under Still', () => {
    const h = setup();
    h.renderer.update(h.state({ still: true }));
    h.flush(0);
    h.renderer.update(h.state({ still: true, selected: 'work' }));
    h.flush(0);
    expect(h.canvas.dataset['loop']).toBe('idle');
    expect(h.canvas.dataset['look']).toBe(workAt);
  });

  it('follows the pull when the selection is zoomed', () => {
    const h = setup({ reduce: true });
    h.renderer.update(h.state({ selected: 'work' }));
    h.flush(0);
    for (let i = 0; i < 4; i++) h.renderer.zoom(1);
    const zoom = Number(h.canvas.dataset['zoom']);
    const pulled = lookOf(pulledLabel(rig, 'region-1', Math.min(1, (zoom - 1.1) / 2.1))!);
    expect(h.canvas.dataset['look']).toBe(pulled);
    expect(pulled).not.toBe(workAt);
  });
});

describe('the static layer', () => {
  const plan: Plan = {
    id: 'p1',
    place: 'desk',
    firstAction: 'open it',
    time: '09:00',
    days: [1],
    graceMin: 30,
    active: true,
    createdAt: 0,
    editCount: 0,
    partId: 'work',
  };

  it('is redrawn only when the lines change, not on a Still toggle or an equal re-projection', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.flush(0);
    const rebuilds = (): number => h.calls['fillRect'] ?? 0;
    const before = rebuilds();
    expect(before).toBeGreaterThan(0);

    // Same content in new objects, with Still flipped.
    h.renderer.update(h.state({ still: true }));
    h.flush(16);
    expect(rebuilds()).toBe(before);

    // A new line does redraw it.
    h.renderer.update(
      h.state({ still: true, space: projectBrainSpace([], [plan], DEFAULT_PARTS, 0) }),
    );
    h.flush(32);
    expect(rebuilds()).toBeGreaterThan(before);
  });
});

describe('the draw report', () => {
  it('first covers more than one frame', () => {
    const h = setup();
    h.renderer.update(h.state());
    h.pointer.press();
    // Frames at rAF-like times well past one second, as on a real page.
    h.flush(5000);
    expect(h.canvas.dataset['drawMean']).toBeUndefined();
    for (let t = 5016; t < 6100; t += 16) h.flush(t);
    expect(h.canvas.dataset['drawMean']).toBeDefined();
  });
});
