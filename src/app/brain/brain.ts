// The lazy Brain space entry: the canvas 2D renderer (spec §16.6 to §16.8, ADR-029).
import type { BrainSpace } from '../../domain/brainSpace';
import { RESTING_BRIGHTNESS } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { PLATE } from '../../design/partColours';
import { buildField, type Field } from '../../geometry/field';
import { clampZoom, turnBy, zoomBy, type Camera } from './camera';
import {
  buildRig,
  buildScene,
  drawDim,
  drawLabels,
  drawLit,
  hitTest,
  type Rig,
  type Scene,
  type View,
} from './draw';

export type RenderState = {
  space: BrainSpace;
  parts: readonly Part[];
  selected: string | null;
  still: boolean;
  reveal?: { lineId: string; startAt: number };
  burstAt?: number;
};

export interface BrainRenderer {
  update(state: RenderState): void;
  turn(step: -1 | 1): void;
  zoom(step: -1 | 1): void;
  destroy(): void;
}

type Options = {
  variant: 'plate' | 'strip';
  now: () => number;
  onPartTap: (partId: string | null) => void;
};

/** Side view with the front on the left. */
const START_CAMERA: Camera = { yaw: -Math.PI / 2, pitch: 0, zoom: 1 };
/** Time constant of camera easing; about 98% done by --motion-slow (480 ms). */
const EASE_MS = 120;
const TAP_SLOP = 6;
const TAP_RADIUS = 24;
const DRAW_SAMPLES = 120;

