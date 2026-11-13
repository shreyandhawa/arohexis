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
