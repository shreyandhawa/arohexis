import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { ciede2000, ciede2000Lab, hslToHex, simulateCvd } from './colour';
import { PART_COLOURS, PLATE } from './partColours';
import type { Hsl } from './partColours';

const ids = [1, 2, 3, 4, 5, 6] as const;
const kinds = ['protanopia', 'deuteranopia', 'tritanopia'] as const;
const bases = ids.map((id) => ({ id, hsl: PART_COLOURS[id], hex: hslToHex(PART_COLOURS[id]) }));

describe('ciede2000', () => {
  it('matches Sharma, Wu and Dalal (2005)', () => {
    const ref: [number, number, number, number, number, number, number][] = [
      [50, 2.6772, -79.7751, 50, 0, -82.7485, 2.0425],
      [50, 3.1571, -77.2803, 50, 0, -82.7485, 2.8615],
      [50, 2.8361, -74.02, 50, 0, -82.7485, 3.4412],
      // Rows 7, 9, 11, 13 and 15 of the published test data
      // (hajim.rochester.edu/ece/sites/gsharma/ciede2000/dataNprograms/ciede2000testdata.txt).
      // Row 7: zero chroma on one side, so the hue difference is forced to 0.
      [50, 0, 0, 50, -1, 2, 2.3669],
      // Rows 9 and 11: hue primes sit on either side of the 180 degree boundary.
      // Row 9 falls on the |h1 - h2| <= 180 branch of the mean hue, row 11 on the > 180 branch;
      // rows 13 and 15 are the same pair of branches on the other axis.
      [50, 2.49, -0.001, 50, -2.49, 0.0009, 7.1792],
      [50, 2.49, -0.001, 50, -2.49, 0.0011, 7.2195],
      [50, -0.001, 2.49, 50, 0.0009, -2.49, 4.8045],
      [50, -0.001, 2.49, 50, 0.0011, -2.49, 4.7461],
    ];
    for (const [L1, a1, b1, L2, a2, b2, want] of ref) {
      expect(ciede2000Lab({ L: L1, a: a1, b: b1 }, { L: L2, a: a2, b: b2 })).toBeCloseTo(want, 4);
    }
  });

  it('normalises the hue in hslToHex', () => {
    const base = { s: 80, l: 50 };
    expect(hslToHex({ h: -120, ...base })).toBe(hslToHex({ h: 240, ...base }));
    expect(hslToHex({ h: 480, ...base })).toBe(hslToHex({ h: 120, ...base }));
    expect(hslToHex({ h: 360, ...base })).toBe(hslToHex({ h: 0, ...base }));
  });

  it('is zero for identical hex colours and symmetric', () => {
    expect(ciede2000('#336699', '#336699')).toBe(0);
    expect(ciede2000('#336699', '#99cc33')).toBeCloseTo(ciede2000('#99cc33', '#336699'), 6);
  });
});

describe('simulateCvd', () => {
  it('leaves greys unchanged', () => {
    for (const kind of kinds) {
      for (const g of ['#000000', '#808080', '#ffffff']) {
        const out = simulateCvd(g, kind);
        for (const i of [1, 3, 5]) {
          expect(
            Math.abs(parseInt(out.slice(i, i + 2), 16) - parseInt(g.slice(i, i + 2), 16)),
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('turns pure red under protanopia into the matrix row by hand', () => {
    // Machado 2009, protanopia, severity 1.0, first column: (0.152286, 0.114503, -0.003882).
    const enc = (v: number): number => {
      const c = Math.min(1, Math.max(0, v));
      const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
      return Math.round(s * 255);
    };
    const want = `#${[0.152286, 0.114503, -0.003882].map((v) => enc(v).toString(16).padStart(2, '0')).join('')}`;
    expect(simulateCvd('#ff0000', 'protanopia')).toBe(want);
  });
});

describe('part colours meet spec §16.7', () => {
  it('uses the reference colours for ids 1 to 5', () => {
    expect(PART_COLOURS[1]).toEqual({ h: 190, s: 92, l: 62 });
    expect(PART_COLOURS[2]).toEqual({ h: 322, s: 92, l: 66 });
    expect(PART_COLOURS[3]).toEqual({ h: 140, s: 82, l: 58 });
    expect(PART_COLOURS[4]).toEqual({ h: 38, s: 95, l: 60 });
    expect(PART_COLOURS[5]).toEqual({ h: 262, s: 92, l: 72 });
  });

  it('every base colour is at least 4.5:1 against the plate', () => {
    for (const { id, hex } of bases) {
      expect(contrastRatio(hex, PLATE.bg), `colour ${id} ${hex}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the four shade corners are at least 3:1', () => {
    for (const { id, hsl } of bases) {
      for (const dh of [-8, 8]) {
        for (const dl of [-6, 6]) {
          const c: Hsl = { h: hsl.h + dh, s: hsl.s, l: hsl.l + dl };
          expect(
            contrastRatio(hslToHex(c), PLATE.bg),
            `colour ${id} ${dh}/${dl}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('waiting lines are at least 3:1', () => {
    expect(contrastRatio(PLATE.waiting, PLATE.bg)).toBeGreaterThanOrEqual(3);
  });

  it('every pair is at least 12 apart, and 6 under each simulation', () => {
    for (let i = 0; i < bases.length; i++) {
      for (let j = i + 1; j < bases.length; j++) {
        const a = bases[i]!;
        const b = bases[j]!;
        expect(ciede2000(a.hex, b.hex), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(12);
        for (const kind of kinds) {
          expect(
            ciede2000(simulateCvd(a.hex, kind), simulateCvd(b.hex, kind)),
            `${a.id} vs ${b.id} ${kind}`,
          ).toBeGreaterThanOrEqual(6);
        }
      }
    }
  });

  it('no hue lies within 15 degrees of red', () => {
    for (const { id, hsl } of bases) {
      const d = Math.min(hsl.h % 360, 360 - (hsl.h % 360));
      expect(d, `colour ${id}`).toBeGreaterThan(15);
    }
  });
});
