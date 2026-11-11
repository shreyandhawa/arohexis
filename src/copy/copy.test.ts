import { describe, expect, it } from 'vitest';
import {
  BASIS_SOURCES,
  DEFAULT_FEELINGS,
  DEFAULT_OBSTACLES,
  DEFAULT_RESPONSES,
  DEFAULT_TASK_TYPES,
  GENERIC_RESPONSE_ID,
} from '../domain/defaults';
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
    for (const t of DEFAULT_TASK_TYPES) expect(checkCopy(t.label)).toEqual([]);
    for (const o of DEFAULT_OBSTACLES) expect(checkCopy(o.label)).toEqual([]);
    for (const s of Object.values(BASIS_SOURCES)) expect(checkCopy(s)).toEqual([]);
  });

  it('all copy modules pass copy rules', () => {
    const modules = import.meta.glob('./*.ts', { eager: true });
    for (const [path, mod] of Object.entries(modules)) {
      if (path.endsWith('/rules.ts') || path.endsWith('.test.ts')) continue;
      for (const s of collectStrings(mod)) expect(checkCopy(s), `${path}: ${s}`).toEqual([]);
    }
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
    expect(DEFAULT_TASK_TYPES.map((t) => t.label)).toEqual([
      'Writing',
      'Study',
      'Admin & email',
      'Chores',
      'Creative',
      'Other',
    ]);
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
