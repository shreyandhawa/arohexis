import { describe, expect, it } from 'vitest';
import rawTokensCss from './tokens.css?raw';
import rawGlobalCss from './global.css?raw';
import { contrastRatio } from './contrast';

// Prettier prefers single quotes in selectors; compare without caring which.
const tokensCss = rawTokensCss.replaceAll('"', "'");
const globalCss = rawGlobalCss.replaceAll('"', "'");

type Theme = Record<string, string>;

/** Returns the body of the first `{ … }` block that follows `selector`. */
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

function declarations(body: string): Theme {
  const out: Theme = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]!] = m[2]!.trim();
  }
  return out;
}

const rootBlock = blockAfter(tokensCss, ':root {');
const light = declarations(rootBlock);
const mediaDarkBlock = blockAfter(
  blockAfter(tokensCss, '@media (prefers-color-scheme: dark)'),
  ":root:not([data-theme='light'])",
);
const attrDarkBlock = blockAfter(tokensCss, ":root[data-theme='dark']");
const dark = declarations(attrDarkBlock);

const themes: [string, Theme][] = [
  ['light', light],
  ['dark', dark],
];

const hex = (theme: Theme, name: string): string => {
  const value = theme[`--color-${name}`];
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`--color-${name} is not a hex colour: ${value}`);
  }
  return value;
};

describe('contrastRatio', () => {
  it('matches WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 2);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 2);
  });

  it('matches the ADR-018 table', () => {
    expect(contrastRatio('#0A0A0A', '#F5F5F2')).toBeCloseTo(18.13, 2);
    expect(contrastRatio('#E6E6E2', '#0A0A0A')).toBeCloseTo(15.82, 2);
  });
});

