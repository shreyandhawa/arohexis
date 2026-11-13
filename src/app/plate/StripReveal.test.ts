import { describe, expect, it } from 'vitest';
import { revealLineId } from './StripReveal';

const space = { lines: [{ id: 'a1' }, { id: 'p1:core' }] } as never;

describe('revealLineId', () => {
  it('prefers the start line, then the plan line', () => {
    expect(revealLineId(space, 'a1', 'p1', null)).toBe('a1');
    expect(revealLineId(space, 'zz', 'p1', null)).toBe('p1:core');
  });
  it('is undefined when neither line exists', () => {
    expect(revealLineId(space, 'zz', 'p9', 'x')).toBeUndefined();
  });
});
