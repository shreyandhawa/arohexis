import type { ColourId } from '../domain/config';

export type Hsl = { h: number; s: number; l: number };

/** The plate is always dark, in both themes (ADR-026, spec §16.7). */
export const PLATE = {
  bg: '#05060A',
  dimPoint: '#8E98AC',
  dimTrace: '#7C8598',
  waiting: '#EEF1F6',
  core: '#9AA3B5',
} as const;

/** Part colours (spec §16.7). Ids 1 to 5 are the reference's; id 6 is blue, lightness raised from 70 to 76 to pass the colour-vision check. */
export const PART_COLOURS: Readonly<Record<ColourId, Hsl>> = {
  1: { h: 190, s: 92, l: 62 },
  2: { h: 322, s: 92, l: 66 },
  3: { h: 140, s: 82, l: 58 },
  4: { h: 38, s: 95, l: 60 },
  5: { h: 262, s: 92, l: 72 },
  6: { h: 225, s: 90, l: 76 },
};
