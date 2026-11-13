import { describe, expect, it } from 'vitest';
import {
  BASIS_SOURCES,
  DEFAULT_FEELINGS,
  DEFAULT_OBSTACLES,
  DEFAULT_RESPONSES,
  DEFAULT_PARTS,
  GENERIC_RESPONSE_ID,
} from '../domain/defaults';
import { EXPORT_MESSAGES } from '../domain/exportFormat';
import readme from '../../README.md?raw';
import { brain } from './brain';
import { BANNED_WORDS, checkCopy, wordCount } from './rules';

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value !== null && typeof value === 'object')
    for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

describe('copy rules', () => {
  it('checkCopy flags banned words and exclamation marks', () => {
    expect(checkCopy('Your streak is broken!')).toHaveLength(3);
    expect(checkCopy('Permission granted')).toEqual([]);
  });

  it('matches banned words case-insensitively and phrases as phrases', () => {
    expect(checkCopy('You MUST go')).toHaveLength(1);
    expect(checkCopy('You should have gone')).toHaveLength(1);
    expect(checkCopy('You should go, you have time')).toEqual([]);
  });

  it('counts words', () => {
    expect(wordCount('  one two\nthree ')).toBe(3);
    expect(wordCount('')).toBe(0);
  });

  it('lists the banned words', () => {
    expect(BANNED_WORDS).toContain('streak');
    expect(BANNED_WORDS).toContain('should have');
  });

  it('default content passes copy rules', () => {
    for (const f of DEFAULT_FEELINGS) expect(checkCopy(f.label)).toEqual([]);
    for (const r of DEFAULT_RESPONSES) {
      expect(checkCopy(r.body)).toEqual([]);
      expect(wordCount(r.body)).toBeLessThanOrEqual(40);
    }
    for (const t of DEFAULT_PARTS) expect(checkCopy(t.label)).toEqual([]);
    for (const o of DEFAULT_OBSTACLES) expect(checkCopy(o.label)).toEqual([]);
    for (const s of Object.values(BASIS_SOURCES)) expect(checkCopy(s)).toEqual([]);
  });

  it('bans the neuroscience words', () => {
    expect(checkCopy('Rewired by firing')).toHaveLength(2);
    expect(BANNED_WORDS).toHaveLength(28);
  });

  it('export messages pass copy rules', () => {
    for (const m of Object.values(EXPORT_MESSAGES)) expect(checkCopy(m)).toEqual([]);
  });

  it('all copy modules pass copy rules', () => {
    const modules = import.meta.glob('./*.ts', { eager: true });
    for (const [path, mod] of Object.entries(modules)) {
      if (path.endsWith('/rules.ts') || path.endsWith('.test.ts')) continue;
      for (const s of collectStrings(mod)) expect(checkCopy(s), `${path}: ${s}`).toEqual([]);
    }
  });

  it('Brain space copy reads as the spec says and passes copy rules', () => {
    expect(brain.regionLabel).toBe('Brain space');
    expect(brain.empty).toBe('Your starts will light up here.');
    expect(brain.summary(6, 5)).toBe('6 starts · 5 lines');
    expect(brain.summary(1, 1)).toBe('1 start · 1 line');
    expect(brain.starts(1)).toBe('1 start');
    expect(brain.starts(0)).toBe('0 starts');
    expect(brain.onCue(1)).toBe('1 start on cue');
    expect(brain.onCue(18)).toBe('18 starts on cue');
    expect(brain.startLines(1)).toBe('1 start line');
    expect(brain.startLines(9)).toBe('9 start lines');
    expect(brain.partLine('Work', 3, [], 3)).toBe('Work: 3 starts. 3 start lines.');
    expect(brain.partLine('No part', 1, [], null)).toBe('No part: 1 start.');
    expect(
      brain.partLine('Portfolio', 30, ['Steady, 18 starts on cue', 'New, 3 starts on cue'], 9),
    ).toBe(
      'Portfolio: 30 starts. Plan lines: Steady, 18 starts on cue; New, 3 starts on cue. 9 start lines.',
    );
    expect(brain.partLine('Home', 1, ['New, 1 start on cue'], 1)).toBe(
      'Home: 1 start. Plan lines: New, 1 start on cue. 1 start line.',
    );
    expect(brain.strength).toEqual({
      waiting: 'Waiting',
      1: 'New',
      2: 'Repeated',
      3: 'Steady',
      4: 'Well-worn',
    });
    const samples = [0, 1, 2, 40];
    const strings = [
      brain.regionLabel,
      brain.empty,
      brain.noPart,
      brain.moving,
      brain.resting,
      ...Object.values(brain.controls),
      ...Object.values(brain.strength),
      brain.partLine('Work', 2, ['Waiting, 0 starts on cue'], 1),
      ...samples.flatMap((n) => [
        brain.starts(n),
        brain.onCue(n),
        brain.startLines(n),
        ...samples.map((m) => brain.summary(n, m)),
      ]),
    ];
    for (const s of strings) expect(checkCopy(s), s).toEqual([]);
  });

  it('the string collector finds a planted banned string', () => {
    const planted = { a: ['Fine text', { b: 'Nothing wasted here' }], c: 3, d: null };
    const flagged = collectStrings(planted).filter((s) => checkCopy(s).length > 0);
    expect(flagged).toEqual(['Nothing wasted here']);
  });

  it("ships the spec's defaults", () => {
    expect(DEFAULT_FEELINGS).toHaveLength(6);
    expect(DEFAULT_RESPONSES).toHaveLength(16);
    for (const f of DEFAULT_FEELINGS.filter((x) => x.id !== 'other')) {
      expect(DEFAULT_RESPONSES.filter((r) => r.feelingId === f.id)).toHaveLength(3);
    }
    expect(DEFAULT_RESPONSES.some((r) => r.id === GENERIC_RESPONSE_ID)).toBe(true);
    expect(DEFAULT_FEELINGS.at(-1)).toMatchObject({
      id: 'other',
      label: 'Something else',
      order: 99,
    });
    expect(DEFAULT_PARTS.map((t) => t.label)).toEqual(['Work', 'Study', 'Health', 'Home', 'Money']);
    expect(DEFAULT_OBSTACLES.map((o) => o.label)).toEqual([
      "Timing didn't fit",
      'Low energy',
      'First step felt too big',
      'Something came up',
      'Forgot',
    ]);
    expect(BASIS_SOURCES['reframe']).toBe(
      'Rozental et al. 2018 (cognitive techniques used in CBT)',
    );
  });
});

describe('README', () => {
  it('README prose passes copy rules', () => {
    const prose = readme
      .replace(/```[\s\S]*?```/g, '')
      .split('\n')
      .filter((line) => !line.includes('http') && !line.includes('doi:'))
      .join('\n');
    expect(checkCopy(prose)).toEqual([]);
  });
});
