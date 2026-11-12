import { hash32, mulberry32 } from '../domain/random';

export type Hsl = { h: number; s: number; l: number };

const HUE_RANGE = 8;
const LIGHTNESS_RANGE = 6;

/** A slight shade of `base`, fixed by the line id: hue within ±8°, lightness within ±6 points. */
export function lineShade(lineId: string, base: Hsl): Hsl {
  const next = mulberry32(hash32(lineId));
  const dh = (next() * 2 - 1) * HUE_RANGE;
  const dl = (next() * 2 - 1) * LIGHTNESS_RANGE;
  return {
    h: (((base.h + dh) % 360) + 360) % 360,
    s: base.s,
    l: Math.min(100, Math.max(0, base.l + dl)),
  };
}
