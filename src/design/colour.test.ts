import { describe, expect, it } from 'vitest';
import rawTokensCss from './tokens.css?raw';
import rawGlobalCss from './global.css?raw';
import { contrastRatio } from './contrast';
import { ciede2000, ciede2000Lab, hslToHex, simulateCvd } from './colour';
import { PART_COLOURS, PLATE } from './partColours';
import type { Hsl } from './partColours';

const tokensCss = rawTokensCss.replaceAll('"', "'");
const globalCss = rawGlobalCss.replaceAll('"', "'");

function blockAfter(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`unclosed block: ${selector}`);
}

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}

const ids = [1, 2, 3, 4, 5, 6] as const;
const kinds = ['protanopia', 'deuteranopia', 'tritanopia'] as const;
const bases = ids.map((id) => ({ id, hsl: PART_COLOURS[id], hex: hslToHex(PART_COLOURS[id]) }));

describe('ciede2000', () => {
  it('matches Sharma, Wu and Dalal (2005)', () => {
    const ref: [number, number, number, number, number, number, number][] = [
      [50, 2.6772, -79.7751, 50, 0, -82.7485, 2.0425],
      [50, 3.1571, -77.2803, 50, 0, -82.7485, 2.8615],
      [50, 2.8361, -74.02, 50, 0, -82.7485, 3.4412],
    ];
    for (const [L1, a1, b1, L2, a2, b2, want] of ref) {
      expect(ciede2000Lab({ L: L1, a: a1, b: b1 }, { L: L2, a: a2, b: b2 })).toBeCloseTo(want, 4);
    }
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
          const c: Hsl = { h: (hsl.h + dh + 360) % 360, s: hsl.s, l: hsl.l + dl };
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

describe('tokens.css plate tokens', () => {
  const root = declarations(blockAfter(tokensCss, ':root {'));

  it('mirrors partColours.ts', () => {
    expect(root['--plate-bg']!.toLowerCase()).toBe(PLATE.bg.toLowerCase());
    expect(root['--plate-dim-point']!.toLowerCase()).toBe(PLATE.dimPoint.toLowerCase());
    expect(root['--plate-dim-trace']!.toLowerCase()).toBe(PLATE.dimTrace.toLowerCase());
    expect(root['--plate-waiting']!.toLowerCase()).toBe(PLATE.waiting.toLowerCase());
    expect(root['--plate-core']!.toLowerCase()).toBe(PLATE.core.toLowerCase());
    for (const { id, hsl } of bases) {
      expect(root[`--part-${id}`], `--part-${id}`).toBe(`hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`);
    }
  });

  it('declares plate and part tokens only outside the theme blocks', () => {
    const dark = blockAfter(tokensCss, ":root[data-theme='dark']");
    expect(dark).not.toMatch(/--plate-|--part-/);
  });

  it('.plate-scope equals the dark block', () => {
    const scope = declarations(blockAfter(tokensCss, '.plate-scope'));
    const dark = declarations(blockAfter(tokensCss, ":root[data-theme='dark']"));
    expect(Object.keys(scope).length).toBeGreaterThan(10);
    expect(scope).toEqual(dark);
  });
});

describe('global.css', () => {
  it('has a .visually-hidden class', () => {
    const block = blockAfter(globalCss, '.visually-hidden');
    expect(block).toMatch(/position:\s*absolute/);
    expect(block).toMatch(/clip-path:\s*inset\(50%\)|clip:\s*rect/);
    expect(block).toMatch(/width:\s*1px/);
  });
});
