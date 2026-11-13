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
/** A free band shorter than this (CSS px) is too small to draw in, so the drawing frames the whole stage. */
export const MIN_BAND = 120;
/** How much of the 1.1 scale the drawing gives back at full pull, so the pulled regions stay in the band. */
export const PULL_FIT = 0.45;
/**
 * The strip's own floor (CSS px). The strip is 64 to 80 px tall, so it can't use MIN_BAND; below this its
 * insets are ignored and the drawing frames the whole strip. At 64 px with 8 px of inset top and bottom the
 * band is 48, which still draws.
 */
export const MIN_STRIP_BAND = 48;
/** The reveal's length is `TIMER_SECONDS`; this is how long the settle ring takes (`--motion-slow`). */
export const SETTLE_MS = 480;
/** Under Still the burst is a fade this long (spec §16.8). */
export const STILL_FADE_MS = 120;
/** The most the mean draw may take (ms) in the iPhone drag test. Provisional until CI measures it (ADR-029). */
// R40: twice the Apple WebKit mean (0.72–0.8 ms locally), rounded up to 0.5 ms.
export const DRAW_MEAN_BUDGET_MS = 2;
// R40: CI's Linux WebKit draws in software (88–103 ms mean on the first run), so CI has its own guard.
export const CI_DRAW_MEAN_BUDGET_MS = 250;
