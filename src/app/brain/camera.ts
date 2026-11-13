import { EXPLODE_FROM_ZOOM, TURN_STEP_RAD, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './constants';

export type Camera = { yaw: number; pitch: number; zoom: number };

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
