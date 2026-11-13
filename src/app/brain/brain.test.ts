import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectBrainSpace } from '../../domain/brainSpace';
import { DEFAULT_PARTS } from '../../domain/defaults';
import { createRenderer, type RenderState } from './brain';

/** Just enough of a browser for the renderer: a context that does nothing, and a frame queue. */
function setup(opts: { reduce?: boolean } = {}) {
  const frames: FrameRequestCallback[] = [];
  const control = { throwOnDraw: false };
  const ctx = new Proxy(
    {},
    {
      get: (_t, key) => {
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
    drag: (): void => {
      const at = (x: number) => ({ pointerId: 1, clientX: x, clientY: 20 });
      listeners.get('pointerdown')?.(at(10));
      listeners.get('pointermove')?.(at(80));
      listeners.get('pointerup')?.(at(80));
    },
  };
  return { renderer, canvas, control, pointer, reported, state, flush, frames };
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
