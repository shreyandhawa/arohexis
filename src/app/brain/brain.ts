// The lazy Brain space entry: the canvas 2D renderer (spec §16.6 to §16.8, ADR-029).
import type { BrainSpace } from '../../domain/brainSpace';
import { RESTING_BRIGHTNESS } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { PLATE } from '../../design/partColours';
import { buildField, regionKey, type Field } from '../../geometry/field';
import { clampZoom, easeStandard, explodeAmount, turnBy, zoomBy, type Camera } from './camera';
import { BRAIN_CENTRE, EASE_MS } from './constants';
import {
  buildRig,
  buildScene,
  drawDim,
  drawLabels,
  drawLit,
  drawSignals,
  drawWaiting,
  facing,
  hitTest,
  pulledLabel,
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
const START_CAMERA: Camera = { yaw: -Math.PI / 2, pitch: 0, zoom: 1, look: BRAIN_CENTRE };
const TAP_SLOP = 6;
const TAP_RADIUS = 24;
const DRAW_SAMPLES = 120;

const sameLook = (a: Camera['look'], b: Camera['look']): boolean =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const lerpLook = (a: Camera['look'], b: Camera['look'], e: number): Camera['look'] => [
  a[0] + (b[0] - a[0]) * e,
  a[1] + (b[1] - a[1]) * e,
  a[2] + (b[2] - a[2]) * e,
];

function sameScene(a: Scene, b: Scene): boolean {
  if (a.signals !== b.signals || a.items.length !== b.items.length) return false;
  return a.items.every((x, i) => {
    const y = b.items[i]!;
    return (
      x.id === y.id &&
      x.partId === y.partId &&
      x.kind === y.kind &&
      x.strength === y.strength &&
      x.css === y.css &&
      x.fibre === y.fibre &&
      x.strand === y.strand
    );
  });
}

export function createRenderer(canvas: HTMLCanvasElement, opts: Options): BrainRenderer {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('no 2D canvas');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let state: RenderState | undefined;
  let field: Field | undefined;
  let rig: Rig | undefined;
  let scene: Scene = { items: [], signals: false };
  let sceneVersion = 0;
  let cam: Camera = { ...START_CAMERA };
  let target: Camera = { ...START_CAMERA };
  /** Where each ease started, and when (null until its first frame). Turning and zooming keep their own clocks. */
  let orbitFrom = {
    yaw: START_CAMERA.yaw,
    pitch: START_CAMERA.pitch,
    look: START_CAMERA.look,
  };
  let orbitStart: number | null = null;
  let zoomFrom = START_CAMERA.zoom;
  let zoomStart: number | null = null;
  let width = 0;
  let height = 0;
  /** The free band's insets (CSS px), read from the canvas's custom properties. */
  let insetTop = 0;
  let insetBottom = 0;
  let dpr = 1;
  let raf = 0;
  let running = false;
  let dragging = false;
  let settling = false;
  let destroyed = false;
  let broken = false;
  let cacheKey = '';
  const cache = document.createElement('canvas');
  const cacheCtx = cache.getContext('2d');
  const samples: number[] = [];
  /** Starts at the loop's first frame, so the first mean covers about a second of frames. */
  let lastReport: number | null = null;
  const reduce =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : undefined;

  const report = (): void => {
    canvas.dataset['yaw'] = target.yaw.toFixed(2);
    canvas.dataset['zoom'] = target.zoom.toFixed(2);
    canvas.dataset['look'] = target.look.map((v) => v.toFixed(2)).join(',');
  };
  const setLoop = (on: boolean): void => {
    if (running === on) return;
    running = on;
    canvas.dataset['loop'] = on ? 'running' : 'idle';
  };
  report();
  canvas.dataset['loop'] = 'idle';

  const still = (): boolean => state?.still ?? false;
  /** Camera moves snap under Still and under reduced motion; only the signals are exempt. */
  const snaps = (): boolean => still() || reduce?.matches === true;
  const easing = (): boolean =>
    cam.yaw !== target.yaw ||
    cam.pitch !== target.pitch ||
    cam.zoom !== target.zoom ||
    !sameLook(cam.look, target.look);
  const signalsOn = (): boolean => scene.signals && state?.space.motion === 'moving' && !still();
  const needsLoop = (): boolean => !document.hidden && (dragging || easing() || signalsOn());

  function syncTouchAction(): void {
    const scrolls = document.documentElement.scrollHeight > window.innerHeight + 1;
    canvas.style.touchAction = scrolls ? 'pan-y' : 'none';
  }

  /** The band between the plate's top row and bottom control row, from `--brain-inset-*` (0 when absent). */
  function readInsets(): { top: number; bottom: number } {
    if (typeof getComputedStyle !== 'function') return { top: 0, bottom: 0 };
    const style = getComputedStyle(canvas);
    const px = (name: string): number => {
      const v = parseFloat(style.getPropertyValue(name));
      return Number.isFinite(v) && v > 0 ? v : 0;
    };
    return { top: px('--brain-inset-top'), bottom: px('--brain-inset-bottom') };
  }

  /** Sizes the backing store to the canvas box and the device pixel ratio. Returns whether it changed. */
  function size(): boolean {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return false;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    syncTouchAction();
    const inset = readInsets();
    if (
      w === width &&
      h === height &&
      ratio === dpr &&
      inset.top === insetTop &&
      inset.bottom === insetBottom &&
      canvas.width > 0
    ) {
      return false;
    }
    insetTop = inset.top;
    insetBottom = inset.bottom;
    dpr = ratio;
    width = w;
    height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    cache.width = canvas.width;
    cache.height = canvas.height;
    cacheKey = '';
    return true;
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
    const view: View = { w: width, h: height, top: insetTop, bottom: insetBottom, cam };
    const resting = state.space.motion === 'resting';
    const lit = {
      ctx,
      field: f,
      rig: r,
      scene,
      view,
      selected: state.selected,
      resting,
      time,
      restingBrightness: RESTING_BRIGHTNESS,
    };

    // The static layer (plate, dim field, light) is redrawn only when its inputs change.
    const key = [
      width,
      height,
      insetTop,
      insetBottom,
      dpr,
      cam.yaw,
      cam.pitch,
      cam.zoom,
      cam.look.join(','),
      detailed,
      sceneVersion,
      state.selected,
      resting,
    ].join(':');
    if (cacheCtx) {
      if (key !== cacheKey) {
        cacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cacheCtx.globalCompositeOperation = 'source-over';
        cacheCtx.globalAlpha = 1;
        cacheCtx.fillStyle = PLATE.bg;
        cacheCtx.fillRect(0, 0, width, height);
        drawDim(cacheCtx, f, r, view, detailed, state.selected !== null);
        drawLit({ ...lit, ctx: cacheCtx });
        cacheKey = key;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(cache, 0, 0);
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PLATE.bg;
      ctx.fillRect(0, 0, width, height);
      drawDim(ctx, f, r, view, detailed, state.selected !== null);
      drawLit(lit);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (signalsOn()) drawSignals(lit);
    drawWaiting(lit);
    drawLabels(ctx, r, state.parts, view);
  }

  function stepCamera(time: number): void {
    if (!easing()) return;
    if (snaps()) {
      cam = { ...target };
      return;
    }
    const progress = (start: number | null): number => (time - (start ?? time)) / EASE_MS;
    let { yaw, pitch, zoom, look } = cam;
    if (cam.yaw !== target.yaw || cam.pitch !== target.pitch || !sameLook(cam.look, target.look)) {
      orbitStart ??= time;
      const p = progress(orbitStart);
      if (p >= 1) {
        // Land exactly on the target: `from + (to - from) * 1` can miss it by a rounding step.
        yaw = target.yaw;
        pitch = target.pitch;
        look = target.look;
        orbitStart = null;
      } else {
        const e = easeStandard(p);
        yaw = orbitFrom.yaw + (target.yaw - orbitFrom.yaw) * e;
        pitch = orbitFrom.pitch + (target.pitch - orbitFrom.pitch) * e;
        look = lerpLook(orbitFrom.look, target.look, e);
      }
    }
    if (cam.zoom !== target.zoom) {
      zoomStart ??= time;
      const p = progress(zoomStart);
      if (p >= 1) {
        zoom = target.zoom;
        zoomStart = null;
      } else {
        zoom = zoomFrom + (target.zoom - zoomFrom) * easeStandard(p);
      }
    }
    cam = { yaw, pitch, zoom, look };
  }

  /** A draw error stops the loop and is reported, so it reaches the console and the tests. The plate keeps its text. */
  function fail(e: unknown): void {
    broken = true;
    stop();
    if (typeof reportError === 'function') reportError(e);
    else console.error(e);
  }

  function stop(): void {
    raf = 0;
    setLoop(false);
  }

  function frame(time: number): void {
    raf = 0;
    if (destroyed || broken) return;
    try {
      stepCamera(time);
      const moving = dragging || easing();
      const t0 = performance.now();
      draw(time, !moving);
      const took = performance.now() - t0;
      if (!moving && settling) {
        settling = false;
        canvas.dataset['settleMs'] = took.toFixed(2);
      } else {
        samples.push(took);
        if (samples.length > DRAW_SAMPLES) samples.shift();
      }
      if (moving) settling = true;

      const loop = needsLoop();
      setLoop(loop);
      if (loop) {
        lastReport ??= time;
        if (time - lastReport >= 1000 && samples.length > 0) {
          lastReport = time;
          const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
          canvas.dataset['drawMean'] = mean.toFixed(2);
        }
        raf = requestAnimationFrame(frame);
      }
    } catch (e) {
      fail(e);
    }
  }

  function request(): void {
    if (destroyed || broken || raf !== 0 || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }

  /** Where the camera looks at `zoom`: the selected part's region, pulled as far as that zoom pulls it, else the centre. */
  function lookFor(zoom: number): Camera['look'] {
    const part =
      state?.selected == null ? undefined : state.parts.find((p) => p.id === state?.selected);
    const at = part && rig && pulledLabel(rig, regionKey(part.region), explodeAmount(zoom));
    return at ?? BRAIN_CENTRE;
  }

  /** Starts an ease to `next`, or snaps there under Still or reduced motion. */
  function aim(want: Camera): void {
    const next = { ...want, look: lookFor(want.zoom) };
    if (
      next.yaw !== target.yaw ||
      next.pitch !== target.pitch ||
      !sameLook(next.look, target.look)
    ) {
      orbitFrom = { yaw: cam.yaw, pitch: cam.pitch, look: cam.look };
      orbitStart = null;
    }
    if (next.zoom !== target.zoom) {
      zoomFrom = cam.zoom;
      zoomStart = null;
    }
    target = next;
    report();
    if (snaps()) cam = { ...target };
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

  /** A drag moves the camera at once. Only the parts it changes restart their ease clock. */
  function setDirect(next: Partial<Camera>): void {
    // A new zoom moves the region the camera looks at, so the look-at follows it.
    const direct = next.zoom === undefined ? next : { ...next, look: lookFor(next.zoom) };
    cam = { ...cam, ...direct };
    target = { ...target, ...direct };
    if (next.yaw !== undefined || next.pitch !== undefined) {
      orbitFrom = { yaw: cam.yaw, pitch: cam.pitch, look: cam.look };
      orbitStart = null;
    } else if (direct.look) {
      orbitFrom = { ...orbitFrom, look: direct.look };
    }
    if (next.zoom !== undefined) {
      zoomFrom = cam.zoom;
      zoomStart = null;
    }
    report();
    dragging = true;
    request();
  }

  function onMove(e: PointerEvent): void {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, next);
    if (pointers.size >= 2) {
      const now = spread();
      if (pinch > 0 && now > 0) setDirect({ zoom: clampZoom(target.zoom * (now / pinch)) });
      pinch = now;
      return;
    }
    const here = local(e);
    if (!moved && downAt && Math.hypot(here.x - downAt.x, here.y - downAt.y) > TAP_SLOP) {
      moved = true;
    }
    if (!moved) return;
    setDirect({
      yaw: cam.yaw + (next.x - prev.x) * 0.01,
      pitch: Math.max(-1.2, Math.min(1.2, cam.pitch + (next.y - prev.y) * 0.01)),
    });
  }

  function onUp(e: PointerEvent): void {
    if (!pointers.delete(e.pointerId)) return;
    const wasTap = !moved && pointers.size === 0;
    if (pointers.size < 2) pinch = 0;
    if (pointers.size === 0) {
      dragging = false;
      request();
    }
    if (wasTap && state && field && rig) {
      const p = local(e);
      const view: View = { w: width, h: height, top: insetTop, bottom: insetBottom, cam };
      const hit = hitTest(scene, field, rig, view, p.x, p.y, TAP_RADIUS);
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
    // While the page scrolls, only a trackpad pinch (ctrlKey) zooms, so the wheel can still scroll.
    if (canvas.style.touchAction === 'pan-y' && !e.ctrlKey) return;
    e.preventDefault();
    aim({ ...target, zoom: clampZoom(target.zoom * Math.exp(-e.deltaY * 0.002)) });
  }

  function onVisibility(): void {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      setLoop(false);
    } else {
      request();
    }
  }

  /** Resizes, and paints at once so the cleared canvas never shows. */
  function resize(): void {
    if (!size()) return;
    if (!broken) {
      try {
        draw(performance.now(), !(dragging || easing()));
      } catch (e) {
        fail(e);
      }
    }
    request();
  }

  // A move to another screen can change the pixel ratio without changing the box.
  let dprWatch: MediaQueryList | undefined;
  function watchDpr(): void {
    if (typeof window.matchMedia !== 'function') return;
    dprWatch?.removeEventListener('change', onDpr);
    dprWatch = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprWatch.addEventListener('change', onDpr);
  }
  function onDpr(): void {
    resize();
    watchDpr();
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', syncTouchAction);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  size();
  watchDpr();

  /** Eases the camera so a part's region faces the viewer, centred in the free band. */
  function faceRegion(partId: string, parts: readonly Part[]): void {
    const part = parts.find((p) => p.id === partId);
    const at = part && rig?.labelAt.get(regionKey(part.region));
    if (at) aim(facing(at, target));
    else aim(target);
  }

  return {
    update(next) {
      const before = state?.selected ?? null;
      state = next;
      const { field: f } = ensureField();
      const built = buildScene(next.space, next.parts, f);
      // Spec §16.6: the cached layer is redrawn only when the data changes, not on every re-emit.
      if (!sameScene(scene, built)) sceneVersion += 1;
      scene = built;
      if (next.still) cam = { ...target };
      if (next.selected !== before) {
        if (next.selected !== null) faceRegion(next.selected, next.parts);
        else aim(target); // the look-at returns to the centre
      }
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
      dprWatch?.removeEventListener('change', onDpr);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('wheel', onWheel);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', syncTouchAction);
      setLoop(false);
    },
  };
}
