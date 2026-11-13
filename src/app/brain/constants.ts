// Brain space numbers (spec §16.8).
export const EXPLODE_FROM_ZOOM = 1.1;
export const UNSELECTED_ALPHA = 0.15;
export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 3.2;
export const BURST_MS = 1800;
export const TURN_STEP_RAD = Math.PI / 8;
export const ZOOM_STEP = 1.25;
/** `--motion-slow`: how long the camera takes to ease. */
export const EASE_MS = 480;
/** Field point the camera looks at when nothing is selected: the middle of the drawing. */
export const BRAIN_CENTRE: readonly [number, number, number] = [0, -0.17, 0];
