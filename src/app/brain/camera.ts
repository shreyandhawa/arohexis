import {
  EXPLODE_FROM_ZOOM,
  PULL_FIT,
  TURN_STEP_RAD,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from './constants';

/** `look` is the field point at the centre of the free band. */
export type Camera = {
  yaw: number;
  pitch: number;
  zoom: number;
  look: readonly [number, number, number];
};

export const clampZoom = (zoom: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

export function turnBy(c: Camera, step: -1 | 1): Camera {
  return { ...c, yaw: c.yaw + step * TURN_STEP_RAD };
}

export function zoomBy(c: Camera, step: -1 | 1): Camera {
  return { ...c, zoom: clampZoom(step === 1 ? c.zoom * ZOOM_STEP : c.zoom / ZOOM_STEP) };
}

/** 0 at or below EXPLODE_FROM_ZOOM, rising straight to 1 at ZOOM_MAX. */
export function explodeAmount(zoom: number): number {
  if (zoom <= EXPLODE_FROM_ZOOM) return 0;
  return Math.min(1, (zoom - EXPLODE_FROM_ZOOM) / (ZOOM_MAX - EXPLODE_FROM_ZOOM));
}

/**
 * The magnification a zoom gives. It grows to EXPLODE_FROM_ZOOM and never past it: beyond that a
 * zoom step only pulls the regions apart, and the scale gives back PULL_FIT of itself at full pull
 * so the pulled-apart brain still fits the band in its side view.
 */
export const scaleZoom = (zoom: number): number =>
  Math.min(zoom, EXPLODE_FROM_ZOOM) * (1 - PULL_FIT * explodeAmount(zoom));

/** `--ease-standard`: cubic-bezier(0.23, 1, 0.32, 1), as progress 0..1 in, eased 0..1 out. */
export function easeStandard(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const [x1, y1, x2, y2] = [0.23, 1, 0.32, 1];
  const bez = (a: number, b: number, u: number): number =>
    3 * a * (1 - u) * (1 - u) * u + 3 * b * (1 - u) * u * u + u * u * u;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const err = bez(x1, x2, u) - t;
    const slope = 3 * x1 * (1 - u) * (1 - u) + 6 * (x2 - x1) * (1 - u) * u + 3 * (1 - x2) * u * u;
    if (Math.abs(err) < 1e-5 || slope < 1e-6) break;
    u -= err / slope;
  }
  return bez(y1, y2, Math.min(1, Math.max(0, u)));
}

/** Share of the strip's width and height the lit line may fill; the rest is padding. */
export const STRIP_FILL = 0.76;
/** The most the strip magnifies the drawing. */
export const STRIP_FIT_MAX = 4;

/** The centre of a flat list of x, y, z points' bounding box. */
export function boxCentre(points: readonly ArrayLike<number>[]): [number, number, number] {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < p.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = p[i + k]!;
        if (v < lo[k]!) lo[k] = v;
        if (v > hi[k]!) hi[k] = v;
      }
    }
  }
  return [0, 1, 2].map((k) => (lo[k]! + hi[k]!) / 2) as [number, number, number];
}

/**
 * The extra magnification that makes a projected box (`spanX` by `spanY` px at fit 1) fill
 * STRIP_FILL of a `w` by `h` strip, never below 1 or above STRIP_FIT_MAX.
 */
export function stripFit(w: number, h: number, spanX: number, spanY: number): number {
  const byW = (STRIP_FILL * w) / Math.max(spanX, 1);
  const byH = (STRIP_FILL * h) / Math.max(spanY, 1);
  return Math.min(STRIP_FIT_MAX, Math.max(1, Math.min(byW, byH)));
}
