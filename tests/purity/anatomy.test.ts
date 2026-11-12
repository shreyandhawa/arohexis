import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANATOMY_WORDS } from './anatomy';

const ROOT = join(import.meta.dirname, '..', '..');
// The banned lists themselves. `src/copy/rules.ts` shares four words with the anatomy list.
const SKIPPED = new Set([
  'tests/purity/anatomy.ts',
  'tests/purity/anatomy.test.ts',
  'src/copy/rules.ts',
]);
const TEXT_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|css|html|json|md|svg|webmanifest)$/;

const MATCHER = new RegExp(`\\b(?:${ANATOMY_WORDS.join('|')})\\b`, 'i');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules') return [];
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe('anatomy words', () => {
  it('lists the 32 words of spec §16.5', () => {
    expect(ANATOMY_WORDS).toHaveLength(32);
    expect(new Set(ANATOMY_WORDS).size).toBe(32);
  });

  it('are absent from src and tests', () => {
    const hits: string[] = [];
    for (const top of ['src', 'tests']) {
      for (const file of filesUnder(join(ROOT, top))) {
        const rel = relative(ROOT, file).split(sep).join('/');
        if (SKIPPED.has(rel) || !TEXT_FILE.test(rel)) continue;
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            const m = MATCHER.exec(line);
            if (m) hits.push(`${rel}:${i + 1} "${m[0]}"`);
          });
      }
    }
    expect(hits).toEqual([]);
  });

  it('the matcher finds a planted word, whole-word and case-insensitively', () => {
    const word = ANATOMY_WORDS[0] as string;
    expect(MATCHER.test(`A sample about the ${word.toUpperCase()}.`)).toBe(true);
    expect(MATCHER.test(`${word}s`)).toBe(false);
    expect(MATCHER.test('extract')).toBe(false);
  });
});
