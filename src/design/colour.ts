/** Colour maths for the plate: HSL to hex, CIEDE2000, and colour-vision simulation. */
import type { Hsl } from './partColours';

export type Lab = { L: number; a: number; b: number }; // CIELAB, D65

type Rgb = [number, number, number];

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number): number => {
  const v = Math.min(1, Math.max(0, c));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
};

function parseHex(hex: string): Rgb {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`expected a #rrggbb colour, got "${hex}"`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number): number => lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return toHex([f(0), f(8), f(4)]);
}

function hexToLab(hex: string): Lab {
  const [r, g, b] = parseHex(hex).map(toLinear) as Rgb;
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const rad = (d: number): number => (d * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

/** CIEDE2000 (Sharma, Wu and Dalal 2005), with kL = kC = kH = 1. */
export function ciede2000Lab(p: Lab, q: Lab): number {
  const c1 = Math.hypot(p.a, p.b);
  const c2 = Math.hypot(q.a, q.b);
  const cBar7 = ((c1 + c2) / 2) ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));
  const a1 = (1 + g) * p.a;
  const a2 = (1 + g) * q.a;
  const cp1 = Math.hypot(a1, p.b);
  const cp2 = Math.hypot(a2, q.b);
  const hue = (b: number, a: number): number =>
    b === 0 && a === 0 ? 0 : (deg(Math.atan2(b, a)) + 360) % 360;
  const hp1 = hue(p.b, a1);
  const hp2 = hue(q.b, a2);

  const dL = q.L - p.L;
  const dC = cp2 - cp1;
  let dh = 0;
  if (cp1 * cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(rad(dh / 2));

  const lBar = (p.L + q.L) / 2;
  const cBar = (cp1 + cp2) / 2;
  let hBar = hp1 + hp2;
  if (cp1 * cp2 !== 0) {
    if (Math.abs(hp1 - hp2) <= 180) hBar /= 2;
    else hBar = (hBar + (hBar < 360 ? 360 : -360)) / 2;
  }
  const t =
    1 -
    0.17 * Math.cos(rad(hBar - 30)) +
    0.24 * Math.cos(rad(2 * hBar)) +
    0.32 * Math.cos(rad(3 * hBar + 6)) -
    0.2 * Math.cos(rad(4 * hBar - 63));
  const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7));
  const sl = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sc = 1 + 0.045 * cBar;
  const sh = 1 + 0.015 * cBar * t;
  const rt = -Math.sin(rad(2 * dTheta)) * rc;

  return Math.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + (dH / sh) ** 2 + rt * (dC / sc) * (dH / sh));
}

export function ciede2000(a: string, b: string): number {
  return ciede2000Lab(hexToLab(a), hexToLab(b));
}

type Matrix = readonly [Rgb, Rgb, Rgb];

// Machado, Oliveira and Fernandes (2009), "A Physiologically-based Model for
// Simulation of Color Vision Deficiency", IEEE TVCG 15(6): severity 1.0 matrices,
// applied to linear RGB.
const CVD: Record<'protanopia' | 'deuteranopia' | 'tritanopia', Matrix> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export function simulateCvd(
  hex: string,
  kind: 'protanopia' | 'deuteranopia' | 'tritanopia',
): string {
  const [r, g, b] = parseHex(hex).map(toLinear) as Rgb;
  const m = CVD[kind];
  const out = m.map((row) => fromLinear(row[0] * r + row[1] * g + row[2] * b)) as Rgb;
  return toHex(out);
}
