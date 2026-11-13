import { describe, expect, it } from 'vitest';
import type { BrainLine, BrainSpace, PartLight, Strength } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { describeParts, shownParts } from './describe';

function part(id: string, label: string, order: number, enabled = true): Part {
  return {
    id,
    label,
    order,
    enabled,
    colour: (order <= 6 ? order : 6) as Part['colour'],
    region: 1,
  };
}

function planLine(
  partId: string | null,
  strength: Strength,
  onCueStarts: number,
  hidden = false,
): BrainLine {
  return {
    kind: 'plan',
    id: `p-${partId ?? 'core'}-${strength}-${onCueStarts}`,
    planId: `plan-${strength}`,
    partId,
    onCueStarts,
    strength,
    order: onCueStarts,
    everStarted: onCueStarts > 0,
    hidden,
  };
}

function light(partId: string | null, starts: number, planLines = 0, startLines = 0): PartLight {
  return { partId, starts, planLines, startLines };
}

function space(parts: PartLight[], lines: BrainLine[] = []): BrainSpace {
  return { lines, parts, motion: 'moving', totalStarts: 0 };
}

describe('describeParts', () => {
  it('reads a part with plan lines and start lines as the spec shows', () => {
    const s = space(
      [light('portfolio', 30, 2, 9)],
      [planLine('portfolio', 3, 18), planLine('portfolio', 1, 3)],
    );
    const [entry] = describeParts(s, [part('portfolio', 'Portfolio', 1)]);
    expect(entry?.text).toBe(
      'Portfolio: 30 starts. Plan lines: Steady, 18 starts on cue; New, 3 starts on cue. 9 start lines.',
    );
  });

  it('uses the singular for one start, one start on cue and one start line', () => {
    const s = space([light('work', 1, 1, 1)], [planLine('work', 1, 1)]);
    const [entry] = describeParts(s, [part('work', 'Work', 1)]);
    expect(entry?.text).toBe('Work: 1 start. Plan lines: New, 1 start on cue. 1 start line.');
  });

  it('leaves out the plan clause and the start-line clause when they are empty', () => {
    const [entry] = describeParts(space([light('work', 3, 0, 0)]), [part('work', 'Work', 1)]);
    expect(entry?.text).toBe('Work: 3 starts.');
  });

  it('lists a waiting plan line', () => {
    const s = space([light('work', 0, 1, 0)], [planLine('work', 'waiting', 0)]);
    const [entry] = describeParts(s, [part('work', 'Work', 1)]);
    expect(entry?.text).toBe('Work: 0 starts. Plan lines: Waiting, 0 starts on cue.');
  });

  it('never lists a hidden plan line', () => {
    const s = space([light('work', 2, 0, 2)], [planLine('work', 'waiting', 0, true)]);
    const [entry] = describeParts(s, [part('work', 'Work', 1)]);
    expect(entry?.text).toBe('Work: 2 starts. 2 start lines.');
  });

  it('puts the core last as No part, without a start-lines clause', () => {
    const s = space([light('work', 1, 0, 1), light(null, 1, 0, 0)]);
    const entries = describeParts(s, [part('work', 'Work', 1)]);
    expect(entries.map((e) => e.text)).toEqual([
      'Work: 1 start. 1 start line.',
      'No part: 1 start.',
    ]);
    expect(entries[1]?.partId).toBeNull();
  });

  it('lists plan lines that have no part', () => {
    const s = space([light(null, 2, 1, 0)], [planLine(null, 2, 5)]);
    const entries = describeParts(s, []);
    expect(entries.map((e) => e.text)).toEqual([
      'No part: 2 starts. Plan lines: Repeated, 5 starts on cue.',
    ]);
  });

  it('lists No part for a plan line even with no core starts', () => {
    const s = space([], [planLine(null, 'waiting', 0)]);
    expect(describeParts(s, []).map((e) => e.text)).toEqual([
      'No part: 0 starts. Plan lines: Waiting, 0 starts on cue.',
    ]);
  });

  it('lists parts by order, not by array position', () => {
    const parts = [part('b', 'Beta', 2), part('a', 'Alpha', 1)];
    const s = space([light('b', 1), light('a', 1)]);
    expect(describeParts(s, parts).map((e) => e.label)).toEqual(['Alpha', 'Beta']);
  });
});

describe('shownParts', () => {
  const parts = [
    part('on', 'On', 1),
    part('off-lit', 'Off lit', 2, false),
    part('off-dark', 'Off dark', 3, false),
    part('off-line', 'Off line', 4, false),
    part('off-wait', 'Off wait', 5, false),
  ];
  const s = space(
    [
      light('on', 0),
      light('off-lit', 2),
      light('off-dark', 0),
      light('off-line', 0),
      light('off-wait', 0),
    ],
    [planLine('off-line', 1, 1), planLine('off-wait', 'waiting', 0)],
  );

  it('shows parts that are enabled or have light', () => {
    expect(shownParts(s, parts).map((p) => p.id)).toEqual(['on', 'off-lit', 'off-line']);
  });

  it('a waiting line alone is not light, and a hidden line is not shown', () => {
    const hidden = space([light('off-wait', 0)], [planLine('off-wait', 1, 3, true)]);
    expect(shownParts(hidden, parts).map((p) => p.id)).toEqual(['on']);
  });
});
