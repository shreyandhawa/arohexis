import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { ColourId, ListItem, Part } from './config';
import { DEFAULT_PARTS } from './defaults';
import {
  MAX_PARTS,
  PART_LABEL_MAX,
  addPart,
  editPart,
  migrateTaskTypes,
  validateParts,
} from './parts';

const M1_TASK_TYPES: ListItem[] = [
  { id: 'writing', label: 'Writing', order: 1, enabled: true },
  { id: 'study', label: 'Study', order: 2, enabled: true },
  { id: 'admin', label: 'Admin & email', order: 3, enabled: true },
  { id: 'chores', label: 'Chores', order: 4, enabled: true },
  { id: 'creative', label: 'Creative', order: 5, enabled: true },
  { id: 'other-task', label: 'Other', order: 6, enabled: true },
];

function upsert(parts: readonly Part[], changed: readonly Part[]): Part[] {
  const byId = new Map(parts.map((p) => [p.id, p]));
  for (const p of changed) byId.set(p.id, p);
  return [...byId.values()];
}

function assertParts(r: Part[] | 'limit' | 'label'): Part[] {
  if (typeof r === 'string') throw new Error(`expected parts, got ${r}`);
  return r;
}

describe('migrateTaskTypes', () => {
  it("maps M1's defaults", () => {
    const parts = migrateTaskTypes(M1_TASK_TYPES);
    expect(parts).toEqual([
      { id: 'writing', label: 'Writing', order: 1, enabled: true, colour: 1, region: 1 },
      { id: 'study', label: 'Study', order: 2, enabled: true, colour: 2, region: 2 },
      { id: 'admin', label: 'Admin & email', order: 3, enabled: true, colour: 3, region: 3 },
      { id: 'chores', label: 'Chores', order: 4, enabled: true, colour: 4, region: 4 },
      { id: 'creative', label: 'Creative', order: 5, enabled: true, colour: 5, region: 5 },
    ]);
    expect(parts.some((p) => p.id === 'other-task')).toBe(false);
  });

  it('skips disabled types and keeps the first six by order', () => {
    const many: ListItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: `t${8 - i}`,
      label: `T${8 - i}`,
      order: 8 - i,
      enabled: true,
    }));
    const parts = migrateTaskTypes(many);
    expect(parts.map((p) => p.id)).toEqual(['t1', 't2', 't3', 't4', 't5', 't6']);
    const withDisabled = migrateTaskTypes([
      { id: 'a', label: 'A', order: 1, enabled: false },
      { id: 'b', label: 'B', order: 2, enabled: true },
    ]);
    expect(withDisabled).toEqual([
      { id: 'b', label: 'B', order: 1, enabled: true, colour: 1, region: 1 },
    ]);
  });
});

describe('addPart', () => {
  it('takes the lowest free region and colour', () => {
    const r = assertParts(addPart(DEFAULT_PARTS, { id: 'portfolio', label: 'Portfolio' }));
    expect(r).toEqual([
      { id: 'portfolio', label: 'Portfolio', order: 6, enabled: true, colour: 6, region: 6 },
    ]);
  });

  it('fills a gap and trims the label', () => {
    const gap = DEFAULT_PARTS.filter((p) => p.region !== 2);
    const r = assertParts(addPart(gap, { id: 'x', label: '  Art  ' }));
    expect(r[0]).toMatchObject({ label: 'Art', region: 2, colour: 2, order: 6 });
    expect(assertParts(addPart([], { id: 'first', label: 'First' }))[0]).toMatchObject({
      order: 1,
      region: 1,
      colour: 1,
    });
  });

  it('refuses a seventh part', () => {
    const six = [...DEFAULT_PARTS, ...assertParts(addPart(DEFAULT_PARTS, { id: 'p', label: 'P' }))];
    expect(six).toHaveLength(MAX_PARTS);
    expect(addPart(six, { id: 'q', label: 'Q' })).toBe('limit');
  });

  it('refuses an empty or 25-character label', () => {
    expect(addPart(DEFAULT_PARTS, { id: 'x', label: '   ' })).toBe('label');
    expect(addPart(DEFAULT_PARTS, { id: 'x', label: 'a'.repeat(PART_LABEL_MAX + 1) })).toBe(
      'label',
    );
    expect(addPart(DEFAULT_PARTS, { id: 'x', label: 'a'.repeat(PART_LABEL_MAX) })).not.toBe(
      'label',
    );
  });
});