describe.each(themes)('%s theme', (_name, theme) => {
  it('text pairs meet 4.5:1', () => {
    const pairs: [string, string][] = [
      ['text', 'bg'],
      ['text', 'surface'],
      ['text', 'hover'],
      ['text-muted', 'bg'],
      ['text-muted', 'surface'],
      ['text-muted', 'hover'],
      ['accent', 'bg'],
      ['on-accent', 'accent'],
      ['on-accent', 'accent-pressed'],
      ['on-selected', 'selected'],
    ];
    for (const [fg, bg] of pairs) {
      expect(
        contrastRatio(hex(theme, fg), hex(theme, bg)),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('UI pairs meet 3:1', () => {
    const pairs: [string, string][] = [
      ['focus', 'bg'],
      ['focus', 'surface'],
      ['accent', 'bg'],
      ['border', 'bg'],
      ['border', 'surface'],
      ['selected', 'bg'],
      ['selected', 'surface'],
    ];
    for (const [fg, bg] of pairs) {
      expect(
        contrastRatio(hex(theme, fg), hex(theme, bg)),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('theme blocks', () => {
  it('the media-query dark block equals the data-theme dark block', () => {
    const media = declarations(mediaDarkBlock);
    expect(Object.keys(media).length).toBeGreaterThan(10);
    expect(media).toEqual(dark);
  });

  it('dark overrides exactly the colour tokens defined in light', () => {
    const lightColours = Object.keys(light)
      .filter((k) => k.startsWith('--color-'))
      .sort();
    expect(Object.keys(dark).sort()).toEqual(lightColours);
  });
});

describe('semantic tokens', () => {
  it('defines the full set components may use', () => {
    const names = [
      ...[
        'bg',
        'surface',
        'hover',
        'text',
        'text-muted',
        'border',
        'rule',
        'accent',
        'accent-pressed',
        'on-accent',
        'focus',
        'selected',
        'on-selected',
      ].map((n) => `--color-${n}`),
      '--font-display',
      '--font-text',
      ...[-1, 0, 1, 2, 3, 4, 5].map((n) => `--step-${n === -1 ? '-1' : n}`),
      ...Array.from({ length: 10 }, (_, i) => `--space-${i + 1}`),
      '--radius-s',
      '--radius-m',
      '--radius-pill',
      '--motion-quick',
      '--motion-calm',
      '--motion-slow',
      '--ease-standard',
      '--target-min',
    ];
    for (const name of names) expect(light, name).toHaveProperty([name]);
  });

  it('uses the ADR-018 fonts with fallbacks', () => {
    expect(light['--font-display']).toMatch(/^'Newsreader Variable',.*serif$/);
    expect(light['--font-text']).toMatch(/^'Atkinson Hyperlegible Next Variable',.*sans-serif$/);
  });

  it('uses the ADR-018 shape, motion and spacing values', () => {
    expect(light['--radius-s']).toBe('6px');
    expect(light['--radius-m']).toBe('10px');
    expect(light['--radius-pill']).toBe('999px');
    expect(light['--motion-quick']).toBe('120ms');
    expect(light['--motion-calm']).toBe('240ms');
    expect(light['--motion-slow']).toBe('480ms');
    expect(light['--ease-standard']).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
    expect(light['--target-min']).toBe('48px');
    for (let i = 1; i <= 10; i++) {
      expect(light[`--space-${i}`]).toBe(`${i * 4}px`);
    }
  });
});

describe('fluid type scale', () => {
  /** Evaluates `clamp(<min>px, <a>px + <b>vw, <max>px)` at a viewport width. */
  function evalStep(value: string, viewport: number): number {
    const m = value.match(
      /^clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)px\s*\+\s*([\d.]+)vw\s*,\s*([\d.]+)px\s*\)$/,
    );
    if (!m) throw new Error(`not a fluid clamp(): ${value}`);
    const [min, a, b, max] = m.slice(1).map(Number) as [number, number, number, number];
    return Math.min(max, Math.max(min, a + (b * viewport) / 100));
  }

  // [step, phone px, desktop px] from ADR-018; step 4 is derived (ratio 4/3).
  const listed: [number, number, number][] = [
    [-1, 12.8, 13.5],
    [0, 17, 18],
    [1, 22.7, 24],
    [2, 30.2, 32],
    [3, 40.3, 42.6],
    [5, 71.6, 75.8],
  ];

  it.each(listed)('step %i matches ADR-018 at 375px and 1280px', (n, phone, desktop) => {
    const value = light[`--step-${n}`]!;
    expect(Math.abs(evalStep(value, 375) - phone)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(evalStep(value, 1280) - desktop)).toBeLessThanOrEqual(0.1);
  });

  it('step 4 follows the 4/3 ratio', () => {
    const step3 = evalStep(light['--step-3']!, 375);
    expect(evalStep(light['--step-4']!, 375)).toBeCloseTo((step3 * 4) / 3, 1);
  });

  it('is fluid between the two widths', () => {
    const mid = evalStep(light['--step-0']!, 827.5);
    expect(mid).toBeGreaterThan(17.4);
    expect(mid).toBeLessThan(17.6);
  });
});

describe('global.css', () => {
  it('imports the tokens', () => {
    expect(globalCss).toMatch(/@import\s+['"]\.\/tokens\.css['"]/);
  });

  it('reduced motion zeroes transforms', () => {
    const block = blockAfter(globalCss, '@media (prefers-reduced-motion: reduce)');
    const vars = declarations(block);
    expect(vars['--motion-calm']).toBe('0ms');
    expect(vars['--motion-slow']).toBe('0ms');
    expect(block).toMatch(/transform:\s*none\s*!important/);
  });

  it('keeps body text at least 17px and numerals tabular', () => {
    expect(blockAfter(globalCss, 'body')).toMatch(/font-size:\s*var\(--step-0\)/);
    expect(blockAfter(globalCss, '.numeric')).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it('draws the focus ring per ADR-018', () => {
    const block = blockAfter(globalCss, ':focus-visible');
    expect(block).toMatch(/outline:\s*2px solid var\(--color-focus\)/);
    expect(block).toMatch(/outline-offset:\s*3px/);
  });
});