export function createRenderer(canvas: HTMLCanvasElement, opts: Options): BrainRenderer {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('no 2D canvas');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let state: RenderState | undefined;
  let field: Field | undefined;
  let rig: Rig | undefined;
  let scene: Scene = { items: [], signals: false };
  let cam: Camera = { ...START_CAMERA };
  let target: Camera = { ...START_CAMERA };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let running = false;
  let dragging = false;
  let lastFrame = 0;
  let destroyed = false;
  let cacheKey = '';
  const cache = document.createElement('canvas');
  const cacheCtx = cache.getContext('2d');
  const samples: number[] = [];
  let lastReport = 0;

  const report = (): void => {
    canvas.dataset['yaw'] = target.yaw.toFixed(2);
    canvas.dataset['zoom'] = target.zoom.toFixed(2);
  };
  const setLoop = (on: boolean): void => {
    if (running === on) return;
    running = on;
    canvas.dataset['loop'] = on ? 'running' : 'idle';
  };
  report();
  canvas.dataset['loop'] = 'idle';

  const still = (): boolean => state?.still ?? false;
  const easing = (): boolean =>
    cam.yaw !== target.yaw || cam.pitch !== target.pitch || cam.zoom !== target.zoom;
  const signalsOn = (): boolean => scene.signals && state?.space.motion === 'moving' && !still();
  const needsLoop = (): boolean => !document.hidden && (dragging || easing() || signalsOn());

  function syncTouchAction(): void {
    const scrolls = document.documentElement.scrollHeight > window.innerHeight + 1;
    canvas.style.touchAction = scrolls ? 'pan-y' : 'none';
  }

  function size(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = w;
    height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    cache.width = canvas.width;
    cache.height = canvas.height;
    cacheKey = '';
    syncTouchAction();
  }

  function ensureField(): { field: Field; rig: Rig } {
    if (!field || !rig) {
      const t0 = performance.now();
      field = buildField();
      rig = buildRig(field);
      canvas.dataset['fieldMs'] = (performance.now() - t0).toFixed(1);
    }
    return { field, rig };
  }

  function draw(time: number, detailed: boolean): void {
    if (width === 0 || !state) return;
    const { field: f, rig: r } = ensureField();
    const view: View = { w: width, h: height, cam };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = PLATE.bg;
    ctx.fillRect(0, 0, width, height);

    const key = `${width}x${height}:${dpr}:${cam.yaw}:${cam.pitch}:${cam.zoom}:${detailed}`;
    if (cacheCtx) {
      if (key !== cacheKey) {
        cacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cacheCtx.clearRect(0, 0, width, height);
        drawDim(cacheCtx, f, r, view, detailed);
        cacheKey = key;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(cache, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      drawDim(ctx, f, r, view, detailed);
    }

    drawLit({
      ctx,
      field: f,
      rig: r,
      scene,
      view,
      selected: state.selected,
      resting: state.space.motion === 'resting',
      signalsOn: signalsOn(),
      time,
      restingBrightness: RESTING_BRIGHTNESS,
    });
    drawLabels(ctx, r, state.parts, view);
  }

  function frame(time: number): void {
    raf = 0;
    if (destroyed) return;
    const dt = lastFrame === 0 ? 16 : Math.min(100, time - lastFrame);
    lastFrame = time;
    if (still() || !easing()) {
      if (still()) cam = { ...target };
    } else {
      const k = 1 - Math.exp(-dt / EASE_MS);
      const next: Camera = {
        yaw: cam.yaw + (target.yaw - cam.yaw) * k,
        pitch: cam.pitch + (target.pitch - cam.pitch) * k,
        zoom: cam.zoom + (target.zoom - cam.zoom) * k,
      };
      const near =
        Math.abs(target.yaw - next.yaw) < 0.002 &&
        Math.abs(target.pitch - next.pitch) < 0.002 &&
        Math.abs(target.zoom - next.zoom) < 0.002;
      cam = near ? { ...target } : next;
    }
    const moving = dragging || easing();
    const t0 = performance.now();
    draw(time, !moving);
    samples.push(performance.now() - t0);
    if (samples.length > DRAW_SAMPLES) samples.shift();

    const loop = needsLoop();
    setLoop(loop);
    if (loop) {
      if (time - lastReport >= 1000 && samples.length > 0) {
        lastReport = time;
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        canvas.dataset['drawMean'] = mean.toFixed(2);
      }
      raf = requestAnimationFrame(frame);
    } else {
      lastFrame = 0;
    }
  }

  function request(): void {
    if (destroyed || raf !== 0 || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }

  function aim(next: Camera): void {
    target = next;
    report();
    if (still()) cam = { ...target };
    request();
  }

  // ---- input ----

  const pointers = new Map<number, { x: number; y: number }>();
  let downAt: { x: number; y: number } | undefined;
  let moved = false;
  let pinch = 0;

  const local = (e: PointerEvent | WheelEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const spread = (): number => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  function onDown(e: PointerEvent): void {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // the pointer is already gone
    }
    if (pointers.size === 1) {
      downAt = local(e);
      moved = false;
    } else {
      moved = true;
      pinch = spread();
    }
  }

  function onMove(e: PointerEvent): void {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, next);
    if (pointers.size >= 2) {
      const now = spread();
      if (pinch > 0 && now > 0) {
        const zoom = clampZoom(target.zoom * (now / pinch));
        cam = { ...cam, zoom };
        target = { ...target, zoom };
        report();
      }
      pinch = now;
      dragging = true;
      request();
      return;
    }
    const here = local(e);
    if (!moved && downAt && Math.hypot(here.x - downAt.x, here.y - downAt.y) > TAP_SLOP) {
      moved = true;
    }
    if (!moved) return;
    dragging = true;
    const yaw = cam.yaw + (next.x - prev.x) * 0.01;
    const pitch = Math.max(-1.2, Math.min(1.2, cam.pitch + (next.y - prev.y) * 0.01));
    cam = { ...cam, yaw, pitch };
    target = { ...target, yaw, pitch };
    report();
    request();
  }

  function onUp(e: PointerEvent): void {
    if (!pointers.delete(e.pointerId)) return;
    const wasTap = !moved && pointers.size === 0;
    if (pointers.size < 2) pinch = 0;
    if (pointers.size === 0) {
      dragging = false;
      target = { ...cam };
      request();
    }
    if (wasTap && state && field && rig) {
      const p = local(e);
      const hit = hitTest(scene, field, rig, { w: width, h: height, cam }, p.x, p.y, TAP_RADIUS);
      opts.onPartTap(hit ? hit.partId : null);
    }
  }

  function onCancel(e: PointerEvent): void {
    pointers.delete(e.pointerId);
    moved = true;
    if (pointers.size === 0) {
      dragging = false;
      request();
    }
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    aim({ ...target, zoom: clampZoom(target.zoom * Math.exp(-e.deltaY * 0.002)) });
  }

  function onVisibility(): void {
    if (!document.hidden) request();
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('visibilitychange', onVisibility);
  const observer = new ResizeObserver(() => {
    size();
    request();
  });
  observer.observe(canvas);
  size();

  return {
    update(next) {
      state = next;
      scene = buildScene(next.space, next.parts, ensureField().field);
      if (next.still) cam = { ...target };
      syncTouchAction();
      request();
    },
    turn(step) {
      aim(turnBy(target, step));
    },
    zoom(step) {
      aim(zoomBy(target, step));
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('wheel', onWheel);
      document.removeEventListener('visibilitychange', onVisibility);
      setLoop(false);
    },
  };
}