describe('editPart', () => {
  it('swaps a colour held by another part', () => {
    const r = assertParts(editPart(DEFAULT_PARTS, 'work', { colour: 2 }));
    expect(r.find((p) => p.id === 'work')?.colour).toBe(2);
    expect(r.find((p) => p.id === 'study')?.colour).toBe(1);
    expect(r).toHaveLength(2);
  });

  it('renames, disables and keeps the region', () => {
    const r = assertParts(editPart(DEFAULT_PARTS, 'study', { label: ' Uni ', enabled: false }));
    expect(r).toEqual([{ ...DEFAULT_PARTS[1], label: 'Uni', enabled: false }]);
    const same = assertParts(editPart(DEFAULT_PARTS, 'work', { colour: 1 }));
    expect(same).toEqual([DEFAULT_PARTS[0]]);
  });

  it('never changes a region', () => {
    for (const p of DEFAULT_PARTS) {
      const r = assertParts(
        editPart(DEFAULT_PARTS, p.id, { colour: 6, label: 'Z', enabled: false }),
      );
      for (const c of r) expect(c.region).toBe(DEFAULT_PARTS.find((d) => d.id === c.id)?.region);
    }
  });

  it('refuses a bad label and ignores an unknown id', () => {
    expect(editPart(DEFAULT_PARTS, 'work', { label: '' })).toBe('label');
    expect(editPart(DEFAULT_PARTS, 'work', { label: 'b'.repeat(25) })).toBe('label');
    expect(editPart(DEFAULT_PARTS, 'nope', { label: 'X' })).toEqual([]);
  });
});

describe('validateParts', () => {
  it('returns [] for the defaults', () => {
    expect(validateParts(DEFAULT_PARTS)).toEqual([]);
  });

  it('flags a duplicate colour, a duplicate region, a seventh part and a bad label', () => {
    const [a, b, ...rest] = DEFAULT_PARTS as [Part, Part, ...Part[]];
    expect(validateParts([a, { ...b, colour: a.colour }, ...rest])).toHaveLength(1);
    expect(validateParts([a, { ...b, region: a.region }, ...rest])).toHaveLength(1);
    const seven: Part[] = Array.from({ length: 7 }, (_, i) => ({
      id: `p${i}`,
      label: 'P',
      order: i,
      enabled: true,
      colour: ((i % 6) + 1) as ColourId,
      region: ((i % 6) + 1) as ColourId,
    }));
    expect(validateParts(seven).length).toBeGreaterThan(0);
    expect(validateParts([{ ...a, label: '' }])).toHaveLength(1);
    expect(validateParts([{ ...a, label: 'x'.repeat(25) }])).toHaveLength(1);
  });

  it('property: edits keep parts valid', () => {
    const arbOp = fc.oneof(
      fc.record({
        kind: fc.constant<'add'>('add'),
        label: fc.string({ maxLength: 30 }),
      }),
      fc.record({
        kind: fc.constant<'edit'>('edit'),
        pick: fc.nat({ max: 5 }),
        label: fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
        colour: fc.option(fc.constantFrom<ColourId>(1, 2, 3, 4, 5, 6), { nil: undefined }),
        enabled: fc.option(fc.boolean(), { nil: undefined }),
      }),
    );
    fc.assert(
      fc.property(fc.array(arbOp, { maxLength: 30 }), (ops) => {
        let parts: Part[] = [];
        let n = 0;
        for (const op of ops) {
          const before = new Map(parts.map((p) => [p.id, p.region]));
          let result: Part[] | 'limit' | 'label';
          if (op.kind === 'add') {
            result = addPart(parts, { id: `id${n++}`, label: op.label });
          } else {
            const target = parts[op.pick % Math.max(parts.length, 1)];
            if (!target) continue;
            result = editPart(parts, target.id, {
              ...(op.label !== undefined && { label: op.label }),
              ...(op.colour !== undefined && { colour: op.colour }),
              ...(op.enabled !== undefined && { enabled: op.enabled }),
            });
          }
          if (typeof result === 'string') continue;
          parts = upsert(parts, result);
          expect(validateParts(parts)).toEqual([]);
          for (const p of parts) {
            if (before.has(p.id)) expect(p.region).toBe(before.get(p.id));
          }
        }
      }),
    );
  });
});
